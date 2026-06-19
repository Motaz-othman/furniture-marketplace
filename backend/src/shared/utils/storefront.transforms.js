/**
 * Storefront Transform Utilities
 *
 * Converts DB Product + StorefrontListing into the shape
 * the storefront frontend expects (matching productTransform.js on the client).
 */

// ─── Helpers ──────────────────────────────────────────────────────────

function cmToInches(cm) {
  if (!cm) return null;
  return Math.round((cm / 2.54) * 10) / 10;
}

function kgToLbs(kg) {
  if (!kg) return null;
  return Math.round((kg * 2.205) * 10) / 10;
}

function buildMeasurements(variant) {
  if (!variant?.dimensions) return null;

  const dims = variant.dimensions;
  const isMetric = dims.unitOfMeasureDistance === 'cm';
  const isKg = dims.unitOfMeasureWeight === 'kg';

  return [{
    name: null,
    dimensions: {
      height: isMetric ? cmToInches(dims.height) : dims.height,
      width: isMetric ? cmToInches(dims.width) : dims.width,
      depth: isMetric ? cmToInches(dims.length) : dims.length,
      unit: 'in',
    },
    weight: isKg ? kgToLbs(dims.weight) : dims.weight,
    weightUnit: 'lbs',
  }];
}

// Build the images array from product media.
// skuToId: { sku → variantId } map, used to resolve variantSkus tags written
// by the UW adapter for multi-color products (preserved through S3 migration).
function buildImages(media, listingImages, skuToId = {}) {
  if (listingImages) return listingImages;

  const images = [];
  let imageId = 1;

  const resolveIds = (img) => {
    if (img.variantProductIds) return img.variantProductIds;
    if (img.variantSkus) return img.variantSkus.map(s => skuToId[s]).filter(Boolean);
    return undefined;
  };

  if (media?.mainImages) {
    for (const img of media.mainImages) {
      images.push({
        id: imageId++,
        imageUrl: img.url,
        displayOrder: images.length + 1,
        variantProductIds: resolveIds(img),
      });
    }
  }

  if (media?.additionalImages) {
    for (const img of media.additionalImages) {
      images.push({
        id: imageId++,
        imageUrl: img.url,
        displayOrder: images.length + 1,
        variantProductIds: resolveIds(img),
      });
    }
  }

  return images;
}

function extractVariantName(variant) {
  const attrs = variant.attributes;
  if (Array.isArray(attrs)) {
    const colorAttr = attrs.find(a => a.attribute === 'color');
    if (colorAttr?.normalizedValues?.[0]?.commonName) {
      return colorAttr.normalizedValues[0].commonName;
    }
  }
  return variant.name || null;
}

function applyPricingRule(basePrice, rule) {
  if (!rule || !basePrice) return basePrice;
  if (rule.type === 'markup') return basePrice * (1 + (rule.percentage || 0) / 100);
  if (rule.type === 'discount') return basePrice * (1 - (rule.percentage || 0) / 100);
  if (rule.type === 'fixed') return rule.price;
  return basePrice;
}

// ─── Main Transform ───────────────────────────────────────────────────

/**
 * Transform a DB Product (with variants and optional StorefrontListing)
 * into the shape the storefront expects.
 *
 * @param {Object} product - Prisma Product with variants, vendor, category, storefront relations
 * @param {Object|null} listing - StorefrontListing override (if provided separately; otherwise reads from product.storefront)
 * @returns {Object} Frontend-ready product
 */
export function transformProductForStorefront(product, listing = null) {
  const sf = listing || product.storefront;
  const mainVariant = product.variants?.[0];

  // Original price resolution (the regular selling price)
  let originalPrice = product.minPrice ?? mainVariant?.price?.retailPrice ?? 0;
  if (sf?.displayPrice != null) {
    originalPrice = sf.displayPrice;
  } else if (sf?.pricingRule) {
    originalPrice = applyPricingRule(originalPrice, sf.pricingRule);
  }

  // Discounted price (sale price) — when set and lower than original, product is on sale
  const discountedPrice = sf?.discountedPrice ?? null;

  // The selling price is the discounted price if set, otherwise the original
  const price = (discountedPrice != null && discountedPrice < originalPrice)
    ? discountedPrice
    : originalPrice;

  // Compare-at price: only show strikethrough when there's an actual discount
  const compareAtPrice = (discountedPrice != null && discountedPrice < originalPrice)
    ? originalPrice
    : null;

  // Build SKU → variant ID map (needed to resolve variantSkus tags on images)
  const skuToId = Object.fromEntries(
    (product.variants || []).map(v => [v.sku, v.externalProductId || v.id])
  );

  // Images
  const images = buildImages(product.media, sf?.displayImages, skuToId);

  // Category: StorefrontListing category overrides Product category
  const category = sf?.category ?? product.category;

  // Transform variants for frontend
  const variants = (product.variants || []).map(v => ({
    id: v.externalProductId || v.id,
    name: extractVariantName(v),
    sku: v.sku,
    variantName: extractVariantName(v),
    productId: v.externalProductId || v.id,
    price: v.price?.retailPrice || 0,
    compareAtPrice: v.price?.listPrice !== v.price?.retailPrice
      ? v.price?.listPrice
      : null,
    stockQuantity: v.stockQuantity ?? 0,
    attributes: v.attributes || [],
    options: v.options || [],
  }));

  // Specifications from first variant options
  const specifications = {};
  if (Array.isArray(mainVariant?.options)) {
    for (const opt of mainVariant.options) {
      specifications[opt.option] = opt.value;
    }
  }

  return {
    id: product.id,
    name: sf?.displayName ?? product.name,
    slug: product.slug,
    description: sf?.displayDescription ?? product.description,
    shortDescription: mainVariant?.description || (product.description || '').substring(0, 100),
    price,
    originalPrice,
    discountedPrice,
    compareAtPrice,
    sku: mainVariant?.sku || null,
    categoryId: category?.id ?? null,
    category: category
      ? { id: category.id, name: category.name, slug: category.slug, parentId: category.parentId ?? null }
      : null,
    stockQuantity: product.totalStock,
    images,
    isNew: sf?.isNewArrival ?? false,
    isOnSale: discountedPrice != null && discountedPrice < originalPrice,
    isFeatured: sf?.isTrending ?? product.isFeatured ?? false,
    isTrending: sf?.isTrending ?? false,
    isNewArrival: sf?.isNewArrival ?? false,
    specifications,
    dimensions: mainVariant?.dimensions
      ? {
        height: mainVariant.dimensions.height,
        width: mainVariant.dimensions.width,
        length: mainVariant.dimensions.length,
        weight: mainVariant.dimensions.weight,
        unit: mainVariant.dimensions.unitOfMeasureDistance,
        weightUnit: mainVariant.dimensions.unitOfMeasureWeight,
      }
      : null,
    measurements: buildMeasurements(mainVariant),
    variants,
    brand: product.brand,
    collection: product.collection,
    provider: product.provider,
    relatedProducts: product.relatedProducts,
    rating: product.rating,
    totalReviews: product.totalReviews,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

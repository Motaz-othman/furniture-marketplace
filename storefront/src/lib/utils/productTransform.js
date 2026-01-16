/**
 * Product Transformation Utilities
 * Converts between API format and frontend display format
 */

/**
 * Transform API product format to frontend format
 * @param {Object} apiProduct - Product in API format
 * @returns {Object} Product in frontend format
 */
export function transformApiProductToFrontend(apiProduct) {
  if (!apiProduct || !apiProduct.variants || apiProduct.variants.length === 0) {
    return null;
  }

  // Get the first variant as the main product data
  const mainVariant = apiProduct.variants[0];

  // Extract images from media
  const images = [];
  let imageId = 1;

  // Add main images
  if (apiProduct.media?.mainImages) {
    apiProduct.media.mainImages.forEach((img) => {
      images.push({
        id: imageId++,
        imageUrl: img.url,
        displayOrder: images.length + 1,
        variantProductIds: img.variantProductIds
      });
    });
  }

  // Add additional images
  if (apiProduct.media?.additionalImages) {
    apiProduct.media.additionalImages.forEach((img) => {
      images.push({
        id: imageId++,
        imageUrl: img.url,
        displayOrder: images.length + 1,
        variantProductIds: img.variantProductIds
      });
    });
  }

  // Transform variants
  const variants = apiProduct.variants.map((variant) => {
    // Get color attribute if exists
    const colorAttr = variant.attributes?.find(attr => attr.attribute === 'color');
    const variantName = colorAttr?.normalizedValues?.[0]?.commonName || variant.name;

    return {
      id: variant.productId,
      name: variantName,
      sku: variant.sku,
      variantName: variantName,
      productId: variant.productId,
      price: variant.price?.retailPrice || 0,
      compareAtPrice: variant.price?.listPrice !== variant.price?.retailPrice
        ? variant.price?.listPrice
        : null,
      attributes: variant.attributes || [],
      options: variant.options || []
    };
  });

  // Calculate if on sale
  const isOnSale = mainVariant.price?.retailPrice < mainVariant.price?.listPrice;

  // Get category info
  const category = apiProduct.categories?.[0];
  const categoryPath = category?.path?.split('/') || [];
  const categorySlug = categoryPath[categoryPath.length - 1] || 'uncategorized';

  // Build the frontend product object
  return {
    id: mainVariant.productId,
    name: apiProduct.name,
    slug: generateSlug(apiProduct.name),
    description: apiProduct.description,
    shortDescription: mainVariant.description || apiProduct.description.substring(0, 100),
    price: mainVariant.price?.retailPrice || 0,
    compareAtPrice: isOnSale ? mainVariant.price?.listPrice : null,
    sku: mainVariant.sku,
    upc: mainVariant.upc,

    // Category info - extract from custom field
    categoryId: mainVariant.custom?.categoryId || null,
    category: {
      name: categorySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      slug: categorySlug,
      path: category?.path
    },

    // Stock/inventory (will be populated from inventory endpoint)
    stockQuantity: 0, // Placeholder

    // Images
    images: images,

    // Flags
    isNew: mainVariant.custom?.isNew || false,
    isOnSale: isOnSale,
    isFeatured: mainVariant.custom?.isFeatured || false,

    // Specifications from options
    specifications: mainVariant.options?.reduce((acc, opt) => {
      acc[opt.option] = opt.value;
      return acc;
    }, {}) || {},

    // Add dimensions if available
    dimensions: mainVariant.dimensions ? {
      height: mainVariant.dimensions.height,
      width: mainVariant.dimensions.width,
      length: mainVariant.dimensions.length,
      weight: mainVariant.dimensions.weight,
      unit: mainVariant.dimensions.unitOfMeasureDistance,
      weightUnit: mainVariant.dimensions.unitOfMeasureWeight
    } : null,

    // Variants
    variants: variants,

    // Brand info
    brand: apiProduct.brand,
    collection: apiProduct.collection,
    provider: apiProduct.provider,

    // Related products
    relatedProducts: apiProduct.relatedProducts,

    // Metadata
    createdAt: mainVariant.createdAt,
    updatedAt: mainVariant.updatedAt || apiProduct.updatedAt
  };
}

/**
 * Transform array of API products to frontend format
 * @param {Array} apiProducts - Array of products in API format
 * @returns {Array} Array of products in frontend format
 */
export function transformApiProductsToFrontend(apiProducts) {
  if (!Array.isArray(apiProducts)) {
    return [];
  }

  return apiProducts
    .map(transformApiProductToFrontend)
    .filter(product => product !== null);
}

/**
 * Transform inventory data and merge with product
 * @param {Object} product - Product in frontend format
 * @param {Object} inventoryData - Inventory data from API
 * @returns {Object} Product with inventory data
 */
export function mergeProductWithInventory(product, inventoryData) {
  if (!inventoryData) {
    return product;
  }

  // Find inventory for this product's SKU
  const inventory = Array.isArray(inventoryData)
    ? inventoryData.find(inv => inv.sku === product.sku)
    : inventoryData;

  if (!inventory) {
    return product;
  }

  return {
    ...product,
    stockQuantity: inventory.availableQuantity || 0,
    inStock: inventory.inStock || false,
    nextAvailableDate: inventory.nextAvailableDate,
    nextAvailableQuantity: inventory.nextAvailableQuantity,
    locations: inventory.locations
  };
}

/**
 * Generate slug from product name
 * @param {string} name - Product name
 * @returns {string} URL-friendly slug
 */
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Get color hex value from variant attributes
 * @param {Object} variant - Product variant
 * @returns {string|null} Hex color value
 */
export function getVariantColor(variant) {
  if (!variant.attributes) return null;

  const colorAttr = variant.attributes.find(attr => attr.attribute === 'color');
  return colorAttr?.normalizedValues?.[0]?.hexValue || null;
}

/**
 * Get main image for a specific variant
 * @param {Object} product - Product object
 * @param {string} variantId - Variant product ID
 * @returns {string|null} Image URL
 */
export function getVariantMainImage(product, variantId) {
  if (!product.images || product.images.length === 0) {
    return null;
  }

  // Find image that includes this variant
  const variantImage = product.images.find(img =>
    img.variantProductIds?.includes(variantId)
  );

  return variantImage?.imageUrl || product.images[0]?.imageUrl || null;
}

/**
 * Format price for display
 * @param {number} price - Price value
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted price
 */
export function formatPrice(price, currency = 'USD') {
  if (typeof price !== 'number') {
    return '$0.00';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(price);
}

/**
 * Calculate discount percentage
 * @param {number} originalPrice - Original price
 * @param {number} salePrice - Sale price
 * @returns {number} Discount percentage
 */
export function calculateDiscountPercentage(originalPrice, salePrice) {
  if (!originalPrice || !salePrice || originalPrice <= salePrice) {
    return 0;
  }

  return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
}

/**
 * Check if product is in stock
 * @param {Object} product - Product object
 * @returns {boolean} True if in stock
 */
export function isProductInStock(product) {
  return product.inStock === true || (product.stockQuantity && product.stockQuantity > 0);
}

/**
 * Get stock status message
 * @param {Object} product - Product object
 * @returns {string} Stock status message
 */
export function getStockStatus(product) {
  if (!product.stockQuantity || product.stockQuantity === 0) {
    if (product.nextAvailableDate) {
      return `Available ${new Date(product.nextAvailableDate).toLocaleDateString()}`;
    }
    return 'Out of Stock';
  }

  if (product.stockQuantity <= 5) {
    return `Only ${product.stockQuantity} left!`;
  }

  return 'In Stock';
}

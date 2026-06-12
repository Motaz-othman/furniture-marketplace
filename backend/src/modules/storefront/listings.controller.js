import prisma from '../../shared/config/db.js';

// ─── Get all storefront listings (admin) ─────────────────────────────

export const getAllListings = async (req, res) => {
  try {
    const { page = 1, limit = 20, isPublished, isOnSale, isTrending, isNewArrival, search, brand, categoryId, minPrice, maxPrice } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const where = {};
    if (isPublished !== undefined) {
      where.isPublished = isPublished === 'true';
    }
    if (isOnSale !== undefined) {
      where.isOnSale = isOnSale === 'true';
    }
    if (isTrending !== undefined) {
      where.isTrending = isTrending === 'true';
    }
    if (isNewArrival !== undefined) {
      where.isNewArrival = isNewArrival === 'true';
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { product: { name: { contains: search, mode: 'insensitive' } } },
        { product: { brand: { contains: search, mode: 'insensitive' } } },
        { product: { variants: { some: { sku: { contains: search, mode: 'insensitive' } } } } },
      ];
    }
    if (brand) {
      where.product = { ...(where.product || {}), brand: { equals: brand, mode: 'insensitive' } };
    }
    if (minPrice || maxPrice) {
      const priceFilter = {};
      if (minPrice) priceFilter.gte = parseFloat(minPrice);
      if (maxPrice) priceFilter.lte = parseFloat(maxPrice);
      where.product = { ...(where.product || {}), minPrice: priceFilter };
    }

    const [listings, total] = await Promise.all([
      prisma.storefrontListing.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              brand: true,
              minPrice: true,
              maxPrice: true,
              mainImage: true,
              totalStock: true,
              isNew: true,
              source: true,
              variants: {
                select: { id: true, sku: true, name: true, price: true, stockQuantity: true },
                orderBy: { rank: 'asc' },
              },
            },
          },
          category: { select: { id: true, name: true, slug: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.storefrontListing.count({ where }),
    ]);

    res.json({
      data: listings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get listings error:', error);
    res.status(500).json({ error: 'Failed to get listings' });
  }
};

// ─── Get single listing ──────────────────────────────────────────────

export const getListingById = async (req, res) => {
  try {
    const { id } = req.params;

    const listing = await prisma.storefrontListing.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            category: true,
            variants: true,
          },
        },
        category: true,
      },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json({ data: listing });
  } catch (error) {
    console.error('Get listing error:', error);
    res.status(500).json({ error: 'Failed to get listing' });
  }
};

// ─── Create listing (add product to storefront) ──────────────────────

export const createListing = async (req, res) => {
  try {
    const {
      productId,
      displayName,
      displayDescription,
      displayImages,
      displayPrice,
      discountedPrice,
      compareAtPrice,
      pricingRule,
      categoryId,
      isPublished,
      isTrending,
      isNewArrival,
      sortOrder,
    } = req.body;

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if listing already exists for this product
    const existing = await prisma.storefrontListing.findUnique({
      where: { productId },
    });

    if (existing) {
      return res.status(400).json({ error: 'Storefront listing already exists for this product' });
    }

    const parsedDiscountedPrice = discountedPrice != null ? parseFloat(discountedPrice) : null;

    const listing = await prisma.storefrontListing.create({
      data: {
        productId,
        displayName: displayName || null,
        displayDescription: displayDescription || null,
        displayImages: displayImages || null,
        displayPrice: displayPrice != null ? parseFloat(displayPrice) : null,
        discountedPrice: parsedDiscountedPrice,
        compareAtPrice: compareAtPrice != null ? parseFloat(compareAtPrice) : null,
        pricingRule: pricingRule || null,
        categoryId: categoryId || null,
        isPublished: isPublished ?? false,
        isOnSale: parsedDiscountedPrice != null,
        isTrending: isTrending ?? false,
        isNewArrival: isNewArrival ?? false,
        sortOrder: sortOrder ?? 0,
      },
      include: {
        product: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ message: 'Listing created successfully', data: listing });
  } catch (error) {
    console.error('Create listing error:', error);
    res.status(500).json({ error: 'Failed to create listing' });
  }
};

// ─── Update listing ──────────────────────────────────────────────────

export const updateListing = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      displayName, displayDescription, displayImages,
      displayPrice, discountedPrice, compareAtPrice,
      pricingRule, variantPrices, variantStocks,
      categoryId, isPublished, isTrending, isNewArrival,
      sortOrder, displayStock,
    } = req.body;

    const updateData = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (displayDescription !== undefined) updateData.displayDescription = displayDescription;
    if (displayImages !== undefined) updateData.displayImages = displayImages;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (isPublished !== undefined) updateData.isPublished = isPublished;
    if (isTrending !== undefined) updateData.isTrending = isTrending;
    if (isNewArrival !== undefined) updateData.isNewArrival = isNewArrival;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (pricingRule !== undefined) updateData.pricingRule = pricingRule;
    if (variantPrices !== undefined) updateData.variantPrices = variantPrices;
    if (variantStocks !== undefined) updateData.variantStocks = variantStocks;

    if (displayPrice !== undefined) {
      updateData.displayPrice = displayPrice != null ? parseFloat(displayPrice) : null;
    }
    if (discountedPrice !== undefined) {
      updateData.discountedPrice = discountedPrice != null ? parseFloat(discountedPrice) : null;
      updateData.isOnSale = updateData.discountedPrice != null;
    }
    if (compareAtPrice !== undefined) {
      updateData.compareAtPrice = compareAtPrice != null ? parseFloat(compareAtPrice) : null;
    }
    if (displayStock !== undefined) {
      updateData.displayStock = displayStock != null ? parseInt(displayStock) : null;
    }

    const listing = await prisma.storefrontListing.update({
      where: { id },
      data: updateData,
      include: {
        product: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true } },
      },
    });

    res.json({ message: 'Listing updated successfully', data: listing });
  } catch (error) {
    console.error('Update listing error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Listing not found' });
    }
    res.status(500).json({ error: 'Failed to update listing' });
  }
};

// ─── Delete listing (remove from storefront) ─────────────────────────

export const deleteListing = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.storefrontListing.delete({ where: { id } });

    res.json({ message: 'Listing removed from storefront' });
  } catch (error) {
    console.error('Delete listing error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Listing not found' });
    }
    res.status(500).json({ error: 'Failed to delete listing' });
  }
};

// ─── Bulk create listings ────────────────────────────────────────────

export const bulkCreateListings = async (req, res) => {
  try {
    const { productIds, isPublished = false, pricingRule } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'productIds array is required' });
    }

    // Filter out products that already have listings
    const existing = await prisma.storefrontListing.findMany({
      where: { productId: { in: productIds } },
      select: { productId: true },
    });
    const existingIds = new Set(existing.map(e => e.productId));
    const newIds = productIds.filter(id => !existingIds.has(id));

    if (newIds.length === 0) {
      return res.json({ message: 'All products already have listings', created: 0 });
    }

    const result = await prisma.storefrontListing.createMany({
      data: newIds.map(productId => ({
        productId,
        isPublished,
        pricingRule: pricingRule || null,
      })),
    });

    res.status(201).json({
      message: `${result.count} listings created`,
      created: result.count,
      skipped: existingIds.size,
    });
  } catch (error) {
    console.error('Bulk create listings error:', error);
    res.status(500).json({ error: 'Failed to create listings' });
  }
};

// ─── Get single raw product (admin detail view) ─────────────────────

export const getRawProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        variants: true,
        storefront: { select: { id: true, isPublished: true } },
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      data: {
        ...product,
        hasListing: !!product.storefront,
        isOnStorefront: product.storefront?.isPublished ?? false,
      },
    });
  } catch (error) {
    console.error('Get raw product error:', error);
    res.status(500).json({ error: 'Failed to get product' });
  }
};

// ─── Get raw Wondersign products (for admin browsing) ────────────────

export const getRawProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, brand, categoryId, collection, minPrice, maxPrice } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { collection: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { externalId: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { variants: { some: { sku: { contains: search, mode: 'insensitive' } } } },
        { variants: { some: { name: { contains: search, mode: 'insensitive' } } } },
        { variants: { some: { customerSku: { contains: search, mode: 'insensitive' } } } },
        { variants: { some: { upc: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    // Status filter: published, draft, unlisted
    if (status === 'published') {
      where.storefront = { isPublished: true };
    } else if (status === 'draft') {
      where.storefront = { isPublished: false };
    } else if (status === 'unlisted') {
      where.storefront = null;
    }

    // Brand filter
    if (brand) {
      where.brand = { equals: brand, mode: 'insensitive' };
    }

    // Category filter
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Collection filter
    if (collection) {
      where.collection = { equals: collection, mode: 'insensitive' };
    }

    // Price range filter (uses product minPrice)
    if (minPrice || maxPrice) {
      where.minPrice = {};
      if (minPrice) where.minPrice.gte = parseFloat(minPrice);
      if (maxPrice) where.minPrice.lte = parseFloat(maxPrice);
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          brand: true,
          collection: true,
          minPrice: true,
          maxPrice: true,
          compareAtPrice: true,
          mainImage: true,
          totalStock: true,
          isFeatured: true,
          isNew: true,
          isOnSale: true,
          source: true,
          externalId: true,
          category: { select: { id: true, name: true, slug: true } },
          variants: { select: { sku: true, name: true, price: true }, orderBy: { rank: 'asc' } },
          _count: { select: { variants: true } },
          storefront: { select: { id: true, isPublished: true } },
        },
        orderBy: { name: 'asc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.product.count({ where }),
    ]);

    // Add a flag to indicate if product already has a storefront listing
    const enriched = products.map(p => ({
      ...p,
      hasListing: !!p.storefront,
      isOnStorefront: p.storefront?.isPublished ?? false,
    }));

    res.json({
      data: enriched,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get raw products error:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
};

// ─── Get filter options for raw products ────────────────

export const getRawProductFilters = async (req, res) => {
  try {
    const [brands, collections] = await Promise.all([
      prisma.product.findMany({ where: { brand: { not: null } }, select: { brand: true }, distinct: ['brand'], orderBy: { brand: 'asc' } }),
      prisma.product.findMany({ where: { collection: { not: null } }, select: { collection: true }, distinct: ['collection'], orderBy: { collection: 'asc' } }),
    ]);

    res.json({
      data: {
        brands: brands.map(b => b.brand).filter(Boolean),
        collections: collections.map(c => c.collection).filter(Boolean),
      },
    });
  } catch (error) {
    console.error('Get raw product filters error:', error);
    res.status(500).json({ error: 'Failed to get filters' });
  }
};

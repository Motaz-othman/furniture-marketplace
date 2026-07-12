import prisma from '../../shared/config/db.js';
import { transformProductForStorefront, transformProductForListing } from '../../shared/utils/storefront.transforms.js';
import { findMatchingProductIds } from '../../shared/utils/fuzzySearch.js';

// ─── In-memory listing cache ─────────────────────────────────────────
// Absorbs the repeated round-trips to the remote DB (5-6 Prisma queries
// per request, each adding ~200ms network latency to Supabase us-west-2).
// TTL = 60s; stale entries are pruned lazily on each write.

const listingCache = new Map();
const CACHE_TTL = 5 * 60_000; // 5 minutes

function cacheGet(key) {
  const entry = listingCache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

function cacheSet(key, data) {
  listingCache.set(key, { data, ts: Date.now() });
  // Lazy eviction — prune anything older than 2× TTL
  for (const [k, v] of listingCache) {
    if (Date.now() - v.ts > CACHE_TTL * 2) listingCache.delete(k);
  }
}

export function invalidateListingCache() {
  listingCache.clear();
}

// ─── Shared includes for storefront queries ─────────────────────────

const storefrontProductInclude = {
  category: { select: { id: true, name: true, slug: true, parentId: true } },
  variants: true,
  storefront: {
    include: {
      category: { select: { id: true, name: true, slug: true, parentId: true } },
    },
  },
};

// Lean include for listing/grid — only fields ProductCard actually renders.
// Omits heavy per-variant JSON (packaging, dimensions, custom, upc, status, etc.)
// to cut ~70-100 KB off a 20-product page response.
const storefrontListingInclude = {
  product: {
    include: {
      category: { select: { id: true, name: true, slug: true, parentId: true } },
      variants: {
        select: {
          id: true,
          sku: true,
          externalProductId: true,
          name: true,
          price: true,
          stockQuantity: true,
          attributes: true,
          options: true,
        },
        orderBy: { rank: 'asc' },
      },
    },
  },
  category: { select: { id: true, name: true, slug: true, parentId: true } },
};

// ─── Public: Get all storefront products ─────────────────────────────

export const getAllProducts = async (req, res) => {
  try {
    // Serve from cache if available — the remote Supabase DB adds ~200ms per
    // round-trip; each Prisma request fires 5-6 queries, so caching is critical.
    const cacheKey = JSON.stringify(req.query);
    const cached = cacheGet(cacheKey);
    if (cached) {
      res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
      return res.json(cached);
    }

    const {
      categoryId,
      categoryIds,   // comma-separated list — for parent+children category trees
      inStock,
      featured,
      new: isNew,
      sale,
      search,
      sortBy,
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    const where = { isPublished: true };
    if (categoryIds) {
      const ids = categoryIds.split(',').filter(Boolean);
      where.OR = [
        { categoryId: { in: ids } },
        { categoryId: null, product: { categoryId: { in: ids } } },
      ];
    } else if (categoryId) {
      where.OR = [
        { categoryId },
        { categoryId: null, product: { categoryId } },
      ];
    }
    if (featured === 'true') where.isTrending = true;
    if (isNew === 'true') where.isNewArrival = true;
    if (sale === 'true') where.discountedPrice = { not: null };
    if (inStock === 'true') where.product = { ...where.product, totalStock: { gt: 0 } };

    let listings, total;

    if (search && search.trim()) {
      // Relevance-ranked product ids from the fuzzy search (1 round trip),
      // then a single fetch of just those products' full data, filtered by
      // the same isPublished/featured/isNew/sale/category conditions as the
      // non-search path. Sort + paginate in JS — the matched set is small.
      const matchedIds = await findMatchingProductIds(prisma, search.trim());

      const matchedListings = await prisma.storefrontListing.findMany({
        where: { ...where, productId: { in: matchedIds } },
        include: storefrontListingInclude,
      });

      const rank = new Map(matchedIds.map((id, i) => [id, i]));
      matchedListings.sort((a, b) => rank.get(a.productId) - rank.get(b.productId));

      total = matchedListings.length;
      listings = matchedListings.slice(skip, skip + limitNum);
    } else {
      const orderBy = sortBy === 'price-asc' ? [{ product: { minPrice: 'asc' } }, { id: 'asc' }]
        : sortBy === 'price-desc' ? [{ product: { minPrice: 'desc' } }, { id: 'asc' }]
        : sortBy === 'name' ? [{ product: { name: 'asc' } }, { id: 'asc' }]
        // 'newest' = most recently added to the storefront.
        // Uses StorefrontListing.id DESC (same-table, unique) — avoids a cross-table
        // join on product.createdAt which is non-unique for batch-imported products
        // and causes non-deterministic OFFSET pagination (duplicate/missing rows).
        : sortBy === 'newest' ? [{ id: 'desc' }]
        : [{ sortOrder: 'asc' }, { id: 'asc' }];

      [total, listings] = await Promise.all([
        prisma.storefrontListing.count({ where }),
        prisma.storefrontListing.findMany({
          where,
          orderBy,
          skip,
          take: limitNum,
          include: storefrontListingInclude,
        }),
      ]);
    }

    const products = listings.map(listing =>
      transformProductForListing(listing.product, listing)
    );

    const result = {
      data: products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };

    cacheSet(cacheKey, result);

    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
    res.json(result);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
};

// ─── Public: Get product by ID ───────────────────────────────────────

export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: storefrontProductInclude,
    });

    if (!product || !product.storefront?.isPublished) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ data: transformProductForStorefront(product) });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to get product' });
  }
};

// ─── Public: Get product by slug ─────────────────────────────────────

export const getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const product = await prisma.product.findUnique({
      where: { slug },
      include: storefrontProductInclude,
    });

    if (!product || !product.storefront?.isPublished) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ data: transformProductForStorefront(product) });
  } catch (error) {
    console.error('Get product by slug error:', error);
    res.status(500).json({ error: 'Failed to get product' });
  }
};

// ─── Public: Search products ─────────────────────────────────────────

export const searchProducts = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query (q) is required' });
    }

    req.query.search = q;
    return getAllProducts(req, res);
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({ error: 'Failed to search products' });
  }
};

// ─── Vendor: Create product ──────────────────────────────────────────

export const createProduct = async (req, res) => {
  try {
    const {
      categoryId,
      name,
      slug,
      description,
      brand,
      collection,
    } = req.body;

    const product = await prisma.product.create({
      data: {
        categoryId,
        name,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        description: description || '',
        brand,
        collection,
        source: 'MANUAL',
      },
      include: {
              category: { select: { name: true } },
      },
    });

    res.status(201).json({ message: 'Product created successfully', product });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
};

// ─── Vendor: Update product ──────────────────────────────────────────

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    });

    res.json({ message: 'Product updated successfully', product });
  } catch (error) {
    console.error('Update product error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(500).json({ error: 'Failed to update product' });
  }
};

// ─── Vendor: Delete product ──────────────────────────────────────────

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.product.update({ where: { id }, data: { isActive: false } });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

// ─── Vendor: Toggle product active status ────────────────────────────

export const toggleProductStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const currentProduct = await prisma.product.findUnique({
      where: { id },
      select: { isActive: true },
    });

    if (!currentProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { isActive: !currentProduct.isActive },
      include: {
        category: true,
        _count: { select: { variants: true } },
      },
    });

    res.json({
      message: `Product ${updatedProduct.isActive ? 'activated' : 'deactivated'} successfully`,
      product: updatedProduct,
    });
  } catch (error) {
    console.error('Toggle product status error:', error);
    res.status(500).json({ error: 'Failed to toggle product status' });
  }
};


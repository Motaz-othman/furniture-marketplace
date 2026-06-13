import prisma from '../../shared/config/db.js';
import { searchProducts } from '../../shared/services/meilisearch.service.js';

const isMeilisearchConfigured = () => !!process.env.MEILISEARCH_HOST && !!process.env.MEILISEARCH_ADMIN_KEY;

// Search products
export const search = async (req, res) => {
  try {
    const {
      q,
      categoryId,
      minPrice,
      maxPrice,
      sort,
      page = 1,
      limit = 20
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    if (isMeilisearchConfigured()) {
      try {
        const results = await searchProducts(q || '', {
          limit: limitNum,
          offset,
          categoryId,
          minPrice: minPrice ? parseFloat(minPrice) : null,
          maxPrice: maxPrice ? parseFloat(maxPrice) : null,
          sort
        });

        return res.json({
          query: q || '',
          hits: results.hits,
          totalHits: results.estimatedTotalHits,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(results.estimatedTotalHits / limitNum),
          processingTimeMs: results.processingTimeMs
        });
      } catch (error) {
        console.error('Meilisearch failed, falling back to database search:', error);
      }
    }

    // ── Fallback: database search via Prisma ──
    const where = { isActive: true };

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { brand: { contains: q, mode: 'insensitive' } },
        { collection: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (minPrice || maxPrice) {
      where.minPrice = {};
      if (minPrice) where.minPrice.gte = parseFloat(minPrice);
      if (maxPrice) where.minPrice.lte = parseFloat(maxPrice);
    }

    const orderBy = sort === 'price:asc' ? { minPrice: 'asc' }
      : sort === 'price:desc' ? { minPrice: 'desc' }
      : sort === 'name:asc' ? { name: 'asc' }
      : sort === 'rating:desc' ? { rating: 'desc' }
      : { createdAt: 'desc' };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip: offset,
        take: limitNum,
        select: {
          id: true, name: true, slug: true, description: true, brand: true,
          minPrice: true, maxPrice: true, compareAtPrice: true, mainImage: true,
          totalStock: true, rating: true, totalReviews: true, categoryId: true,
          category: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      query: q || '',
      hits: products,
      totalHits: total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      processingTimeMs: 0
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
};

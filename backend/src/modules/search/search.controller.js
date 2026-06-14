import prisma from '../../shared/config/db.js';
import { Prisma } from '../../generated/prisma/index.js';
import { buildSearchScoring } from '../../shared/utils/fuzzySearch.js';
import { getKeywords as getKeywordsCached } from '../../shared/services/keywords.service.js';

// Search products — uses Postgres trigram similarity for typo-tolerant matching
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

    const term = q ? q.trim() : '';

    if (term) {
      // A product matches if it matches AT LEAST ONE word of the search term;
      // products matching MORE words rank higher (see ORDER BY below).
      const { matchCountExpr, similarityScoreExpr, anyWordMatches } = buildSearchScoring(term);
      const conditions = [Prisma.sql`p."isActive" = true`, anyWordMatches];

      if (categoryId) conditions.push(Prisma.sql`p."categoryId" = ${categoryId}`);
      if (minPrice) conditions.push(Prisma.sql`p."minPrice" >= ${parseFloat(minPrice)}`);
      if (maxPrice) conditions.push(Prisma.sql`p."minPrice" <= ${parseFloat(maxPrice)}`);

      const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;

      const orderByClause = sort === 'price:asc' ? Prisma.sql`p."minPrice" ASC`
        : sort === 'price:desc' ? Prisma.sql`p."minPrice" DESC`
        : sort === 'name:asc' ? Prisma.sql`p.name ASC`
        : sort === 'rating:desc' ? Prisma.sql`p.rating DESC`
        : Prisma.sql`
          ${matchCountExpr} DESC,
          (CASE WHEN p.name ILIKE ${`%${term}%`} THEN 0 ELSE 1 END) ASC,
          ${similarityScoreExpr} DESC,
          similarity(p.name, ${term}) DESC
        `;

      const rows = await prisma.$queryRaw`
        SELECT
          p.id, p.name, p.slug, p.description, p.brand,
          p."minPrice", p."maxPrice", p."compareAtPrice", p."mainImage",
          p."totalStock", p.rating, p."totalReviews", p."categoryId",
          c.id AS "categoryId_", c.name AS "categoryName_", c.slug AS "categorySlug_"
        FROM "Product" p
        LEFT JOIN "Category" c ON c.id = p."categoryId"
        ${whereClause}
        ORDER BY ${orderByClause}
        LIMIT ${limitNum} OFFSET ${offset}
      `;

      const [{ count: total }] = await prisma.$queryRaw`
        SELECT COUNT(*)::int AS count
        FROM "Product" p
        ${whereClause}
      `;

      const hits = rows.map(({ categoryId_, categoryName_, categorySlug_, ...p }) => ({
        ...p,
        category: categoryId_ ? { id: categoryId_, name: categoryName_, slug: categorySlug_ } : null,
      }));

      return res.json({
        query: term,
        hits,
        totalHits: total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        processingTimeMs: 0
      });
    }

    // ── No query: plain filtered/sorted listing ──
    const where = { isActive: true };

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
      query: '',
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

// Generic keyword vocabulary for search autocomplete: category names plus a
// curated list of common furniture search phrases. Cached in-memory (see
// shared/services/keywords.service.js) — the storefront fetches this once
// and matches against it client-side for instant suggestions with no
// per-keystroke request.
export const getKeywords = async (_req, res) => {
  try {
    const keywords = await getKeywordsCached();
    res.json({ keywords });
  } catch (error) {
    console.error('Get keywords error:', error);
    res.status(500).json({ error: 'Failed to load keywords' });
  }
};

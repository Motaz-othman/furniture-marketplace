import prisma from '../../shared/config/db.js';
import { Prisma } from '../../generated/prisma/index.js';
import { buildSearchScoring } from '../../shared/utils/fuzzySearch.js';
import { getKeywords as getKeywordsCached } from '../../shared/services/keywords.service.js';
import { transformProductForListing } from '../../shared/utils/storefront.transforms.js';

const storefrontListingInclude = {
  product: {
    include: {
      category: { select: { id: true, name: true, slug: true, parentId: true } },
      variants: {
        select: {
          id: true, sku: true, externalProductId: true, name: true,
          price: true, stockQuantity: true, attributes: true, options: true,
        },
        orderBy: { rank: 'asc' },
      },
    },
  },
  category: { select: { id: true, name: true, slug: true, parentId: true } },
};

// Search products — uses Postgres trigram similarity for typo-tolerant matching.
// Only returns published StorefrontListings so raw/unpublished products never appear.
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

    // Base published gate — applied to every query path
    const listingWhere = { isPublished: true };
    if (categoryId) {
      listingWhere.OR = [
        { categoryId },
        { categoryId: null, product: { categoryId } },
      ];
    }

    if (term) {
      // ── Step 1: get ranked product IDs from trigram search ──────────────────
      // The raw SQL scores only against Product columns (name, brand, description).
      // We JOIN StorefrontListing here so unpublished products are excluded at
      // the DB level. Only IDs are selected — full data comes from Prisma below.
      const { matchCountExpr, similarityScoreExpr, anyWordMatches } = buildSearchScoring(term);

      const priceConditions = [];
      if (minPrice) priceConditions.push(Prisma.sql`p."minPrice" >= ${parseFloat(minPrice)}`);
      if (maxPrice) priceConditions.push(Prisma.sql`p."minPrice" <= ${parseFloat(maxPrice)}`);
      const priceClause = priceConditions.length
        ? Prisma.sql`AND ${Prisma.join(priceConditions, ' AND ')}`
        : Prisma.sql``;

      const orderByClause = sort === 'price:asc'   ? Prisma.sql`p."minPrice" ASC`
        : sort === 'price:desc'  ? Prisma.sql`p."minPrice" DESC`
        : sort === 'name:asc'    ? Prisma.sql`p.name ASC`
        : sort === 'rating:desc' ? Prisma.sql`p.rating DESC`
        : Prisma.sql`
          ${matchCountExpr} DESC,
          (CASE WHEN p.name ILIKE ${`%${term}%`} THEN 0 ELSE 1 END) ASC,
          ${similarityScoreExpr} DESC,
          similarity(p.name, ${term}) DESC
        `;

      const rankedRows = await prisma.$queryRaw`
        SELECT p.id
        FROM "Product" p
        INNER JOIN "StorefrontListing" sl ON sl."productId" = p.id
        WHERE sl."isPublished" = true
          AND ${anyWordMatches}
          ${priceClause}
        ORDER BY ${orderByClause}
      `;

      const orderedIds = rankedRows.map(r => r.id);

      // ── Step 2: fetch published listings and apply category filter ───────────
      const listings = await prisma.storefrontListing.findMany({
        where: { ...listingWhere, productId: { in: orderedIds } },
        include: storefrontListingInclude,
      });

      // Restore trigram rank order (Prisma IN queries don't preserve order)
      const rankMap = new Map(orderedIds.map((id, i) => [id, i]));
      listings.sort((a, b) => rankMap.get(a.productId) - rankMap.get(b.productId));

      const total = listings.length;
      const page_listings = listings.slice(offset, offset + limitNum);
      const hits = page_listings.map(l => transformProductForListing(l.product, l));

      return res.json({
        query: term,
        hits,
        totalHits: total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        processingTimeMs: 0,
      });
    }

    // ── No query: plain filtered/sorted listing ───────────────────────────────
    if (minPrice || maxPrice) {
      listingWhere.product = { minPrice: {} };
      if (minPrice) listingWhere.product.minPrice.gte = parseFloat(minPrice);
      if (maxPrice) listingWhere.product.minPrice.lte = parseFloat(maxPrice);
    }

    const orderBy = sort === 'price:asc'   ? [{ product: { minPrice: 'asc' } }, { id: 'asc' }]
      : sort === 'price:desc'  ? [{ product: { minPrice: 'desc' } }, { id: 'asc' }]
      : sort === 'name:asc'    ? [{ product: { name: 'asc' } }, { id: 'asc' }]
      : sort === 'rating:desc' ? [{ product: { rating: 'desc' } }, { id: 'asc' }]
      : [{ id: 'desc' }];

    const [total, listings] = await Promise.all([
      prisma.storefrontListing.count({ where: listingWhere }),
      prisma.storefrontListing.findMany({
        where: listingWhere,
        orderBy,
        skip: offset,
        take: limitNum,
        include: storefrontListingInclude,
      }),
    ]);

    const hits = listings.map(l => transformProductForListing(l.product, l));

    res.json({
      query: '',
      hits,
      totalHits: total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      processingTimeMs: 0,
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

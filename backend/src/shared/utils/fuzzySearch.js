import { Prisma } from '../../generated/prisma/index.js';

// Builds per-word WHERE conditions for typo-tolerant product search.
// Each word must match via substring (ILIKE) or trigram similarity (handles typos).
export function buildFuzzyConditions(term) {
  const words = term.trim().split(/\s+/).filter(Boolean);

  return words.map(word => {
    const like = `%${word}%`;
    return Prisma.sql`(
      p.name ILIKE ${like}
      OR p.description ILIKE ${like}
      OR coalesce(p.brand, '') ILIKE ${like}
      OR coalesce(p.collection, '') ILIKE ${like}
      OR word_similarity(${word}, p.name) >= 0.25
      OR word_similarity(${word}, coalesce(p.brand, '')) >= 0.25
      OR word_similarity(${word}, coalesce(p.collection, '')) >= 0.25
    )`;
  });
}

// Returns matching product ids ordered by relevance (exact substring matches first,
// then by trigram similarity to the full search term).
export async function findMatchingProductIds(prisma, term, extraConditions = []) {
  const conditions = [
    Prisma.sql`p."isActive" = true`,
    ...buildFuzzyConditions(term),
    ...extraConditions,
  ];

  const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
  const like = `%${term}%`;

  const rows = await prisma.$queryRaw`
    SELECT p.id
    FROM "Product" p
    ${whereClause}
    ORDER BY
      (CASE WHEN p.name ILIKE ${like} THEN 0 ELSE 1 END) ASC,
      similarity(p.name, ${term}) DESC
  `;

  return rows.map(r => r.id);
}

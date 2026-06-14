import { Prisma } from '../../generated/prisma/index.js';

// Per-word match condition + similarity score, typo-tolerant via trigram similarity.
function buildWordExpressions(term) {
  const words = term.trim().split(/\s+/).filter(Boolean);

  return words.map(word => {
    const like = `%${word}%`;

    // Trigram similarity is unreliable for short words (e.g. "Bed" ~ "Garden
    // Bench" = 0.5), producing unrelated matches once a single matched word
    // is enough to include a product (OR logic). Words under 4 chars rely on
    // substring (ILIKE) matching only; longer words also get the fuzzy fallback.
    const fuzzyConds = word.length >= 4 ? Prisma.sql`
      OR word_similarity(${word}, p.name) >= 0.25
      OR word_similarity(${word}, coalesce(p.brand, '')) >= 0.25
      OR word_similarity(${word}, coalesce(p.collection, '')) >= 0.25
    ` : Prisma.sql``;

    const matchCond = Prisma.sql`(
      p.name ILIKE ${like}
      OR p.description ILIKE ${like}
      OR coalesce(p.brand, '') ILIKE ${like}
      OR coalesce(p.collection, '') ILIKE ${like}
      ${fuzzyConds}
    )`;

    const similarityExpr = Prisma.sql`GREATEST(
      word_similarity(${word}, p.name),
      word_similarity(${word}, coalesce(p.brand, '')),
      word_similarity(${word}, coalesce(p.collection, '')),
      word_similarity(${word}, coalesce(p.description, ''))
    )`;

    return { matchCond, similarityExpr };
  });
}

// Builds the WHERE/ORDER BY pieces for relevance-ranked, OR-based product search.
// A product is included if it matches AT LEAST ONE word of the search term;
// products matching MORE words rank above products matching fewer, and ties
// are broken by trigram similarity (handles typos).
export function buildSearchScoring(term) {
  const expressions = buildWordExpressions(term);

  const matchCountExpr = Prisma.sql`(${Prisma.join(
    expressions.map(({ matchCond }) => Prisma.sql`(CASE WHEN ${matchCond} THEN 1 ELSE 0 END)`),
    ' + '
  )})`;

  const similarityScoreExpr = Prisma.sql`(${Prisma.join(
    expressions.map(({ similarityExpr }) => similarityExpr),
    ' + '
  )})`;

  const anyWordMatches = Prisma.sql`(${Prisma.join(
    expressions.map(({ matchCond }) => matchCond),
    ' OR '
  )})`;

  return { matchCountExpr, similarityScoreExpr, anyWordMatches };
}

// Returns matching product ids ordered by relevance: products matching more
// search words first, then exact full-phrase matches, then by trigram similarity.
export async function findMatchingProductIds(prisma, term, extraConditions = []) {
  const { matchCountExpr, similarityScoreExpr, anyWordMatches } = buildSearchScoring(term);

  const conditions = [
    Prisma.sql`p."isActive" = true`,
    anyWordMatches,
    ...extraConditions,
  ];

  const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
  const like = `%${term}%`;

  const rows = await prisma.$queryRaw`
    SELECT p.id
    FROM "Product" p
    ${whereClause}
    ORDER BY
      ${matchCountExpr} DESC,
      (CASE WHEN p.name ILIKE ${like} THEN 0 ELSE 1 END) ASC,
      ${similarityScoreExpr} DESC,
      similarity(p.name, ${term}) DESC
  `;

  return rows.map(r => r.id);
}

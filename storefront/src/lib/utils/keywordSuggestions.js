/**
 * Client-side matching for the search autocomplete keyword vocabulary.
 * Runs entirely in-memory so suggestions appear instantly as the user types,
 * with no per-keystroke network request.
 */

const FUZZY_THRESHOLD = 0.5;

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }

  return dp[m][n];
}

// Normalized similarity in [0, 1], typo-tolerant guide for short words
function similarity(a, b) {
  if (!a.length || !b.length) return 0;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

function rank(scored, limit) {
  return scored
    .sort((a, b) => b.score - a.score || a.keyword.localeCompare(b.keyword))
    .slice(0, limit)
    .map((s) => s.keyword);
}

/**
 * Match a typed term against the keyword vocabulary.
 * Ranking: prefix match on a phrase's first word > prefix match on a later
 * word. Results narrow as more letters are typed. If nothing matches by
 * prefix, fall back to a typo-tolerant fuzzy match as a spelling guide.
 *
 * @param {string} term - The text the user has typed so far
 * @param {string[]} keywords - The full keyword vocabulary
 * @param {number} limit - Max number of suggestions to return
 * @returns {string[]} Ranked keyword suggestions
 */
export function matchKeywords(term, keywords, limit = 8) {
  const query = term.trim().toLowerCase();
  if (!query || !keywords?.length) return [];

  const prefixMatches = [];
  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();
    const words = lowerKeyword.split(/\s+/);
    let best = 0;

    // A query spanning multiple words (e.g. "sofa set") won't prefix-match
    // any single word — check the full phrase too, and rank it above any
    // single-word match since it's the most specific signal. Only applies
    // once the query extends past the first word, so short single-word
    // queries (e.g. "ch") aren't dominated by phrases that merely start
    // with the same letters.
    if (query.length > words[0].length && lowerKeyword.startsWith(query)) {
      const closeness = query.length / lowerKeyword.length;
      best = Math.max(best, 10 + closeness);
    }

    words.forEach((word, i) => {
      if (word.startsWith(query)) {
        const positionBonus = i === 0 ? 1 : 0.8;
        const closeness = query.length / word.length;
        best = Math.max(best, (1 + closeness) * positionBonus);
      }
    });

    if (best > 0) prefixMatches.push({ keyword, score: best });
  }

  if (prefixMatches.length > 0) return rank(prefixMatches, limit);

  // No prefix matches at all — likely a typo, fall back to fuzzy matching
  const fuzzyMatches = [];
  for (const keyword of keywords) {
    const words = keyword.toLowerCase().split(/\s+/);
    let best = 0;

    words.forEach((word, i) => {
      const positionBonus = i === 0 ? 1 : 0.8;
      const sim = similarity(query, word);
      if (sim >= FUZZY_THRESHOLD) best = Math.max(best, sim * positionBonus);
    });

    if (best > 0) fuzzyMatches.push({ keyword, score: best });
  }

  return rank(fuzzyMatches, limit);
}

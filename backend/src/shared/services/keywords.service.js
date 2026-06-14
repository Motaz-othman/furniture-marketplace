import prisma from '../config/db.js';
import { CURATED_SEARCH_KEYWORDS } from '../constants/searchKeywords.js';

// Generic keyword vocabulary for search autocomplete: category names
// (compound names like "Chairs & Recliners" are split into atomic terms)
// plus a curated list of common furniture search phrases. Cached in memory
// since the category list rarely changes — the storefront fetches this once
// and matches against it client-side for instant suggestions with no
// per-keystroke request. Invalidated whenever a category is created,
// updated, or deleted.
let keywordsCache = null;

export async function getKeywords() {
  if (!keywordsCache) {
    const categories = await prisma.category.findMany({ select: { name: true } });

    const keywords = new Set();
    for (const { name } of categories) {
      for (const part of name.split(/\s*&\s*|\s+and\s+/i)) {
        const trimmed = part.trim();
        if (trimmed) keywords.add(trimmed);
      }
    }

    for (const term of CURATED_SEARCH_KEYWORDS) {
      keywords.add(term);
    }

    keywordsCache = Array.from(keywords).sort();
  }

  return keywordsCache;
}

export function invalidateKeywords() {
  keywordsCache = null;
}

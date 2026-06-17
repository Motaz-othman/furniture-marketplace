/**
 * Shared helpers for vendor sheet adapters (ACME, Global Furniture, ...).
 *
 * Adapters are pure transforms: raw vendor row(s) in, normalized
 * { product, variant } records out. No DB/network access here.
 */

/**
 * Slug is name + externalId so two different SKUs that happen to share
 * a product name (e.g. same model in different finishes) never collide
 * on the unique Product.slug constraint.
 */
export function buildSlug(name, externalId) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${base}-${externalId}`;
}

/**
 * Strip HTML tags/entities down to readable plain text.
 * Vendor descriptions come as entity-encoded HTML (&bull;, &lt;br&gt;, etc.)
 */
export function cleanHtml(html) {
  if (!html) return '';
  return html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&bull;/gi, '•')
    .replace(/<[^>]+>/g, '')
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n');
}

/**
 * Split a vendor HTML bullet-list description into individual bullet strings,
 * for storage as `externalData.specifications`.
 */
export function splitSpecifications(html) {
  return cleanHtml(html)
    .split('\n')
    .map(line => line.replace(/^•\s*/, '').trim())
    .filter(Boolean);
}

/**
 * Build a ProductVariant.attributes[] entry.
 * Matches the shape used by the Wondersign sync: [{attribute, values}]
 */
export function buildAttribute(attribute, rawValue) {
  if (rawValue == null || rawValue === '') return null;
  const values = String(rawValue).split(',').map(v => v.trim()).filter(Boolean);
  if (!values.length) return null;
  return { attribute, values };
}

/**
 * Resolve a list of raw vendor category tokens against a vendor-specific
 * mapping table (token -> internal category path, e.g. "living-room/sofas-couches").
 *
 * Returns:
 *  - categoryPath: the first resolved path (used as the primary/browsable category)
 *  - categories: [{ path }] for every token, mapped or not, kept for reference
 */
export function resolveCategories(tokens, categoryMap) {
  const categories = [];
  let categoryPath = null;

  for (const rawToken of tokens) {
    const token = rawToken.trim();
    if (!token) continue;

    const mapped = categoryMap[token];
    if (mapped) {
      categories.push({ path: mapped });
      if (!categoryPath) categoryPath = mapped;
    } else {
      // Unmapped token kept verbatim for future remapping; not browsable.
      categories.push({ path: token, unmapped: true });
    }
  }

  return { categoryPath, categories };
}

/**
 * Parse a number out of a vendor cell, handling blanks/"Call For Details"/ranges.
 * Ranges like "72-90" return the first number.
 */
export function parseNumber(raw) {
  if (raw == null) return null;
  const str = String(raw).trim();
  if (!str) return null;
  const match = str.match(/-?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : null;
}

/**
 * Global Furniture `Category` / `Subcategory` -> internal Category path.
 *
 * Both columns are looked up (Subcategory first, since it's more specific);
 * the first resolved match becomes the primary categoryId, both raw tokens
 * are kept as reference entries in Product.categories.
 *
 * SEEDED FROM SAMPLE DATA ONLY — extend as new Category/Subcategory values
 * show up across the full catalog. Unmapped tokens (e.g. "Decor"/"Fireplace",
 * which has no equivalent in the current taxonomy) are preserved verbatim.
 */
export const GLOBAL_FURNITURE_CATEGORY_MAP = {
  'Beds': 'bedroom/beds-frames',
  'Bedroom': 'bedroom',

  // GFW's "Decor/Fireplace" subcategory is actually entertainment units/TV
  // stands with a built-in electric fireplace — closest taxonomy match.
  'Fireplace': 'living-room/tv-stands-media',

  // No current taxonomy match — left unmapped on purpose:
  // 'Decor': null,
};

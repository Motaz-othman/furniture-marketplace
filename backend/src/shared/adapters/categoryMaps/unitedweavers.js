/**
 * United Weavers rug type / shape token → internal Category slug.
 *
 * UW catalog files don't carry a category field — we infer from
 * the Rug Type column (Indoor / Outdoor / Indoor/Outdoor) and,
 * where helpful, the Shape column (Runner / Rectangle / Round / etc.).
 *
 * All values resolve to the top-level "rugs" slug for now; sub-category
 * assignment can be refined in the admin panel after import.
 */
export const UW_CATEGORY_MAP = {
  // Rug Type values
  'Indoor':           'rugs',
  'Outdoor':          'rugs',
  'Indoor/Outdoor':   'rugs',
  'Indoor / Outdoor': 'rugs',

  // Fallback
  'Rug':              'rugs',
};

/**
 * ACME `catalog_category_attribute.category` token -> internal Category slug.
 *
 * The spec sheet's `category` column is a comma-separated list of tokens.
 * Each token is looked up here; the first resolved match becomes the
 * product's primary categoryId, the rest are kept as reference-only entries
 * in Product.categories.
 *
 * Sale tags (Harvest Sale, Clearance Sale, etc.) and style collections
 * (Glam Mirrored, Classic Traditional, etc.) are intentionally unmapped —
 * they are merchandising labels, not browsable categories.
 */
export const ACME_CATEGORY_MAP = {
  // ─── Living Room ─────────────────────────────────────────────────────
  'All Living Room':         'living-room',
  'Living Room':             'living-room',
  'Sofa':                    'sofas',
  'Genuine Leather Sofa':    'sofas',
  'Sleeper Sofa':            'sleeper-sofas',
  'Sectional':               'sectional',
  'Loveseat':                'loveseats',
  'Accent Chair':            'accent-chairs',
  'Chair':                   'accent-chairs',
  'Recliner':                'recliners-and-rockers',
  'Ottoman':                 'ottomans-and-poufs',
  'Chaise':                  'chaise-lounges',
  'Coffee Table':            'coffee-table',
  'End Table':               'end-and-side-tables',
  'Accent Table':            'end-and-side-tables',
  'Nesting Table Set':       'coffee-table-sets',
  'Console Unit':            'console-tables',
  'TV Console':              'tv-stands-entertainment',
  'Fireplace':               'fireplaces',
  'Console Art Decor':       'console-tables',

  // ─── Dining & Kitchen ────────────────────────────────────────────────
  'Formal Dining':           'dining-and-kitchen',
  'All Dining Room':         'dining-and-kitchen',
  'Dining Room':             'dining-and-kitchen',
  'Casual Dining':           'dining-and-kitchen',
  'Counter Height Dining':   'dining-sets',
  'Dining Tables':           'dining-tables',
  'Bar':                     'bar-stools-counter-stools',
  'Server & Mirror':         'servers-and-buffet',
  'Curio & Buffet':          'curio-and-display',
  'Kitchen Island & Serving Cart': 'kitchen-island-cart',

  // ─── Bedroom ─────────────────────────────────────────────────────────
  'All Bedroom':             'bedroom',
  'Bedroom':                 'bedroom',
  'Bed':                     'beds',
  'TV Beds':                 'beds',
  'Trundle':                 'beds',
  'Bunk Bed':                'kids-room-bunkbeds',
  'Daybed':                  'day-beds',
  'Dresser & Mirror':        'dressers',
  'Chest':                   'chests',
  'Nightstand':              'night-stands',
  'Vanity':                  'vanities',
  'Floor Mirror':            'vanities',
  'Bench':                   'bedroom-benches',
  'Bench & Ottoman':         'bedroom-benches',
  'Wardrobe':                'bedroom',

  // ─── Kids ────────────────────────────────────────────────────────────
  'All Youth':               'kids-room-bunkbeds',
  'Youth':                   'kids-room-bunkbeds',

  // ─── Office ──────────────────────────────────────────────────────────
  'All Home Office & Studio':'office',
  'Home Office & Studio':    'office',
  'Music Studio':            'office',
  'Desk':                    'desks-and-hutches',
  'Executive Desk':          'desks-and-hutches',
  'Gaming Table':            'desks-and-hutches',
  'Desk Chair':              'office-chairs',
  'Bookshelf & File Cabinet':'bookcases-and-shelves',
  'Bookshelf':               'bookcases-and-shelves',
  'Storage':                 'filing-cabinets-storage',
  'Cabinet':                 'bookcases-and-shelves',

  // ─── Decor / Accessories ─────────────────────────────────────────────
  'All Accessories':         'decor',
  'Accessories':             'decor',
  'Accessiores':             'decor',   // typo in ACME data
  'Decor':                   'decor',
  'Clock':                   'clocks',

  // ─── Outdoor ─────────────────────────────────────────────────────────
  'All Outdoor':             'outdoor',
  'Outdoor Living':          'outdoor',
  'Outdoor Chairs':          'outdoor-chairs',
  'Patio Dining':            'outdoor-dining-set',
  'Patio Table Set':         'outdoor-dining-set',

  // ─── Intentionally unmapped ───────────────────────────────────────────
  // Sale/promotional tags → not browsable categories
  // 'Harvest Sale', 'Winter Wonderland', 'Clearance Sale', 'clearance-sale',
  // 'On Sale', 'Popular', 'High Demand Best Seller', 'Glamourous Diamond Sale'

  // Style/collection labels → not browsable categories
  // 'Classic Traditional', 'Lavish Traditional', 'Glam Mirrored',
  // 'Velvet Bling Upholstery', 'Traditional Elegance', 'Italian Leather Connection',
  // 'Industrial Metal Cargo Collection', 'Hollywood Impressions',
  // 'Everyday Louis Phillip', 'Luxurious Chrome Design', 'Neoclassic French Fusion',
  // 'Modern Farm House', 'Colorful Work Styles', 'Minimalist', 'Marble Stone and Veneer',
  // 'Urban Industrial Chic'
};

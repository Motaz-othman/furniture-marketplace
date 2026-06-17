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
  'Sofa': 'sofas-couches',
  'All Living Room': 'living-room',
  'Living Room': 'living-room',
  'Sectional': 'sofas-couches',
  'Loveseat': 'sofas-couches',
  'Sleeper Sofa': 'sofas-couches',
  'Genuine Leather Sofa': 'sofas-couches',
  'Chaise': 'sofas-couches',
  'Accent Chair': 'chairs-recliners',
  'Chair': 'chairs-recliners',
  'Recliner': 'chairs-recliners',
  'Ottoman': 'chairs-recliners',
  'Coffee Table': 'coffee-tables',
  'End Table': 'coffee-tables',
  'Accent Table': 'coffee-tables',
  'Nesting Table Set': 'coffee-tables',
  'Console Unit': 'tv-stands-media',
  'TV Console': 'tv-stands-media',
  'Fireplace': 'tv-stands-media',
  'Console Art Decor': 'tv-stands-media',

  // ─── Dining Room ─────────────────────────────────────────────────────
  'Formal Dining': 'dining-room',
  'All Dining Room': 'dining-room',
  'Dining Room': 'dining-room',
  'Casual Dining': 'dining-room',
  'Counter Height Dining': 'dining-tables',
  'Dining Tables': 'dining-tables',
  'Bar': 'bar-stools',
  'Server & Mirror': 'buffets-sideboards',
  'Curio & Buffet': 'buffets-sideboards',
  'Kitchen Island & Serving Cart': 'dining-tables',

  // ─── Bedroom ─────────────────────────────────────────────────────────
  'All Bedroom': 'bedroom',
  'Bedroom': 'bedroom',
  'Bed': 'beds-frames',
  'TV Beds': 'beds-frames',
  'Trundle': 'beds-frames',
  'Bunk Bed': 'kids-beds',
  'Daybed': 'loungers-daybeds',
  'Dresser & Mirror': 'dressers-chests',
  'Chest': 'dressers-chests',
  'Nightstand': 'nightstands',
  'Vanity': 'vanities-mirrors',
  'Floor Mirror': 'vanities-mirrors',
  'Bench': 'bedroom',
  'Bench & Ottoman': 'bedroom',
  'Wardrobe': 'wardrobes-armoires',

  // ─── Kids ────────────────────────────────────────────────────────────
  'All Youth': 'kids-room',
  'Youth': 'kids-room',

  // ─── Office ──────────────────────────────────────────────────────────
  'All Home Office & Studio': 'office',
  'Home Office & Studio': 'office',
  'Music Studio': 'office',
  'Desk': 'desks',
  'Executive Desk': 'desks',
  'Gaming Table': 'desks',
  'Desk Chair': 'office-chairs',
  'Bookshelf & File Cabinet': 'bookcases-storage',
  'Bookshelf': 'bookcases-storage',
  'Storage': 'bookcases-storage',
  'Cabinet': 'bookcases-storage',

  // ─── Accessories ─────────────────────────────────────────────────────
  'All Accessories': 'living-room',
  'Accessories': 'living-room',
  'Accessiores': 'living-room', // typo in ACME data
  'Decor': 'living-room',
  'Clock': 'living-room',

  // ─── Outdoor ─────────────────────────────────────────────────────────
  'All Outdoor': 'outdoor',
  'Outdoor Living': 'outdoor',
  'Outdoor Chairs': 'patio-seating',
  'Patio Dining': 'outdoor-dining',
  'Patio Table Set': 'outdoor-dining',

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

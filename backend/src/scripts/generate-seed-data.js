/**
 * Generates mock Wondersign API data as static JSON files.
 * Sources the patterns from the storefront's fake data.
 *
 * Usage: node src/scripts/generate-seed-data.js
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function generateProductId(index) {
  return 'CPV' + String(index).padStart(9, '0');
}

// ─── Categories ───────────────────────────────────────────────────────
const categories = [
  { id: 1, name: "Living Room", slug: "living-room", path: "living-room", imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800", parentId: null, displayOrder: 1 },
  { id: 101, name: "Sofas & Couches", slug: "sofas-couches", path: "living-room/sofas-couches", imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600", parentId: 1, displayOrder: 1 },
  { id: 102, name: "Chairs & Recliners", slug: "chairs-recliners", path: "living-room/chairs-recliners", imageUrl: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=600", parentId: 1, displayOrder: 2 },
  { id: 103, name: "Coffee Tables", slug: "coffee-tables", path: "living-room/coffee-tables", imageUrl: "https://images.unsplash.com/photo-1611269154421-4e27233ac5c7?w=600", parentId: 1, displayOrder: 3 },
  { id: 104, name: "TV Stands & Media", slug: "tv-stands-media", path: "living-room/tv-stands-media", imageUrl: "https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?w=600", parentId: 1, displayOrder: 4 },
  { id: 105, name: "Bookcases & Storage", slug: "bookcases-storage", path: "living-room/bookcases-storage", imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600", parentId: 1, displayOrder: 5 },
  { id: 2, name: "Bedroom", slug: "bedroom", path: "bedroom", imageUrl: "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800", parentId: null, displayOrder: 2 },
  { id: 201, name: "Beds & Frames", slug: "beds-frames", path: "bedroom/beds-frames", imageUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600", parentId: 2, displayOrder: 1 },
  { id: 202, name: "Nightstands", slug: "nightstands", path: "bedroom/nightstands", imageUrl: "https://images.unsplash.com/photo-1595428773937-78b4b8b39f7d?w=600", parentId: 2, displayOrder: 2 },
  { id: 203, name: "Dressers & Chests", slug: "dressers-chests", path: "bedroom/dressers-chests", imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600", parentId: 2, displayOrder: 3 },
  { id: 204, name: "Wardrobes & Armoires", slug: "wardrobes-armoires", path: "bedroom/wardrobes-armoires", imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600", parentId: 2, displayOrder: 4 },
  { id: 205, name: "Vanities & Mirrors", slug: "vanities-mirrors", path: "bedroom/vanities-mirrors", imageUrl: "https://images.unsplash.com/photo-1595514535116-8f0c1c26d904?w=600", parentId: 2, displayOrder: 5 },
  { id: 3, name: "Dining Room", slug: "dining-room", path: "dining-room", imageUrl: "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800", parentId: null, displayOrder: 3 },
  { id: 301, name: "Dining Tables", slug: "dining-tables", path: "dining-room/dining-tables", imageUrl: "https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?w=600", parentId: 3, displayOrder: 1 },
  { id: 302, name: "Dining Chairs", slug: "dining-chairs", path: "dining-room/dining-chairs", imageUrl: "https://images.unsplash.com/photo-1503602642458-232111445657?w=600", parentId: 3, displayOrder: 2 },
  { id: 303, name: "Bar Stools", slug: "bar-stools", path: "dining-room/bar-stools", imageUrl: "https://images.unsplash.com/photo-1595428773937-78b4b8b39f7d?w=600", parentId: 3, displayOrder: 3 },
  { id: 304, name: "Buffets & Sideboards", slug: "buffets-sideboards", path: "dining-room/buffets-sideboards", imageUrl: "https://images.unsplash.com/photo-1595514518526-0e1fb42b7a63?w=600", parentId: 3, displayOrder: 4 },
  { id: 305, name: "China Cabinets", slug: "china-cabinets", path: "dining-room/china-cabinets", imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600", parentId: 3, displayOrder: 5 },
  { id: 4, name: "Office", slug: "office", path: "office", imageUrl: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800", parentId: null, displayOrder: 4 },
  { id: 401, name: "Desks", slug: "desks", path: "office/desks", imageUrl: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600", parentId: 4, displayOrder: 1 },
  { id: 402, name: "Office Chairs", slug: "office-chairs", path: "office/office-chairs", imageUrl: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=600", parentId: 4, displayOrder: 2 },
  { id: 403, name: "Filing Cabinets", slug: "filing-cabinets", path: "office/filing-cabinets", imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600", parentId: 4, displayOrder: 3 },
  { id: 404, name: "Bookcases", slug: "office-bookcases", path: "office/office-bookcases", imageUrl: "https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?w=600", parentId: 4, displayOrder: 4 },
  { id: 405, name: "Office Storage", slug: "office-storage", path: "office/office-storage", imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600", parentId: 4, displayOrder: 5 },
  { id: 5, name: "Outdoor", slug: "outdoor", path: "outdoor", imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800", parentId: null, displayOrder: 5 },
  { id: 501, name: "Patio Seating", slug: "patio-seating", path: "outdoor/patio-seating", imageUrl: "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=600", parentId: 5, displayOrder: 1 },
  { id: 502, name: "Outdoor Dining", slug: "outdoor-dining", path: "outdoor/outdoor-dining", imageUrl: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600", parentId: 5, displayOrder: 2 },
  { id: 503, name: "Loungers & Daybeds", slug: "loungers-daybeds", path: "outdoor/loungers-daybeds", imageUrl: "https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=600", parentId: 5, displayOrder: 3 },
  { id: 504, name: "Umbrellas & Shade", slug: "umbrellas-shade", path: "outdoor/umbrellas-shade", imageUrl: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=600", parentId: 5, displayOrder: 4 },
  { id: 6, name: "Lighting", slug: "lighting", path: "lighting", imageUrl: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800", parentId: null, displayOrder: 6 },
  { id: 601, name: "Floor Lamps", slug: "floor-lamps", path: "lighting/floor-lamps", imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600", parentId: 6, displayOrder: 1 },
  { id: 602, name: "Table Lamps", slug: "table-lamps", path: "lighting/table-lamps", imageUrl: "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=600", parentId: 6, displayOrder: 2 },
  { id: 603, name: "Chandeliers", slug: "chandeliers", path: "lighting/chandeliers", imageUrl: "https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=600", parentId: 6, displayOrder: 3 },
  { id: 604, name: "Pendant Lights", slug: "pendant-lights", path: "lighting/pendant-lights", imageUrl: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600", parentId: 6, displayOrder: 4 },
  { id: 7, name: "Kids Room", slug: "kids-room", path: "kids-room", imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800", parentId: null, displayOrder: 7 },
  { id: 701, name: "Kids Beds", slug: "kids-beds", path: "kids-room/kids-beds", imageUrl: "https://images.unsplash.com/photo-1595428773937-78b4b8b39f7d?w=600", parentId: 7, displayOrder: 1 },
  { id: 702, name: "Kids Storage", slug: "kids-storage", path: "kids-room/kids-storage", imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600", parentId: 7, displayOrder: 2 },
  { id: 703, name: "Kids Desks", slug: "kids-desks", path: "kids-room/kids-desks", imageUrl: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600", parentId: 7, displayOrder: 3 },
  { id: 704, name: "Kids Seating", slug: "kids-seating", path: "kids-room/kids-seating", imageUrl: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=600", parentId: 7, displayOrder: 4 },
  { id: 8, name: "Bathroom", slug: "bathroom", path: "bathroom", imageUrl: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800", parentId: null, displayOrder: 8 },
  { id: 801, name: "Vanities", slug: "bathroom-vanities", path: "bathroom/bathroom-vanities", imageUrl: "https://images.unsplash.com/photo-1595514535116-8f0c1c26d904?w=600", parentId: 8, displayOrder: 1 },
  { id: 802, name: "Medicine Cabinets", slug: "medicine-cabinets", path: "bathroom/medicine-cabinets", imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600", parentId: 8, displayOrder: 2 },
  { id: 803, name: "Linen Cabinets", slug: "linen-cabinets", path: "bathroom/linen-cabinets", imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600", parentId: 8, displayOrder: 3 },
  { id: 804, name: "Bathroom Shelving", slug: "bathroom-shelving", path: "bathroom/bathroom-shelving", imageUrl: "https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?w=600", parentId: 8, displayOrder: 4 },
];

// ─── Product definitions (compact) ────────────────────────────────────
// Each entry: [name, description, categoryPath, categoryId, collection, variantKey, variants[], isNew, isFeatured]
// variant: [name, sku, colorName, hexValue, cost, listPrice, retailPrice, dims{h,l,w,weight}, productType, options[]]

const productDefs = [
  ["Modern Velvet Sofa", "Luxurious velvet sofa with deep seating and brass legs. Available in multiple colors.", "living-room/sofas-couches", 101, "Modern Living 2024", "color", [
    ["Modern Velvet Sofa - Navy Blue", "SOF-VEL-001-NAV", "Navy Blue", "#000080", 1200, 3299, 2498, {h:85,l:220,w:95,wt:45}, "sofa", [["Color","Navy Blue"]]],
    ["Modern Velvet Sofa - Emerald Green", "SOF-VEL-001-EME", "Emerald Green", "#50C878", 1200, 3299, 2498, {h:85,l:220,w:95,wt:45}, "sofa", [["Color","Emerald Green"]]],
    ["Modern Velvet Sofa - Charcoal Grey", "SOF-VEL-001-CHA", "Charcoal Grey", "#36454F", 1200, 3299, 2498, {h:85,l:220,w:95,wt:45}, "sofa", [["Color","Charcoal Grey"]]]
  ], true, true],
  ["Scandinavian Sectional", "L-shaped sectional with clean lines and natural oak legs.", "living-room/sofas-couches", 101, "Nordic Collection", "style", [
    ["Scandinavian Sectional - Light Grey", "SOF-SCA-002", "Light Grey", "#D3D3D3", 1500, 4499, 3499, {h:80,l:280,w:180,wt:65}, "sofa", []]
  ], true, true],
  ["Classic Leather Recliner", "Full-grain leather recliner with built-in footrest.", "living-room/chairs-recliners", 102, "Classic Comfort", "style", [
    ["Classic Leather Recliner", "CHR-REC-003", null, null, 800, 1999, 1499, {h:100,l:90,w:85,wt:35}, "chair", []]
  ], false, true],
  ["Mid-Century Accent Chair", "Iconic mid-century design with walnut wood frame.", "living-room/chairs-recliners", 102, "Mid-Century Modern", "color", [
    ["Mid-Century Accent Chair", "CHR-MID-004", null, null, 350, 899, 699, {h:80,l:70,w:72,wt:12}, "chair", []]
  ], true, false],
  ["Minimalist Coffee Table", "Tempered glass top with brushed steel frame.", "living-room/coffee-tables", 103, "Modern Living 2024", "style", [
    ["Minimalist Coffee Table", "TAB-MIN-005", null, null, 200, 599, 449, {h:45,l:120,w:60,wt:18}, "table", []]
  ], false, true],
  ["Rustic Oak Coffee Table", "Solid oak construction with natural grain finish.", "living-room/coffee-tables", 103, "Rustic Heritage", "style", [
    ["Rustic Oak Coffee Table", "TAB-RUS-006", null, null, 300, 799, 599, {h:48,l:130,w:70,wt:25}, "table", []]
  ], false, false],
  ["Modern TV Console", "Floating-style TV stand with cable management.", "living-room/tv-stands-media", 104, "Modern Living 2024", "style", [
    ["Modern TV Console", "TV-MOD-007", null, null, 400, 999, 799, {h:50,l:180,w:45,wt:30}, "furniture", []]
  ], true, false],
  ["Tall Bookcase", "Five-shelf bookcase in solid walnut.", "living-room/bookcases-storage", 105, "Classic Comfort", "style", [
    ["Tall Bookcase", "BOO-TAL-008", null, null, 250, 699, 549, {h:200,l:90,w:35,wt:28}, "furniture", []]
  ], false, false],
  ["Upholstered Platform Bed", "Upholstered headboard with sturdy platform base.", "bedroom/beds-frames", 201, "Bedroom Essentials", "size", [
    ["Upholstered Platform Bed - Queen", "BED-UPH-009-QUE", null, null, 600, 1599, 1199, {h:120,l:210,w:160,wt:40}, "bed", [["Size","Queen"]]],
    ["Upholstered Platform Bed - King", "BED-UPH-009-KIN", null, null, 750, 1899, 1399, {h:120,l:210,w:195,wt:50}, "bed", [["Size","King"]]]
  ], true, true],
  ["Metal Frame Bed", "Industrial-style metal frame bed.", "bedroom/beds-frames", 201, "Industrial Collection", "style", [
    ["Metal Frame Bed", "BED-MET-010", null, null, 300, 799, 599, {h:110,l:210,w:160,wt:25}, "bed", []]
  ], false, false],
  ["Vintage Dresser", "Six-drawer dresser with antique brass hardware.", "bedroom/dressers-chests", 203, "Vintage Collection", "style", [
    ["Vintage Dresser", "DRE-VIN-011", null, null, 450, 1199, 899, {h:85,l:140,w:50,wt:35}, "furniture", []]
  ], false, true],
  ["Floating Nightstand", "Wall-mounted nightstand with drawer.", "bedroom/nightstands", 202, "Modern Living 2024", "style", [
    ["Floating Nightstand", "NIG-FLO-012", null, null, 100, 299, 229, {h:20,l:45,w:35,wt:5}, "furniture", []]
  ], true, false],
  ["Sliding Door Wardrobe", "Spacious wardrobe with mirrored sliding doors.", "bedroom/wardrobes-armoires", 204, "Bedroom Essentials", "style", [
    ["Sliding Door Wardrobe", "WAR-SLI-013", null, null, 700, 1899, 1499, {h:220,l:180,w:65,wt:80}, "furniture", []]
  ], false, false],
  ["L-Shaped Desk", "Corner desk with built-in cable management.", "office/desks", 401, "Office Pro", "style", [
    ["L-Shaped Desk", "DES-L-014", null, null, 350, 899, 699, {h:75,l:160,w:140,wt:30}, "desk", []]
  ], true, true],
  ["Extendable Dining Table", "Extends from 6 to 8 seating.", "dining-room/dining-tables", 301, "Dining Collection", "style", [
    ["Extendable Dining Table", "DIN-EXT-015", null, null, 750, 1899, 1499, {h:75,l:200,w:95,wt:60}, "table", [["Extended Length","220cm"],["Seating","6-8"]]]
  ], false, true],
  ["Upholstered Dining Chair", "Set of 2 dining chairs with velvet upholstery.", "dining-room/dining-chairs", 302, "Dining Collection", "style", [
    ["Upholstered Dining Chair", "DIN-UPH-016", null, null, 150, 399, 299, {h:90,l:50,w:55,wt:8}, "chair", []]
  ], true, false],
  ["Rustic Buffet Server", "Solid wood buffet with wine storage.", "dining-room/buffets-sideboards", 304, "Rustic Heritage", "style", [
    ["Rustic Buffet Server", "BUF-RUS-017", null, null, 500, 1299, 999, {h:90,l:160,w:45,wt:40}, "furniture", []]
  ], false, false],
  ["Pendant Floor Lamp", "Arched floor lamp with fabric shade.", "lighting/floor-lamps", 601, "Lighting Collection", "style", [
    ["Pendant Floor Lamp", "PEN-FLO-018", null, null, 120, 299, 249, {h:180,l:40,w:40,wt:6}, "lighting", []]
  ], true, false],
  ["Glass Side Table", "Tempered glass side table with gold frame.", "living-room/coffee-tables", 103, "Modern Living 2024", "style", [
    ["Glass Side Table", "TAB-GLA-019", null, null, 80, 199, 149, {h:55,l:45,w:45,wt:5}, "table", []]
  ], false, false],
  ["Marble Console Table", "Marble top console for entryways.", "living-room/bookcases-storage", 105, "Luxe Collection", "style", [
    ["Marble Console Table", "CON-MAR-020", null, null, 400, 999, 799, {h:80,l:120,w:35,wt:30}, "table", []]
  ], false, true],
  ["Decorative Throw Pillow Set", "Set of 4 artisan throw pillows.", "living-room/sofas-couches", 101, "Accessories", "style", [
    ["Decorative Throw Pillow Set", "ACC-THR-021", null, null, 40, 89, 69, {h:45,l:45,w:15,wt:1}, "accessory", []]
  ], true, false],
  ["Storage Cube Organizer", "Modular storage cubes, set of 6.", "living-room/bookcases-storage", 105, "Storage Solutions", "style", [
    ["Storage Cube Organizer", "STO-CUB-022", null, null, 80, 199, 159, {h:110,l:110,w:30,wt:15}, "furniture", []]
  ], false, false],
  ["Wall Mirror", "Large round wall mirror with brass frame.", "bedroom/vanities-mirrors", 205, "Accessories", "style", [
    ["Wall Mirror", "MIR-WAL-023", null, null, 60, 149, 119, {h:80,l:80,w:3,wt:4}, "accessory", []]
  ], false, false],
  ["Shag Area Rug", "Soft shag rug in neutral tone, 8x10.", "living-room/sofas-couches", 101, "Accessories", "style", [
    ["Shag Area Rug", "RUG-SHG-024", null, null, 100, 249, 199, {h:2,l:305,w:244,wt:10}, "accessory", []]
  ], false, false],
  ["Table Lamp", "Ceramic table lamp with linen shade.", "lighting/table-lamps", 602, "Lighting Collection", "style", [
    ["Table Lamp", "LAM-TAB-025", null, null, 45, 119, 89, {h:50,l:30,w:30,wt:3}, "lighting", []]
  ], false, false],
  ["Outdoor Sectional Sofa", "Weather-resistant sectional for patio.", "outdoor/patio-seating", 501, "Outdoor Living", "style", [
    ["Outdoor Sectional Sofa", "OUT-SEC-026", null, null, 1200, 2999, 2499, {h:70,l:250,w:200,wt:55}, "sofa", []]
  ], true, true],
  ["Outdoor Bistro Set", "Two chairs and table for balcony.", "outdoor/outdoor-dining", 502, "Outdoor Living", "style", [
    ["Outdoor Bistro Set", "OUT-BIS-027", null, null, 200, 499, 399, {h:75,l:60,w:60,wt:12}, "furniture", []]
  ], false, false],
  ["Outdoor Dining Table", "Teak dining table, seats 6.", "outdoor/outdoor-dining", 502, "Outdoor Living", "style", [
    ["Outdoor Dining Table", "OUT-DIN-028", null, null, 600, 1499, 1199, {h:75,l:180,w:90,wt:35}, "table", []]
  ], false, true],
  ["Outdoor Chaise Lounge", "Adjustable chaise with cushion.", "outdoor/loungers-daybeds", 503, "Outdoor Living", "style", [
    ["Outdoor Chaise Lounge", "OUT-CHA-029", null, null, 300, 699, 549, {h:35,l:200,w:70,wt:15}, "furniture", []]
  ], true, false],
  ["Patio Umbrella", "9ft market umbrella with tilt.", "outdoor/umbrellas-shade", 504, "Outdoor Living", "style", [
    ["Patio Umbrella", "OUT-UMB-030", null, null, 80, 199, 149, {h:250,l:275,w:275,wt:8}, "accessory", []]
  ], false, false],
  ["Garden Bench", "Solid teak garden bench.", "outdoor/patio-seating", 501, "Outdoor Living", "style", [
    ["Garden Bench", "OUT-BEN-031", null, null, 250, 599, 499, {h:90,l:150,w:60,wt:20}, "furniture", []]
  ], false, false],
  ["Ergonomic Office Chair", "Mesh back chair with lumbar support.", "office/office-chairs", 402, "Office Pro", "color", [
    ["Ergonomic Office Chair", "OFF-ERG-032", null, null, 300, 799, 599, {h:115,l:65,w:65,wt:14}, "chair", []]
  ], true, true],
  ["Standing Desk", "Electric height-adjustable desk.", "office/desks", 401, "Office Pro", "style", [
    ["Standing Desk", "OFF-STA-033", null, null, 450, 1199, 899, {h:125,l:150,w:75,wt:35}, "desk", []]
  ], true, false],
  ["Filing Cabinet", "Three-drawer metal filing cabinet.", "office/filing-cabinets", 403, "Office Pro", "style", [
    ["Filing Cabinet", "OFF-FIL-034", null, null, 150, 349, 279, {h:100,l:45,w:60,wt:20}, "furniture", []]
  ], false, false],
  ["Office Bookcase", "Five-shelf office bookcase.", "office/office-bookcases", 404, "Office Pro", "style", [
    ["Office Bookcase", "OFF-BOO-035", null, null, 200, 549, 449, {h:180,l:80,w:30,wt:22}, "furniture", []]
  ], false, false],
  ["Conference Table", "Oval conference table, seats 8.", "office/office-storage", 405, "Office Pro", "style", [
    ["Conference Table", "OFF-CON-036", null, null, 800, 1999, 1599, {h:75,l:240,w:120,wt:50}, "table", []]
  ], false, false],
  ["Kids Study Desk", "Adjustable height desk that grows with your child.", "kids-room/kids-desks", 703, "Kids Collection", "style", [
    ["Kids Study Desk", "KID-DES-037", null, null, 175, 449, 349, {h:75,l:100,w:60,wt:15}, "desk", []]
  ], false, false],
  ["Kids Bean Bag Chair", "Comfortable bean bag chair in fun colors.", "kids-room/kids-seating", 704, "Kids Collection", "style", [
    ["Kids Bean Bag Chair", "KID-BEA-038", null, null, 50, 99, 99, {h:70,l:80,w:80,wt:3}, "chair", []]
  ], false, false],
  ["Double Sink Vanity", "Modern double sink vanity with marble countertop.", "bathroom/bathroom-vanities", 801, "Bathroom Essentials", "style", [
    ["Double Sink Vanity", "BAT-VAN-039", null, null, 950, 2299, 1899, {h:85,l:150,w:55,wt:70}, "furniture", []]
  ], true, true],
  ["Mirror Medicine Cabinet", "Wall-mounted medicine cabinet with mirrored door.", "bathroom/medicine-cabinets", 802, "Bathroom Essentials", "style", [
    ["Mirror Medicine Cabinet", "BAT-MED-040", null, null, 150, 299, 299, {h:70,l:50,w:15,wt:8}, "furniture", []]
  ], false, false],
  ["Tall Linen Cabinet", "Tall storage cabinet for towels and linens.", "bathroom/linen-cabinets", 803, "Bathroom Storage", "style", [
    ["Tall Linen Cabinet", "BAT-LIN-041", null, null, 250, 599, 499, {h:180,l:40,w:40,wt:30}, "furniture", []]
  ], false, false],
  ["Over-Toilet Storage Rack", "Space-saving storage rack that fits over the toilet.", "bathroom/bathroom-shelving", 804, "Bathroom Storage", "style", [
    ["Over-Toilet Storage Rack", "BAT-SHE-042", null, null, 75, 149, 149, {h:170,l:65,w:25,wt:8}, "furniture", []]
  ], true, false],
];

// ─── Build Wondersign-format products ─────────────────────────────────
let variantIndex = 1;

const products = productDefs.map(([name, description, catPath, catId, collection, variantKey, variants, isNew, isFeatured]) => {
  const catObj = categories.find(c => c.path === catPath);

  const builtVariants = variants.map(([vName, sku, colorName, hexVal, cost, listPrice, retailPrice, dims, productType, options]) => {
    const id = generateProductId(variantIndex++);
    const variant = {
      attributes: [],
      categories: [{ imageUrl: catObj?.imageUrl || '', path: catPath }],
      changedState: 'created',
      consumerBrand: 'LiviPoint',
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      custom: { isNew, isFeatured, categoryId: catId },
      customerSku: sku,
      deletedAt: null,
      description: vName,
      dimensions: {
        height: dims.h,
        length: dims.l,
        unitOfMeasureDistance: 'cm',
        unitOfMeasureWeight: 'kg',
        weight: dims.wt,
        width: dims.w
      },
      introducedAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
      isDirectShipping: false,
      isInCatalog: 'included',
      isPackage: false,
      isSoldIndividually: true,
      name: vName,
      packageProducts: [],
      packageProductType: null,
      packaging: {
        dimensions: { height: dims.h + 10, length: dims.l + 10, width: dims.w + 10 },
        dimensionsUnitOfMeasure: 'cm',
        purchaseUnitOfMeasure: 1,
        quantityForSale: 1,
        quantityPerPackage: 1,
        type: 'carton',
        weight: dims.wt + 5,
        weightUnitOfMeasure: 'kg'
      },
      price: { cost, listPrice, mapPrice: retailPrice, msrpPrice: listPrice, rates: [], rentalPrices: [], retailPrice },
      productId: id,
      productType,
      rank: variantIndex * 5,
      sku,
      upc: '1234567890' + String(variantIndex).padStart(2, '0'),
      updatedAt: new Date().toISOString(),
      options: options.map(([option, value]) => ({ option, value }))
    };

    // Add color attributes if present
    if (colorName) {
      variant.attributes.push({
        attribute: 'color',
        normalizedValues: [{
          categoryName: colorName,
          commonName: colorName,
          departmentName: catPath.split('/')[0],
          hexValue: hexVal,
          value: colorName.split(' ').pop()
        }],
        values: [colorName]
      });
    }

    return variant;
  });

  return {
    brand: 'LiviPoint Collection',
    categories: [{ imageUrl: catObj?.imageUrl || '', path: catPath }],
    collection,
    consumerBrand: 'LiviPoint',
    description,
    name,
    provider: 'LiviPoint Furniture Co.',
    relatedProducts: { completeYourCollection: [], crossSell: [], series: [] },
    updatedAt: new Date().toISOString(),
    media: {
      mainImages: builtVariants.map(v => ({ variantProductIds: [v.productId], url: catObj?.imageUrl || '' })),
      additionalImages: [],
      videoUrls: []
    },
    variantKey,
    variants: builtVariants
  };
});

// ─── Build inventory data ─────────────────────────────────────────────
const inventory = [];
for (const product of products) {
  for (const variant of product.variants) {
    inventory.push({
      availableQuantity: 5 + Math.floor(Math.random() * 35),
      brand: product.brand,
      inStock: true,
      nextAvailableDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      nextAvailableQuantity: 10 + Math.floor(Math.random() * 40),
      locations: [{
        currentQuantity: 5 + Math.floor(Math.random() * 20),
        futureAvailabilityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        futureQuantity: 10 + Math.floor(Math.random() * 30),
        locationName: 'Main Warehouse',
        locationType: 'local'
      }],
      provider: product.provider,
      sku: variant.sku
    });
  }
}

// ─── Write JSON files ─────────────────────────────────────────────────
const seedDir = resolve(__dirname, '../../prisma/seed-data');

writeFileSync(
  resolve(seedDir, 'wondersign-products.json'),
  JSON.stringify(products, null, 2)
);

writeFileSync(
  resolve(seedDir, 'wondersign-inventory.json'),
  JSON.stringify(inventory, null, 2)
);

writeFileSync(
  resolve(seedDir, 'wondersign-categories.json'),
  JSON.stringify(categories, null, 2)
);

console.log(`✅ Generated seed data:`);
console.log(`   ${products.length} products`);
console.log(`   ${inventory.length} inventory entries`);
console.log(`   ${categories.length} categories`);
console.log(`   → prisma/seed-data/wondersign-products.json`);
console.log(`   → prisma/seed-data/wondersign-inventory.json`);
console.log(`   → prisma/seed-data/wondersign-categories.json`);

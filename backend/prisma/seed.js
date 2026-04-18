import { PrismaClient } from '../src/generated/prisma/index.js';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL || process.env.DATABASE_URL,
});

const categories = [
  { key: 1,   name: "Living Room",          slug: "living-room",          imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800", parentKey: null, sortOrder: 1 },
  { key: 101, name: "Sofas & Couches",       slug: "sofas-couches",        imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600",   parentKey: 1,    sortOrder: 1 },
  { key: 102, name: "Chairs & Recliners",    slug: "chairs-recliners",     imageUrl: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=600", parentKey: 1,    sortOrder: 2 },
  { key: 103, name: "Coffee Tables",         slug: "coffee-tables",        imageUrl: "https://images.unsplash.com/photo-1611269154421-4e27233ac5c7?w=600", parentKey: 1,    sortOrder: 3 },
  { key: 104, name: "TV Stands & Media",     slug: "tv-stands-media",      imageUrl: "https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?w=600", parentKey: 1,    sortOrder: 4 },
  { key: 105, name: "Bookcases & Storage",   slug: "bookcases-storage",    imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600", parentKey: 1,    sortOrder: 5 },
  { key: 2,   name: "Bedroom",               slug: "bedroom",              imageUrl: "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800", parentKey: null, sortOrder: 2 },
  { key: 201, name: "Beds & Frames",         slug: "beds-frames",          imageUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600", parentKey: 2,    sortOrder: 1 },
  { key: 202, name: "Nightstands",           slug: "nightstands",          imageUrl: "https://images.unsplash.com/photo-1595428773937-78b4b8b39f7d?w=600", parentKey: 2,    sortOrder: 2 },
  { key: 203, name: "Dressers & Chests",     slug: "dressers-chests",      imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600", parentKey: 2,    sortOrder: 3 },
  { key: 204, name: "Wardrobes & Armoires",  slug: "wardrobes-armoires",   imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600",   parentKey: 2,    sortOrder: 4 },
  { key: 205, name: "Vanities & Mirrors",    slug: "vanities-mirrors",     imageUrl: "https://images.unsplash.com/photo-1595514535116-8f0c1c26d904?w=600", parentKey: 2,    sortOrder: 5 },
  { key: 3,   name: "Dining Room",           slug: "dining-room",          imageUrl: "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800", parentKey: null, sortOrder: 3 },
  { key: 301, name: "Dining Tables",         slug: "dining-tables",        imageUrl: "https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?w=600", parentKey: 3,    sortOrder: 1 },
  { key: 302, name: "Dining Chairs",         slug: "dining-chairs",        imageUrl: "https://images.unsplash.com/photo-1503602642458-232111445657?w=600", parentKey: 3,    sortOrder: 2 },
  { key: 303, name: "Bar Stools",            slug: "bar-stools",           imageUrl: "https://images.unsplash.com/photo-1595428773937-78b4b8b39f7d?w=600", parentKey: 3,    sortOrder: 3 },
  { key: 304, name: "Buffets & Sideboards",  slug: "buffets-sideboards",   imageUrl: "https://images.unsplash.com/photo-1595514518526-0e1fb42b7a63?w=600", parentKey: 3,    sortOrder: 4 },
  { key: 305, name: "China Cabinets",        slug: "china-cabinets",       imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600", parentKey: 3,    sortOrder: 5 },
  { key: 4,   name: "Office",                slug: "office",               imageUrl: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800", parentKey: null, sortOrder: 4 },
  { key: 401, name: "Desks",                 slug: "desks",                imageUrl: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600", parentKey: 4,    sortOrder: 1 },
  { key: 402, name: "Office Chairs",         slug: "office-chairs",        imageUrl: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=600", parentKey: 4,    sortOrder: 2 },
  { key: 403, name: "Filing Cabinets",       slug: "filing-cabinets",      imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600", parentKey: 4,    sortOrder: 3 },
  { key: 404, name: "Bookcases",             slug: "office-bookcases",     imageUrl: "https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?w=600", parentKey: 4,    sortOrder: 4 },
  { key: 405, name: "Office Storage",        slug: "office-storage",       imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600", parentKey: 4,    sortOrder: 5 },
  { key: 5,   name: "Outdoor",               slug: "outdoor",              imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800", parentKey: null, sortOrder: 5 },
  { key: 501, name: "Patio Seating",         slug: "patio-seating",        imageUrl: "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=600", parentKey: 5,    sortOrder: 1 },
  { key: 502, name: "Outdoor Dining",        slug: "outdoor-dining",       imageUrl: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600", parentKey: 5,    sortOrder: 2 },
  { key: 503, name: "Loungers & Daybeds",    slug: "loungers-daybeds",     imageUrl: "https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=600", parentKey: 5,    sortOrder: 3 },
  { key: 504, name: "Umbrellas & Shade",     slug: "umbrellas-shade",      imageUrl: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=600", parentKey: 5,    sortOrder: 4 },
  { key: 6,   name: "Lighting",              slug: "lighting",             imageUrl: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800", parentKey: null, sortOrder: 6 },
  { key: 601, name: "Floor Lamps",           slug: "floor-lamps",          imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600", parentKey: 6,    sortOrder: 1 },
  { key: 602, name: "Table Lamps",           slug: "table-lamps",          imageUrl: "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=600", parentKey: 6,    sortOrder: 2 },
  { key: 603, name: "Chandeliers",           slug: "chandeliers",          imageUrl: "https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=600", parentKey: 6,    sortOrder: 3 },
  { key: 604, name: "Pendant Lights",        slug: "pendant-lights",       imageUrl: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600", parentKey: 6,    sortOrder: 4 },
  { key: 7,   name: "Kids Room",             slug: "kids-room",            imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",   parentKey: null, sortOrder: 7 },
  { key: 701, name: "Kids Beds",             slug: "kids-beds",            imageUrl: "https://images.unsplash.com/photo-1595428773937-78b4b8b39f7d?w=600", parentKey: 7,    sortOrder: 1 },
  { key: 702, name: "Kids Storage",          slug: "kids-storage",         imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600", parentKey: 7,    sortOrder: 2 },
  { key: 703, name: "Kids Desks",            slug: "kids-desks",           imageUrl: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600", parentKey: 7,    sortOrder: 3 },
  { key: 704, name: "Kids Seating",          slug: "kids-seating",         imageUrl: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=600", parentKey: 7,    sortOrder: 4 },
  { key: 8,   name: "Bathroom",              slug: "bathroom",             imageUrl: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800",   parentKey: null, sortOrder: 8 },
  { key: 801, name: "Vanities",              slug: "bathroom-vanities",    imageUrl: "https://images.unsplash.com/photo-1595514535116-8f0c1c26d904?w=600", parentKey: 8,    sortOrder: 1 },
  { key: 802, name: "Medicine Cabinets",     slug: "medicine-cabinets",    imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600", parentKey: 8,    sortOrder: 2 },
  { key: 803, name: "Linen Cabinets",        slug: "linen-cabinets",       imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600", parentKey: 8,    sortOrder: 3 },
  { key: 804, name: "Bathroom Shelving",     slug: "bathroom-shelving",    imageUrl: "https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?w=600", parentKey: 8,    sortOrder: 4 },
];

// [name, description, categoryKey, collection, variantKey, variants[], isNew, isFeatured]
// variant: [name, sku, cost, listPrice, retailPrice, dims{h,l,w,wt}, productType, options[]]
const productDefs = [
  ["Modern Velvet Sofa", "Luxurious velvet sofa with deep seating and brass legs.", 101, "Modern Living 2024", "color", [
    ["Modern Velvet Sofa - Navy Blue",     "SOF-VEL-001-NAV", 1200, 3299, 2498, {h:85,l:220,w:95,wt:45}, "sofa", [["Color","Navy Blue"]]],
    ["Modern Velvet Sofa - Emerald Green", "SOF-VEL-001-EME", 1200, 3299, 2498, {h:85,l:220,w:95,wt:45}, "sofa", [["Color","Emerald Green"]]],
    ["Modern Velvet Sofa - Charcoal Grey", "SOF-VEL-001-CHA", 1200, 3299, 2498, {h:85,l:220,w:95,wt:45}, "sofa", [["Color","Charcoal Grey"]]],
  ], true, true],
  ["Scandinavian Sectional", "L-shaped sectional with clean lines and natural oak legs.", 101, "Nordic Collection", "style", [
    ["Scandinavian Sectional - Light Grey", "SOF-SCA-002", 1500, 4499, 3499, {h:80,l:280,w:180,wt:65}, "sofa", []],
  ], true, true],
  ["Classic Leather Recliner", "Full-grain leather recliner with built-in footrest.", 102, "Classic Comfort", "style", [
    ["Classic Leather Recliner", "CHR-REC-003", 800, 1999, 1499, {h:100,l:90,w:85,wt:35}, "chair", []],
  ], false, true],
  ["Mid-Century Accent Chair", "Iconic mid-century design with walnut wood frame.", 102, "Mid-Century Modern", "color", [
    ["Mid-Century Accent Chair", "CHR-MID-004", 350, 899, 699, {h:80,l:70,w:72,wt:12}, "chair", []],
  ], true, false],
  ["Minimalist Coffee Table", "Tempered glass top with brushed steel frame.", 103, "Modern Living 2024", "style", [
    ["Minimalist Coffee Table", "TAB-MIN-005", 200, 599, 449, {h:45,l:120,w:60,wt:18}, "table", []],
  ], false, true],
  ["Rustic Oak Coffee Table", "Solid oak construction with natural grain finish.", 103, "Rustic Heritage", "style", [
    ["Rustic Oak Coffee Table", "TAB-RUS-006", 300, 799, 599, {h:48,l:130,w:70,wt:25}, "table", []],
  ], false, false],
  ["Modern TV Console", "Floating-style TV stand with cable management.", 104, "Modern Living 2024", "style", [
    ["Modern TV Console", "TV-MOD-007", 400, 999, 799, {h:50,l:180,w:45,wt:30}, "furniture", []],
  ], true, false],
  ["Tall Bookcase", "Five-shelf bookcase in solid walnut.", 105, "Classic Comfort", "style", [
    ["Tall Bookcase", "BOO-TAL-008", 250, 699, 549, {h:200,l:90,w:35,wt:28}, "furniture", []],
  ], false, false],
  ["Upholstered Platform Bed", "Upholstered headboard with sturdy platform base.", 201, "Bedroom Essentials", "size", [
    ["Upholstered Platform Bed - Queen", "BED-UPH-009-QUE", 600, 1599, 1199, {h:120,l:210,w:160,wt:40}, "bed", [["Size","Queen"]]],
    ["Upholstered Platform Bed - King",  "BED-UPH-009-KIN", 750, 1899, 1399, {h:120,l:210,w:195,wt:50}, "bed", [["Size","King"]]],
  ], true, true],
  ["Metal Frame Bed", "Industrial-style metal frame bed.", 201, "Industrial Collection", "style", [
    ["Metal Frame Bed", "BED-MET-010", 300, 799, 599, {h:110,l:210,w:160,wt:25}, "bed", []],
  ], false, false],
  ["Vintage Dresser", "Six-drawer dresser with antique brass hardware.", 203, "Vintage Collection", "style", [
    ["Vintage Dresser", "DRE-VIN-011", 450, 1199, 899, {h:85,l:140,w:50,wt:35}, "furniture", []],
  ], false, true],
  ["Floating Nightstand", "Wall-mounted nightstand with drawer.", 202, "Modern Living 2024", "style", [
    ["Floating Nightstand", "NIG-FLO-012", 100, 299, 229, {h:20,l:45,w:35,wt:5}, "furniture", []],
  ], true, false],
  ["Sliding Door Wardrobe", "Spacious wardrobe with mirrored sliding doors.", 204, "Bedroom Essentials", "style", [
    ["Sliding Door Wardrobe", "WAR-SLI-013", 700, 1899, 1499, {h:220,l:180,w:65,wt:80}, "furniture", []],
  ], false, false],
  ["L-Shaped Desk", "Corner desk with built-in cable management.", 401, "Office Pro", "style", [
    ["L-Shaped Desk", "DES-L-014", 350, 899, 699, {h:75,l:160,w:140,wt:30}, "desk", []],
  ], true, true],
  ["Extendable Dining Table", "Extends from 6 to 8 seating.", 301, "Dining Collection", "style", [
    ["Extendable Dining Table", "DIN-EXT-015", 750, 1899, 1499, {h:75,l:200,w:95,wt:60}, "table", [["Extended Length","220cm"],["Seating","6-8"]]],
  ], false, true],
  ["Upholstered Dining Chair", "Set of 2 dining chairs with velvet upholstery.", 302, "Dining Collection", "style", [
    ["Upholstered Dining Chair", "DIN-UPH-016", 150, 399, 299, {h:90,l:50,w:55,wt:8}, "chair", []],
  ], true, false],
  ["Rustic Buffet Server", "Solid wood buffet with wine storage.", 304, "Rustic Heritage", "style", [
    ["Rustic Buffet Server", "BUF-RUS-017", 500, 1299, 999, {h:90,l:160,w:45,wt:40}, "furniture", []],
  ], false, false],
  ["Pendant Floor Lamp", "Arched floor lamp with fabric shade.", 601, "Lighting Collection", "style", [
    ["Pendant Floor Lamp", "PEN-FLO-018", 120, 299, 249, {h:180,l:40,w:40,wt:6}, "lighting", []],
  ], true, false],
  ["Glass Side Table", "Tempered glass side table with gold frame.", 103, "Modern Living 2024", "style", [
    ["Glass Side Table", "TAB-GLA-019", 80, 199, 149, {h:55,l:45,w:45,wt:5}, "table", []],
  ], false, false],
  ["Marble Console Table", "Marble top console for entryways.", 105, "Luxe Collection", "style", [
    ["Marble Console Table", "CON-MAR-020", 400, 999, 799, {h:80,l:120,w:35,wt:30}, "table", []],
  ], false, true],
  ["Outdoor Sectional Sofa", "Weather-resistant sectional for patio.", 501, "Outdoor Living", "style", [
    ["Outdoor Sectional Sofa", "OUT-SEC-026", 1200, 2999, 2499, {h:70,l:250,w:200,wt:55}, "sofa", []],
  ], true, true],
  ["Outdoor Bistro Set", "Two chairs and table for balcony.", 502, "Outdoor Living", "style", [
    ["Outdoor Bistro Set", "OUT-BIS-027", 200, 499, 399, {h:75,l:60,w:60,wt:12}, "furniture", []],
  ], false, false],
  ["Outdoor Dining Table", "Teak dining table, seats 6.", 502, "Outdoor Living", "style", [
    ["Outdoor Dining Table", "OUT-DIN-028", 600, 1499, 1199, {h:75,l:180,w:90,wt:35}, "table", []],
  ], false, true],
  ["Outdoor Chaise Lounge", "Adjustable chaise with cushion.", 503, "Outdoor Living", "style", [
    ["Outdoor Chaise Lounge", "OUT-CHA-029", 300, 699, 549, {h:35,l:200,w:70,wt:15}, "furniture", []],
  ], true, false],
  ["Ergonomic Office Chair", "Mesh back chair with lumbar support.", 402, "Office Pro", "color", [
    ["Ergonomic Office Chair", "OFF-ERG-032", 300, 799, 599, {h:115,l:65,w:65,wt:14}, "chair", []],
  ], true, true],
  ["Standing Desk", "Electric height-adjustable desk.", 401, "Office Pro", "style", [
    ["Standing Desk", "OFF-STA-033", 450, 1199, 899, {h:125,l:150,w:75,wt:35}, "desk", []],
  ], true, false],
  ["Double Sink Vanity", "Modern double sink vanity with marble countertop.", 801, "Bathroom Essentials", "style", [
    ["Double Sink Vanity", "BAT-VAN-039", 950, 2299, 1899, {h:85,l:150,w:55,wt:70}, "furniture", []],
  ], true, true],
  ["Kids Study Desk", "Adjustable height desk that grows with your child.", 703, "Kids Collection", "style", [
    ["Kids Study Desk", "KID-DES-037", 175, 449, 349, {h:75,l:100,w:60,wt:15}, "desk", []],
  ], false, false],
  ["Kids Bean Bag Chair", "Comfortable bean bag chair in fun colors.", 704, "Kids Collection", "style", [
    ["Kids Bean Bag Chair", "KID-BEA-038", 50, 99, 99, {h:70,l:80,w:80,wt:3}, "chair", []],
  ], false, false],
];

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Admin user ───────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@123456', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@furnitureshop.com' },
    update: {},
    create: {
      email: 'admin@furnitureshop.com',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // ─── Vendor user + profile ─────────────────────────────────
  const vendorPassword = await bcrypt.hash('Vendor@123456', 10);
  const vendorUser = await prisma.user.upsert({
    where: { email: 'vendor@furnitureshop.com' },
    update: {},
    create: {
      email: 'vendor@furnitureshop.com',
      passwordHash: vendorPassword,
      firstName: 'Demo',
      lastName: 'Vendor',
      role: 'VENDOR',
    },
  });

  const vendor = await prisma.vendor.upsert({
    where: { userId: vendorUser.id },
    update: {},
    create: {
      userId: vendorUser.id,
      businessName: 'Furniture Shop',
      description: 'Premium furniture for every room.',
      status: 'APPROVED',
      commissionRate: 0.06,
    },
  });
  console.log('✅ Vendor created:', vendor.businessName);

  // ─── Customer user ─────────────────────────────────────────
  const customerPassword = await bcrypt.hash('Customer@123456', 10);
  const customerUser = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      email: 'customer@example.com',
      passwordHash: customerPassword,
      firstName: 'Demo',
      lastName: 'Customer',
      role: 'CUSTOMER',
    },
  });
  await prisma.customer.upsert({
    where: { userId: customerUser.id },
    update: {},
    create: { userId: customerUser.id },
  });
  console.log('✅ Customer created:', customerUser.email);

  // ─── Categories (parents first, then children) ─────────────
  const categoryIdMap = {};
  const parents = categories.filter(c => c.parentKey === null);
  const children = categories.filter(c => c.parentKey !== null);

  for (const cat of parents) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, imageUrl: cat.imageUrl, sortOrder: cat.sortOrder },
      create: { name: cat.name, slug: cat.slug, imageUrl: cat.imageUrl, sortOrder: cat.sortOrder },
    });
    categoryIdMap[cat.key] = created.id;
  }

  for (const cat of children) {
    const parentId = categoryIdMap[cat.parentKey];
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, imageUrl: cat.imageUrl, sortOrder: cat.sortOrder, parentId },
      create: { name: cat.name, slug: cat.slug, imageUrl: cat.imageUrl, sortOrder: cat.sortOrder, parentId },
    });
    categoryIdMap[cat.key] = created.id;
  }
  console.log(`✅ ${categories.length} categories seeded`);

  // ─── Products + Variants ───────────────────────────────────
  let productCount = 0;
  let variantCount = 0;

  for (const [name, description, categoryKey, collection, variantKey, variants, isNew, isFeatured] of productDefs) {
    const slug = slugify(name);
    const categoryId = categoryIdMap[categoryKey];
    const firstVariant = variants[0];
    const retailPrices = variants.map(v => v[4]);
    const minPrice = Math.min(...retailPrices);
    const maxPrice = Math.max(...retailPrices);
    const mainImage = `https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800`;

    const product = await prisma.product.upsert({
      where: { slug },
      update: {},
      create: {
        vendorId: vendor.id,
        categoryId,
        name,
        slug,
        description,
        collection,
        variantKey,
        minPrice,
        maxPrice,
        totalStock: variants.length * 50,
        mainImage,
        isFeatured,
        isNew,
        isActive: true,
        source: 'MANUAL',
        media: {
          mainImages: [{ url: mainImage, variantProductIds: [] }],
          additionalImages: [],
          videoUrls: [],
        },
      },
    });

    for (const [vName, sku, cost, listPrice, retailPrice, dims, productType, options] of variants) {
      await prisma.productVariant.upsert({
        where: { sku },
        update: {},
        create: {
          productId: product.id,
          name: vName,
          sku,
          productType,
          stockQuantity: 50,
          price: { cost, listPrice, retailPrice, msrpPrice: listPrice },
          dimensions: { height: dims.h, length: dims.l, width: dims.w, weight: dims.wt, unitOfMeasureDistance: 'cm', unitOfMeasureWeight: 'kg' },
          options: options.map(([option, value]) => ({ option, value })),
          isActive: true,
          status: 'Active',
        },
      });
      variantCount++;
    }

    // Create storefront listing so product appears in public API
    await prisma.storefrontListing.upsert({
      where: { productId: product.id },
      update: {},
      create: {
        productId: product.id,
        categoryId,
        isPublished: true,
        isOnSale: false,
        isTrending: isFeatured,
        isNewArrival: isNew,
        sortOrder: productCount,
      },
    });

    productCount++;
  }

  console.log(`✅ ${productCount} products and ${variantCount} variants seeded`);
  console.log('\n🎉 Seed complete!');
  console.log('   Admin:    admin@furnitureshop.com    / Admin@123456');
  console.log('   Vendor:   vendor@furnitureshop.com  / Vendor@123456');
  console.log('   Customer: customer@example.com      / Customer@123456');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

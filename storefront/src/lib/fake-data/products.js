// Expanded Products Data - 50+ products covering all subcategories

export const products = [
  // LIVING ROOM - Sofas & Couches (101)
  {
    id: 1,
    name: "Modern Velvet Sofa",
    slug: "modern-velvet-sofa",
    description: "Luxurious velvet upholstery with deep cushions and contemporary design. Features solid wood frame and durable construction for everyday comfort.",
    shortDescription: "Luxurious velvet sofa with contemporary design",
    price: 2498,
    compareAtPrice: 3299,
    sku: "SOF-VEL-001",
    categoryId: 101,
    category: { id: 101, name: "Sofas & Couches", slug: "sofas-couches" },
    stockQuantity: 8,
    images: [
      { id: 1, imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800", displayOrder: 1 },
      { id: 2, imageUrl: "https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=800", displayOrder: 2 },
      { id: 3, imageUrl: "https://images.unsplash.com/photo-1550254478-ead40cc54513?w=800", displayOrder: 3 }
    ],
    isNew: true,
    isOnSale: true,
    isFeatured: true,
    specifications: {
      "Dimensions": "220cm W x 90cm D x 85cm H",
      "Seating Capacity": "3-4 people",
      "Material": "Velvet upholstery, solid wood frame",
      "Color Options": "Navy, Emerald, Charcoal",
      "Assembly": "Minimal assembly required",
      "Warranty": "2 years"
    },
    variants: [
      { id: 1, name: "Navy Blue", sku: "SOF-VEL-001-NAV" },
      { id: 2, name: "Emerald Green", sku: "SOF-VEL-001-EME" },
      { id: 3, name: "Charcoal Grey", sku: "SOF-VEL-001-CHA" }
    ]
  },

  {
    id: 2,
    name: "Scandinavian 3-Seater Sofa",
    slug: "scandinavian-3-seater-sofa",
    description: "Clean lines and minimalist design define this beautiful Scandinavian-inspired sofa. Perfect for modern living spaces.",
    shortDescription: "Minimalist Scandinavian design sofa",
    price: 1899,
    compareAtPrice: null,
    sku: "SOF-SCA-002",
    categoryId: 101,
    category: { id: 101, name: "Sofas & Couches", slug: "sofas-couches" },
    stockQuantity: 12,
    images: [
      { id: 4, imageUrl: "https://images.unsplash.com/photo-1550254478-ead40cc54513?w=800", displayOrder: 1 },
      { id: 5, imageUrl: "https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=800", displayOrder: 2 }
    ],
    isNew: false,
    isOnSale: false,
    isFeatured: true,
    specifications: {
      "Dimensions": "200cm W x 85cm D x 80cm H",
      "Material": "Linen blend fabric",
      "Color": "Light Grey",
      "Leg Material": "Solid oak wood"
    }
  },

  // LIVING ROOM - Chairs & Recliners (102)
  {
    id: 3,
    name: "Leather Recliner Chair",
    slug: "leather-recliner-chair",
    description: "Ultimate comfort with genuine leather upholstery and smooth reclining mechanism. Perfect for relaxation.",
    shortDescription: "Genuine leather recliner with smooth mechanism",
    price: 1299,
    compareAtPrice: 1599,
    sku: "CHR-REC-003",
    categoryId: 102,
    category: { id: 102, name: "Chairs & Recliners", slug: "chairs-recliners" },
    stockQuantity: 15,
    images: [
      { id: 6, imageUrl: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800", displayOrder: 1 }
    ],
    isNew: false,
    isOnSale: true,
    isFeatured: false,
    specifications: {
      "Material": "Genuine leather",
      "Reclining Positions": "3 positions",
      "Weight Capacity": "150kg"
    }
  },

  {
    id: 4,
    name: "Mid-Century Accent Chair",
    slug: "mid-century-accent-chair",
    description: "Iconic mid-century modern design with walnut legs and comfortable cushioning.",
    shortDescription: "Classic mid-century modern accent chair",
    price: 599,
    compareAtPrice: null,
    sku: "CHR-MID-004",
    categoryId: 102,
    category: { id: 102, name: "Chairs & Recliners", slug: "chairs-recliners" },
    stockQuantity: 20,
    images: [
      { id: 7, imageUrl: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800", displayOrder: 1 }
    ],
    isNew: true,
    isOnSale: false,
    isFeatured: true
  },

  // LIVING ROOM - Coffee Tables (103)
  {
    id: 5,
    name: "Minimalist Coffee Table",
    slug: "minimalist-coffee-table",
    description: "Sleek glass top with elegant marble base. A stunning centerpiece for any modern living room.",
    shortDescription: "Glass and marble contemporary table",
    price: 899,
    compareAtPrice: 1199,
    sku: "TAB-MIN-005",
    categoryId: 103,
    category: { id: 103, name: "Coffee Tables", slug: "coffee-tables" },
    stockQuantity: 10,
    images: [
      { id: 8, imageUrl: "https://images.unsplash.com/photo-1611269154421-4e27233ac5c7?w=800", displayOrder: 1 }
    ],
    isNew: false,
    isOnSale: true,
    isFeatured: false,
    specifications: {
      "Dimensions": "120cm W x 60cm D x 45cm H",
      "Top Material": "Tempered glass",
      "Base Material": "Marble"
    }
  },

  {
    id: 6,
    name: "Rustic Wood Coffee Table",
    slug: "rustic-wood-coffee-table",
    description: "Solid reclaimed wood with natural finish. Features lower shelf for additional storage.",
    shortDescription: "Reclaimed wood table with storage",
    price: 749,
    compareAtPrice: null,
    sku: "TAB-RUS-006",
    categoryId: 103,
    category: { id: 103, name: "Coffee Tables", slug: "coffee-tables" },
    stockQuantity: 18,
    images: [
      { id: 9, imageUrl: "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800", displayOrder: 1 }
    ],
    isNew: false,
    isOnSale: false,
    isFeatured: false
  },

  // LIVING ROOM - TV Stands (104)
  {
    id: 7,
    name: "Modern TV Stand",
    slug: "modern-tv-stand",
    description: "Contemporary media console with ample storage and cable management. Supports TVs up to 65 inches.",
    shortDescription: "Contemporary media console",
    price: 699,
    compareAtPrice: 899,
    sku: "TV-MOD-007",
    categoryId: 104,
    category: { id: 104, name: "TV Stands & Media", slug: "tv-stands-media" },
    stockQuantity: 14,
    images: [
      { id: 10, imageUrl: "https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?w=800", displayOrder: 1 }
    ],
    isNew: true,
    isOnSale: true,
    isFeatured: true,
    specifications: {
      "Max TV Size": "65 inches",
      "Storage": "3 drawers, 2 cabinets",
      "Cable Management": "Yes"
    }
  },

  // LIVING ROOM - Bookcases & Storage (105)
  {
    id: 8,
    name: "Tall Bookcase",
    slug: "tall-bookcase",
    description: "Five-tier open shelving unit in oak finish. Perfect for books, plants, and decorative items.",
    shortDescription: "Five-tier open shelving unit",
    price: 499,
    compareAtPrice: null,
    sku: "BOO-TAL-008",
    categoryId: 105,
    category: { id: 105, name: "Bookcases & Storage", slug: "bookcases-storage" },
    stockQuantity: 25,
    images: [
      { id: 11, imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800", displayOrder: 1 }
    ],
    isNew: false,
    isOnSale: false,
    isFeatured: false
  },

  // BEDROOM - Beds & Frames (201)
  {
    id: 9,
    name: "Upholstered Platform Bed",
    slug: "upholstered-platform-bed",
    description: "Elegant upholstered bed with tufted headboard and sturdy platform base. No box spring required.",
    shortDescription: "Tufted headboard platform bed",
    price: 1899,
    compareAtPrice: 2499,
    sku: "BED-UPH-009",
    categoryId: 201,
    category: { id: 201, name: "Beds & Frames", slug: "beds-frames" },
    stockQuantity: 6,
    images: [
      { id: 12, imageUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800", displayOrder: 1 }
    ],
    isNew: true,
    isOnSale: true,
    isFeatured: true,
    specifications: {
      "Size": "Queen",
      "Material": "Linen upholstery, solid wood frame",
      "Headboard Height": "120cm"
    },
    variants: [
      { id: 4, name: "Queen", sku: "BED-UPH-009-QUE" },
      { id: 5, name: "King", sku: "BED-UPH-009-KIN" }
    ]
  },

  {
    id: 10,
    name: "Modern Metal Bed Frame",
    slug: "modern-metal-bed-frame",
    description: "Sleek metal frame with minimalist design. Durable construction with easy assembly.",
    shortDescription: "Minimalist metal bed frame",
    price: 799,
    compareAtPrice: null,
    sku: "BED-MET-010",
    categoryId: 201,
    category: { id: 201, name: "Beds & Frames", slug: "beds-frames" },
    stockQuantity: 16,
    images: [
      { id: 13, imageUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800", displayOrder: 1 }
    ],
    isNew: false,
    isOnSale: false,
    isFeatured: false
  },

  // BEDROOM - Nightstands (202)
  {
    id: 11,
    name: "Two-Drawer Nightstand",
    slug: "two-drawer-nightstand",
    description: "Compact nightstand with two drawers and modern hardware. Perfect bedside companion.",
    shortDescription: "Compact two-drawer nightstand",
    price: 299,
    compareAtPrice: 399,
    sku: "NIG-TWO-011",
    categoryId: 202,
    category: { id: 202, name: "Nightstands", slug: "nightstands" },
    stockQuantity: 30,
    images: [
      { id: 14, imageUrl: "https://images.unsplash.com/photo-1595428773937-78b4b8b39f7d?w=800", displayOrder: 1 }
    ],
    isNew: false,
    isOnSale: true,
    isFeatured: false
  },

  // BEDROOM - Dressers & Chests (203)
  {
    id: 12,
    name: "Six-Drawer Dresser",
    slug: "six-drawer-dresser",
    description: "Spacious dresser with six drawers for ample clothing storage. Solid wood construction.",
    shortDescription: "Six-drawer solid wood dresser",
    price: 1099,
    compareAtPrice: null,
    sku: "DRE-SIX-012",
    categoryId: 203,
    category: { id: 203, name: "Dressers & Chests", slug: "dressers-chests" },
    stockQuantity: 12,
    images: [
      { id: 15, imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800", displayOrder: 1 }
    ],
    isNew: false,
    isOnSale: false,
    isFeatured: true
  },

  // BEDROOM - Wardrobes & Armoires (204)
  {
    id: 13,
    name: "Large Wardrobe",
    slug: "large-wardrobe",
    description: "Spacious wardrobe with hanging rod and shelves. Perfect for organizing your wardrobe.",
    shortDescription: "Spacious clothing wardrobe",
    price: 1599,
    compareAtPrice: 1999,
    sku: "WAR-LAR-013",
    categoryId: 204,
    category: { id: 204, name: "Wardrobes & Armoires", slug: "wardrobes-armoires" },
    stockQuantity: 5,
    images: [
      { id: 16, imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800", displayOrder: 1 }
    ],
    isNew: false,
    isOnSale: true,
    isFeatured: false
  },

  // BEDROOM - Vanities & Mirrors (205)
  {
    id: 14,
    name: "Makeup Vanity with Mirror",
    slug: "makeup-vanity-mirror",
    description: "Elegant vanity table with large mirror and drawers. Perfect for your beauty routine.",
    shortDescription: "Vanity with mirror and storage",
    price: 899,
    compareAtPrice: null,
    sku: "VAN-MAK-014",
    categoryId: 205,
    category: { id: 205, name: "Vanities & Mirrors", slug: "vanities-mirrors" },
    stockQuantity: 10,
    images: [
      { id: 17, imageUrl: "https://images.unsplash.com/photo-1595514535116-8f0c1c26d904?w=800", displayOrder: 1 }
    ],
    isNew: true,
    isOnSale: false,
    isFeatured: false
  },

  // DINING ROOM - Dining Tables (301)
  {
    id: 15,
    name: "Extendable Dining Table",
    slug: "extendable-dining-table",
    description: "Versatile dining table that extends to accommodate more guests. Solid wood construction.",
    shortDescription: "Extendable solid wood table",
    price: 1499,
    compareAtPrice: 1899,
    sku: "DIN-EXT-015",
    categoryId: 301,
    category: { id: 301, name: "Dining Tables", slug: "dining-tables" },
    stockQuantity: 8,
    images: [
      { id: 18, imageUrl: "https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?w=800", displayOrder: 1 }
    ],
    isNew: false,
    isOnSale: true,
    isFeatured: true,
    specifications: {
      "Extended Length": "180-220cm",
      "Seating": "6-8 people",
      "Material": "Solid oak"
    }
  },

  {
    id: 16,
    name: "Round Dining Table",
    slug: "round-dining-table",
    description: "Beautiful round table perfect for intimate dinners. Pedestal base design.",
    shortDescription: "Round pedestal dining table",
    price: 999,
    compareAtPrice: null,
    sku: "DIN-ROU-016",
    categoryId: 301,
    category: { id: 301, name: "Dining Tables", slug: "dining-tables" },
    stockQuantity: 14,
    images: [
      { id: 19, imageUrl: "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800", displayOrder: 1 }
    ],
    isNew: false,
    isOnSale: false,
    isFeatured: false
  },

  // DINING ROOM - Dining Chairs (302)
  {
    id: 17,
    name: "Upholstered Dining Chair",
    slug: "upholstered-dining-chair",
    description: "Comfortable dining chair with padded seat and back. Sold individually.",
    shortDescription: "Padded dining chair",
    price: 249,
    compareAtPrice: 299,
    sku: "CHA-UPH-017",
    categoryId: 302,
    category: { id: 302, name: "Dining Chairs", slug: "dining-chairs" },
    stockQuantity: 40,
    images: [
      { id: 20, imageUrl: "https://images.unsplash.com/photo-1503602642458-232111445657?w=800", displayOrder: 1 }
    ],
    isNew: false,
    isOnSale: true,
    isFeatured: false
  },

  // DINING ROOM - Bar Stools (303)
  {
    id: 18,
    name: "Modern Bar Stool",
    slug: "modern-bar-stool",
    description: "Adjustable height bar stool with swivel seat. Contemporary design.",
    shortDescription: "Adjustable swivel bar stool",
    price: 199,
    compareAtPrice: null,
    sku: "BAR-MOD-018",
    categoryId: 303,
    category: { id: 303, name: "Bar Stools", slug: "bar-stools" },
    stockQuantity: 25,
    images: [
      { id: 21, imageUrl: "https://images.unsplash.com/photo-1595428773937-78b4b8b39f7d?w=800", displayOrder: 1 }
    ],
    isNew: true,
    isOnSale: false,
    isFeatured: false
  },

  // DINING ROOM - Buffets & Sideboards (304)
  {
    id: 19,
    name: "Rustic Sideboard",
    slug: "rustic-sideboard",
    description: "Beautiful sideboard with sliding doors and ample storage. Perfect for dining room.",
    shortDescription: "Sliding door sideboard",
    price: 1299,
    compareAtPrice: 1599,
    sku: "BUF-RUS-019",
    categoryId: 304,
    category: { id: 304, name: "Buffets & Sideboards", slug: "buffets-sideboards" },
    stockQuantity: 7,
    images: [
      { id: 22, imageUrl: "https://images.unsplash.com/photo-1595514518526-0e1fb42b7a63?w=800", displayOrder: 1 }
    ],
    isNew: false,
    isOnSale: true,
    isFeatured: true
  },

  // DINING ROOM - China Cabinets (305)
  {
    id: 20,
    name: "Glass Door China Cabinet",
    slug: "glass-door-china-cabinet",
    description: "Display cabinet with glass doors and interior lighting. Show off your finest dishware.",
    shortDescription: "Display cabinet with lighting",
    price: 1799,
    compareAtPrice: null,
    sku: "CHI-GLA-020",
    categoryId: 305,
    category: { id: 305, name: "China Cabinets", slug: "china-cabinets" },
    stockQuantity: 4,
    images: [
      { id: 23, imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800", displayOrder: 1 }
    ],
    isNew: true,
    isOnSale: false,
    isFeatured: false
  },

  // OFFICE - Desks (401)
  {
    id: 21,
    name: "L-Shaped Office Desk",
    slug: "l-shaped-office-desk",
    description: "Spacious L-shaped desk with plenty of workspace. Built-in cable management.",
    shortDescription: "L-shaped desk with cable management",
    price: 899,
    compareAtPrice: 1199,
    sku: "DES-LSH-021",
    categoryId: 401,
    category: { id: 401, name: "Desks", slug: "desks" },
    stockQuantity: 11,
    images: [
      { id: 24, imageUrl: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800", displayOrder: 1 }
    ],
    isNew: false,
    isOnSale: true,
    isFeatured: true,
    specifications: {
      "Dimensions": "150cm x 150cm",
      "Material": "Engineered wood",
      "Features": "Cable management, keyboard tray"
    }
  },

  {
    id: 22,
    name: "Standing Desk",
    slug: "standing-desk",
    description: "Adjustable height standing desk with electric motor. Promote better posture and health.",
    shortDescription: "Electric adjustable standing desk",
    price: 1299,
    compareAtPrice: null,
    sku: "DES-STA-022",
    categoryId: 401,
    category: { id: 401, name: "Desks", slug: "desks" },
    stockQuantity: 9,
    images: [
      { id: 25, imageUrl: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800", displayOrder: 1 }
    ],
    isNew: true,
    isOnSale: false,
    isFeatured: true
  },

  // OFFICE - Office Chairs (402)
  {
    id: 23,
    name: "Ergonomic Office Chair",
    slug: "ergonomic-office-chair",
    description: "Premium ergonomic chair with lumbar support and adjustable armrests. Maximum comfort for long work hours.",
    shortDescription: "Ergonomic chair with lumbar support",
    price: 599,
    compareAtPrice: 799,
    sku: "CHA-ERG-023",
    categoryId: 402,
    category: { id: 402, name: "Office Chairs", slug: "office-chairs" },
    stockQuantity: 20,
    images: [
      { id: 26, imageUrl: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=800", displayOrder: 1 }
    ],
    isNew: false,
    isOnSale: true,
    isFeatured: true
  },

  // OFFICE - Filing Cabinets (403)
  {
    id: 24,
    name: "3-Drawer Filing Cabinet",
    slug: "3-drawer-filing-cabinet",
    description: "Lockable filing cabinet with three spacious drawers. Organize your documents efficiently.",
    shortDescription: "Lockable 3-drawer cabinet",
    price: 399,
    compareAtPrice: null,
    sku: "FIL-3DR-024",
    categoryId: 403,
    category: { id: 403, name: "Filing Cabinets", slug: "filing-cabinets" },
    stockQuantity: 15,
    images: [
      { id: 27, imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800", displayOrder: 1 }
    ],
    isNew: false,
    isOnSale: false,
    isFeatured: false
  },

  // OFFICE - Bookcases (404)
  {
    id: 25,
    name: "Industrial Bookshelf",
    slug: "industrial-bookshelf",
    description: "Five-tier industrial style bookshelf with metal frame. Perfect for office or home library.",
    shortDescription: "Industrial metal frame bookshelf",
    price: 549,
    compareAtPrice: 699,
    sku: "BOO-IND-025",
    categoryId: 404,
    category: { id: 404, name: "Bookcases", slug: "office-bookcases" },
    stockQuantity: 18,
    images: [
      { id: 28, imageUrl: "https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?w=800", displayOrder: 1 }
    ],
    isNew: false,
    isOnSale: true,
    isFeatured: false
  },

  // OFFICE - Office Storage (405)
  {
    id: 26,
    name: "Storage Cabinet with Doors",
    slug: "storage-cabinet-doors",
    description: "Versatile storage cabinet with adjustable shelves. Keep your office organized.",
    shortDescription: "Adjustable shelf storage cabinet",
    price: 449,
    compareAtPrice: null,
    sku: "STO-CAB-026",
    categoryId: 405,
    category: { id: 405, name: "Office Storage", slug: "office-storage" },
    stockQuantity: 12,
    images: [
      { id: 29, imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800", displayOrder: 1 }
    ],
    isNew: false,
    isOnSale: false,
    isFeatured: false
  },

  // OUTDOOR - Patio Seating (501)
  {
    id: 27,
    name: "Outdoor Sectional Sofa",
    slug: "outdoor-sectional-sofa",
    description: "Weather-resistant sectional perfect for outdoor entertaining. Includes cushions.",
    shortDescription: "Weather-resistant sectional",
    price: 2299,
    compareAtPrice: 2899,
    sku: "OUT-SEC-027",
    categoryId: 501,
    category: { id: 501, name: "Patio Seating", slug: "patio-seating" },
    stockQuantity: 6,
    images: [
      { id: 30, imageUrl: "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800", displayOrder: 1 }
    ],
    isNew: true,
    isOnSale: true,
    isFeatured: true
  },

  // OUTDOOR - Outdoor Dining (502)
  {
    id: 28,
    name: "Outdoor Dining Set",
    slug: "outdoor-dining-set",
    description: "Complete outdoor dining set for 6. Weather-resistant materials and contemporary design.",
    shortDescription: "6-person outdoor dining set",
    price: 1799,
    compareAtPrice: null,
    sku: "OUT-DIN-028",
    categoryId: 502,
    category: { id: 502, name: "Outdoor Dining", slug: "outdoor-dining" },
    stockQuantity: 5,
    images: [
      { id: 31, imageUrl: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800", displayOrder: 1 }
    ],
    isNew: false,
    isOnSale: false,
    isFeatured: false
  },

  // OUTDOOR - Loungers & Daybeds (503)
  {
    id: 29,
    name: "Outdoor Chaise Lounge",
    slug: "outdoor-chaise-lounge",
    description: "Comfortable chaise lounge with adjustable backrest. Perfect for poolside relaxation.",
    shortDescription: "Adjustable chaise lounge",
    price: 699,
    compareAtPrice: 899,
    sku: "OUT-CHA-029",
    categoryId: 503,
    category: { id: 503, name: "Loungers & Daybeds", slug: "loungers-daybeds" },
    stockQuantity: 10,
    images: [
      { id: 32, imageUrl: "https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=800", displayOrder: 1 }
    ],
    isNew: false,
    isOnSale: true,
    isFeatured: false
  },

  // OUTDOOR - Umbrellas & Shade (504)
  {
    id: 30,
    name: "Cantilever Patio Umbrella",
    slug: "cantilever-patio-umbrella",
    description: "Large cantilever umbrella with 360-degree rotation. UV-resistant fabric.",
    shortDescription: "Rotating cantilever umbrella",
    price: 499,
    compareAtPrice: null,
    sku: "OUT-UMB-030",
    categoryId: 504,
    category: { id: 504, name: "Umbrellas & Shade", slug: "umbrellas-shade" },
    stockQuantity: 15,
    images: [
      { id: 33, imageUrl: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800", displayOrder: 1 }
    ],
    isNew: true,
    isOnSale: false,
    isFeatured: false
  },

  // LIGHTING - Floor Lamps (601)
  {
    id: 31,
    name: "Arc Floor Lamp",
    slug: "arc-floor-lamp",
    description: "Modern arc floor lamp with marble base. Adjustable height and direction.",
    shortDescription: "Adjustable arc lamp with marble base",
    price: 399,
    compareAtPrice: 499,
    sku: "LIG-ARC-031",
    categoryId: 601,
    category: { id: 601, name: "Floor Lamps", slug: "floor-lamps" },
    stockQuantity: 22,
    images: [
      { id: 34, imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800", displayOrder: 1 }
    ],
    isNew: false,
    isOnSale: true,
    isFeatured: false
  },

  // LIGHTING - Table Lamps (602)
  {
    id: 32,
    name: "Ceramic Table Lamp",
    slug: "ceramic-table-lamp",
    description: "Elegant ceramic table lamp with linen shade. Perfect for bedside or desk.",
    shortDescription: "Ceramic lamp with linen shade",
    price: 149,
    compareAtPrice: null,
    sku: "LIG-TAB-032",
    categoryId: 602,
    category: { id: 602, name: "Table Lamps", slug: "table-lamps" },
    stockQuantity: 35,
    images: [
      { id: 35, imageUrl: "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=800", displayOrder: 1 }
    ],
    isNew: false,
    isOnSale: false,
    isFeatured: false
  },

  // LIGHTING - Chandeliers (603)
  {
    id: 33,
    name: "Crystal Chandelier",
    slug: "crystal-chandelier",
    description: "Stunning crystal chandelier with 8 lights. Creates beautiful ambiance and elegance.",
    shortDescription: "8-light crystal chandelier",
    price: 1299,
    compareAtPrice: 1699,
    sku: "LIG-CHA-033",
    categoryId: 603,
    category: { id: 603, name: "Chandeliers", slug: "chandeliers" },
    stockQuantity: 8,
    images: [
      { id: 36, imageUrl: "https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=800", displayOrder: 1 }
    ],
    isNew: true,
    isOnSale: true,
    isFeatured: true
  },

  // LIGHTING - Pendant Lights (604)
  {
    id: 34,
    name: "Modern Pendant Light",
    slug: "modern-pendant-light",
    description: "Minimalist pendant light with geometric design. Perfect for kitchen islands or dining areas.",
    shortDescription: "Geometric pendant light",
    price: 249,
    compareAtPrice: null,
    sku: "LIG-PEN-034",
    categoryId: 604,
    category: { id: 604, name: "Pendant Lights", slug: "pendant-lights" },
    stockQuantity: 28,
    images: [
      { id: 37, imageUrl: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800", displayOrder: 1 }
    ],
    isNew: false,
    isOnSale: false,
    isFeatured: false
  },

  // KIDS ROOM - Kids Beds (701)
  {
    id: 35,
    name: "Twin Bunk Bed",
    slug: "twin-bunk-bed",
    description: "Space-saving bunk bed with safety rails. Perfect for kids' rooms or guest rooms.",
    shortDescription: "Twin bunk bed with safety rails",
    price: 899,
    compareAtPrice: 1099,
    sku: "KID-BUN-035",
    categoryId: 701,
    category: { id: 701, name: "Kids Beds", slug: "kids-beds" },
    stockQuantity: 12,
    images: [
      { id: 38, imageUrl: "https://images.unsplash.com/photo-1595428773937-78b4b8b39f7d?w=800", displayOrder: 1 }
    ],
    isNew: false,
    isOnSale: true,
    isFeatured: false
  },

  // KIDS ROOM - Kids Storage (702)
  {
    id: 36,
    name: "Toy Storage Organizer",
    slug: "toy-storage-organizer",
    description: "Colorful toy organizer with multiple bins. Makes cleanup fun and easy.",
    shortDescription: "Multi-bin toy organizer",
    price: 199,
    compareAtPrice: null,
    sku: "KID-TOY-036",
    categoryId: 702,
    category: { id: 702, name: "Kids Storage", slug: "kids-storage" },
    stockQuantity: 25,
    images: [
      { id: 39, imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800", displayOrder: 1 }
    ],
    isNew: true,
    isOnSale: false,
    isFeatured: false
  },

  // KIDS ROOM - Kids Desks (703)
  {
    id: 37,
    name: "Kids Study Desk",
    slug: "kids-study-desk",
    description: "Adjustable height desk that grows with your child. Includes storage compartments.",
    shortDescription: "Adjustable height kids desk",
    price: 349,
    compareAtPrice: 449,
    sku: "KID-DES-037",
    categoryId: 703,
    category: { id: 703, name: "Kids Desks", slug: "kids-desks" },
    stockQuantity: 18,
    images: [
      { id: 40, imageUrl: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800", displayOrder: 1 }
    ],
    isNew: false,
    isOnSale: true,
    isFeatured: false
  },

  // KIDS ROOM - Kids Seating (704)
  {
    id: 38,
    name: "Kids Bean Bag Chair",
    slug: "kids-bean-bag-chair",
    description: "Comfortable bean bag chair in fun colors. Perfect for reading or gaming.",
    shortDescription: "Colorful bean bag chair",
    price: 99,
    compareAtPrice: null,
    sku: "KID-BEA-038",
    categoryId: 704,
    category: { id: 704, name: "Kids Seating", slug: "kids-seating" },
    stockQuantity: 40,
    images: [
      { id: 41, imageUrl: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800", displayOrder: 1 }
    ],
    isNew: false,
    isOnSale: false,
    isFeatured: false
  },

  // BATHROOM - Vanities (801)
  {
    id: 39,
    name: "Double Sink Vanity",
    slug: "double-sink-vanity",
    description: "Modern double sink vanity with ample storage. Includes marble countertop.",
    shortDescription: "Double sink with marble top",
    price: 1899,
    compareAtPrice: 2299,
    sku: "BAT-VAN-039",
    categoryId: 801,
    category: { id: 801, name: "Vanities", slug: "bathroom-vanities" },
    stockQuantity: 5,
    images: [
      { id: 42, imageUrl: "https://images.unsplash.com/photo-1595514535116-8f0c1c26d904?w=800", displayOrder: 1 }
    ],
    isNew: true,
    isOnSale: true,
    isFeatured: true
  },

  // BATHROOM - Medicine Cabinets (802)
  {
    id: 40,
    name: "Mirror Medicine Cabinet",
    slug: "mirror-medicine-cabinet",
    description: "Wall-mounted medicine cabinet with mirrored door. Recessed installation available.",
    shortDescription: "Mirrored wall cabinet",
    price: 299,
    compareAtPrice: null,
    sku: "BAT-MED-040",
    categoryId: 802,
    category: { id: 802, name: "Medicine Cabinets", slug: "medicine-cabinets" },
    stockQuantity: 20,
    images: [
      { id: 43, imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800", displayOrder: 1 }
    ],
    isNew: false,
    isOnSale: false,
    isFeatured: false
  },

  // BATHROOM - Linen Cabinets (803)
  {
    id: 41,
    name: "Tall Linen Cabinet",
    slug: "tall-linen-cabinet",
    description: "Tall storage cabinet for towels and linens. Multiple shelves and door compartment.",
    shortDescription: "Multi-shelf linen cabinet",
    price: 499,
    compareAtPrice: 599,
    sku: "BAT-LIN-041",
    categoryId: 803,
    category: { id: 803, name: "Linen Cabinets", slug: "linen-cabinets" },
    stockQuantity: 14,
    images: [
      { id: 44, imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800", displayOrder: 1 }
    ],
    isNew: false,
    isOnSale: true,
    isFeatured: false
  },

  // BATHROOM - Bathroom Shelving (804)
  {
    id: 42,
    name: "Over-Toilet Storage Rack",
    slug: "over-toilet-storage-rack",
    description: "Space-saving storage rack that fits over the toilet. Three shelves for organization.",
    shortDescription: "Over-toilet 3-shelf rack",
    price: 149,
    compareAtPrice: null,
    sku: "BAT-SHE-042",
    categoryId: 804,
    category: { id: 804, name: "Bathroom Shelving", slug: "bathroom-shelving" },
    stockQuantity: 30,
    images: [
      { id: 45, imageUrl: "https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?w=800", displayOrder: 1 }
    ],
    isNew: true,
    isOnSale: false,
    isFeatured: false
  }
];

export default products;
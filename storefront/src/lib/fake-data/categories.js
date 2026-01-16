// Categories Data - WonderSign API Format
// Includes both ID-based (for frontend) and path-based (for API) structure

export const categories = [
  // LIVING ROOM (ID: 1)
  {
    id: 1,
    name: "Living Room",
    slug: "living-room",
    path: "living-room", // API format
    description: "Comfortable and stylish furniture for your living space",
    imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800",
    parentId: null,
    displayOrder: 1
  },
  {
    id: 101,
    name: "Sofas & Couches",
    slug: "sofas-couches",
    path: "living-room/sofas-couches", // API format
    description: "Comfortable seating for your living room",
    imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600",
    parentId: 1,
    displayOrder: 1
  },
  {
    id: 102,
    name: "Chairs & Recliners",
    slug: "chairs-recliners",
    path: "living-room/chairs-recliners", // API format
    description: "Accent chairs and recliners",
    imageUrl: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=600",
    parentId: 1,
    displayOrder: 2
  },
  {
    id: 103,
    name: "Coffee Tables",
    slug: "coffee-tables",
    path: "living-room/coffee-tables", // API format
    description: "Stylish coffee and side tables",
    imageUrl: "https://images.unsplash.com/photo-1611269154421-4e27233ac5c7?w=600",
    parentId: 1,
    displayOrder: 3
  },
  {
    id: 104,
    name: "TV Stands & Media",
    slug: "tv-stands-media",
    path: "living-room/tv-stands-media", // API format
    description: "Entertainment centers and TV stands",
    imageUrl: "https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?w=600",
    parentId: 1,
    displayOrder: 4
  },
  {
    id: 105,
    name: "Bookcases & Storage",
    slug: "bookcases-storage",
    path: "living-room/bookcases-storage", // API format
    description: "Storage solutions for living room",
    imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600",
    parentId: 1,
    displayOrder: 5
  },

  // BEDROOM (ID: 2)
  {
    id: 2,
    name: "Bedroom",
    slug: "bedroom",
    path: "bedroom", // API format
    description: "Create your perfect sanctuary",
    imageUrl: "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800",
    parentId: null,
    displayOrder: 2
  },
  {
    id: 201,
    name: "Beds & Frames",
    slug: "beds-frames",
    path: "bedroom/beds-frames", // API format
    description: "Comfortable beds for restful sleep",
    imageUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600",
    parentId: 2,
    displayOrder: 1
  },
  {
    id: 202,
    name: "Nightstands",
    slug: "nightstands",
    path: "bedroom/nightstands", // API format
    description: "Bedside tables and nightstands",
    imageUrl: "https://images.unsplash.com/photo-1595428773937-78b4b8b39f7d?w=600",
    parentId: 2,
    displayOrder: 2
  },
  {
    id: 203,
    name: "Dressers & Chests",
    slug: "dressers-chests",
    path: "bedroom/dressers-chests", // API format
    description: "Storage for clothing and accessories",
    imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600",
    parentId: 2,
    displayOrder: 3
  },
  {
    id: 204,
    name: "Wardrobes & Armoires",
    slug: "wardrobes-armoires",
    path: "bedroom/wardrobes-armoires", // API format
    description: "Large storage solutions",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600",
    parentId: 2,
    displayOrder: 4
  },
  {
    id: 205,
    name: "Vanities & Mirrors",
    slug: "vanities-mirrors",
    path: "bedroom/vanities-mirrors", // API format
    description: "Makeup tables and mirrors",
    imageUrl: "https://images.unsplash.com/photo-1595514535116-8f0c1c26d904?w=600",
    parentId: 2,
    displayOrder: 5
  },

  // DINING ROOM (ID: 3)
  {
    id: 3,
    name: "Dining Room",
    slug: "dining-room",
    path: "dining-room", // API format
    description: "Gather and dine in style",
    imageUrl: "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800",
    parentId: null,
    displayOrder: 3
  },
  {
    id: 301,
    name: "Dining Tables",
    slug: "dining-tables",
    path: "dining-room/dining-tables", // API format
    description: "Tables for family gatherings",
    imageUrl: "https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?w=600",
    parentId: 3,
    displayOrder: 1
  },
  {
    id: 302,
    name: "Dining Chairs",
    slug: "dining-chairs",
    path: "dining-room/dining-chairs", // API format
    description: "Comfortable seating for dining",
    imageUrl: "https://images.unsplash.com/photo-1503602642458-232111445657?w=600",
    parentId: 3,
    displayOrder: 2
  },
  {
    id: 303,
    name: "Bar Stools",
    slug: "bar-stools",
    path: "dining-room/bar-stools", // API format
    description: "Counter and bar height seating",
    imageUrl: "https://images.unsplash.com/photo-1595428773937-78b4b8b39f7d?w=600",
    parentId: 3,
    displayOrder: 3
  },
  {
    id: 304,
    name: "Buffets & Sideboards",
    slug: "buffets-sideboards",
    path: "dining-room/buffets-sideboards", // API format
    description: "Storage and serving furniture",
    imageUrl: "https://images.unsplash.com/photo-1595514518526-0e1fb42b7a63?w=600",
    parentId: 3,
    displayOrder: 4
  },
  {
    id: 305,
    name: "China Cabinets",
    slug: "china-cabinets",
    path: "dining-room/china-cabinets", // API format
    description: "Display and store dinnerware",
    imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600",
    parentId: 3,
    displayOrder: 5
  },

  // OFFICE (ID: 4)
  {
    id: 4,
    name: "Office",
    slug: "office",
    path: "office", // API format
    description: "Productive and organized workspace",
    imageUrl: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800",
    parentId: null,
    displayOrder: 4
  },
  {
    id: 401,
    name: "Desks",
    slug: "desks",
    path: "office/desks", // API format
    description: "Work and study desks",
    imageUrl: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600",
    parentId: 4,
    displayOrder: 1
  },
  {
    id: 402,
    name: "Office Chairs",
    slug: "office-chairs",
    path: "office/office-chairs", // API format
    description: "Ergonomic seating",
    imageUrl: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=600",
    parentId: 4,
    displayOrder: 2
  },
  {
    id: 403,
    name: "Filing Cabinets",
    slug: "filing-cabinets",
    path: "office/filing-cabinets", // API format
    description: "Document storage solutions",
    imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600",
    parentId: 4,
    displayOrder: 3
  },
  {
    id: 404,
    name: "Bookcases",
    slug: "office-bookcases",
    path: "office/office-bookcases", // API format
    description: "Shelving for books and files",
    imageUrl: "https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?w=600",
    parentId: 4,
    displayOrder: 4
  },
  {
    id: 405,
    name: "Office Storage",
    slug: "office-storage",
    path: "office/office-storage", // API format
    description: "Cabinets and organizers",
    imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600",
    parentId: 4,
    displayOrder: 5
  },

  // OUTDOOR (ID: 5)
  {
    id: 5,
    name: "Outdoor",
    slug: "outdoor",
    path: "outdoor", // API format
    description: "Patio and garden furniture",
    imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
    parentId: null,
    displayOrder: 5
  },
  {
    id: 501,
    name: "Patio Seating",
    slug: "patio-seating",
    path: "outdoor/patio-seating", // API format
    description: "Outdoor sofas and chairs",
    imageUrl: "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=600",
    parentId: 5,
    displayOrder: 1
  },
  {
    id: 502,
    name: "Outdoor Dining",
    slug: "outdoor-dining",
    path: "outdoor/outdoor-dining", // API format
    description: "Tables and chairs for outdoor dining",
    imageUrl: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600",
    parentId: 5,
    displayOrder: 2
  },
  {
    id: 503,
    name: "Loungers & Daybeds",
    slug: "loungers-daybeds",
    path: "outdoor/loungers-daybeds", // API format
    description: "Relaxing outdoor furniture",
    imageUrl: "https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=600",
    parentId: 5,
    displayOrder: 3
  },
  {
    id: 504,
    name: "Umbrellas & Shade",
    slug: "umbrellas-shade",
    path: "outdoor/umbrellas-shade", // API format
    description: "Sun protection solutions",
    imageUrl: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=600",
    parentId: 5,
    displayOrder: 4
  },

  // LIGHTING (ID: 6)
  {
    id: 6,
    name: "Lighting",
    slug: "lighting",
    path: "lighting", // API format
    description: "Illuminate your space beautifully",
    imageUrl: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800",
    parentId: null,
    displayOrder: 6
  },
  {
    id: 601,
    name: "Floor Lamps",
    slug: "floor-lamps",
    path: "lighting/floor-lamps", // API format
    description: "Standing lamps for ambient lighting",
    imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600",
    parentId: 6,
    displayOrder: 1
  },
  {
    id: 602,
    name: "Table Lamps",
    slug: "table-lamps",
    path: "lighting/table-lamps", // API format
    description: "Desk and bedside lamps",
    imageUrl: "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=600",
    parentId: 6,
    displayOrder: 2
  },
  {
    id: 603,
    name: "Chandeliers",
    slug: "chandeliers",
    path: "lighting/chandeliers", // API format
    description: "Statement ceiling lights",
    imageUrl: "https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=600",
    parentId: 6,
    displayOrder: 3
  },
  {
    id: 604,
    name: "Pendant Lights",
    slug: "pendant-lights",
    path: "lighting/pendant-lights", // API format
    description: "Hanging lights for style and function",
    imageUrl: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600",
    parentId: 6,
    displayOrder: 4
  },

  // KIDS ROOM (ID: 7)
  {
    id: 7,
    name: "Kids Room",
    slug: "kids-room",
    path: "kids-room", // API format
    description: "Fun and functional furniture for children",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
    parentId: null,
    displayOrder: 7
  },
  {
    id: 701,
    name: "Kids Beds",
    slug: "kids-beds",
    path: "kids-room/kids-beds", // API format
    description: "Beds designed for children",
    imageUrl: "https://images.unsplash.com/photo-1595428773937-78b4b8b39f7d?w=600",
    parentId: 7,
    displayOrder: 1
  },
  {
    id: 702,
    name: "Kids Storage",
    slug: "kids-storage",
    path: "kids-room/kids-storage", // API format
    description: "Toy boxes and organizers",
    imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600",
    parentId: 7,
    displayOrder: 2
  },
  {
    id: 703,
    name: "Kids Desks",
    slug: "kids-desks",
    path: "kids-room/kids-desks", // API format
    description: "Study desks for children",
    imageUrl: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600",
    parentId: 7,
    displayOrder: 3
  },
  {
    id: 704,
    name: "Kids Seating",
    slug: "kids-seating",
    path: "kids-room/kids-seating", // API format
    description: "Chairs and bean bags for kids",
    imageUrl: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=600",
    parentId: 7,
    displayOrder: 4
  },

  // BATHROOM (ID: 8)
  {
    id: 8,
    name: "Bathroom",
    slug: "bathroom",
    path: "bathroom", // API format
    description: "Stylish and functional bathroom furniture",
    imageUrl: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800",
    parentId: null,
    displayOrder: 8
  },
  {
    id: 801,
    name: "Vanities",
    slug: "bathroom-vanities",
    path: "bathroom/bathroom-vanities", // API format
    description: "Bathroom sink cabinets",
    imageUrl: "https://images.unsplash.com/photo-1595514535116-8f0c1c26d904?w=600",
    parentId: 8,
    displayOrder: 1
  },
  {
    id: 802,
    name: "Medicine Cabinets",
    slug: "medicine-cabinets",
    path: "bathroom/medicine-cabinets", // API format
    description: "Wall-mounted storage",
    imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600",
    parentId: 8,
    displayOrder: 2
  },
  {
    id: 803,
    name: "Linen Cabinets",
    slug: "linen-cabinets",
    path: "bathroom/linen-cabinets", // API format
    description: "Towel and linen storage",
    imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600",
    parentId: 8,
    displayOrder: 3
  },
  {
    id: 804,
    name: "Bathroom Shelving",
    slug: "bathroom-shelving",
    path: "bathroom/bathroom-shelving", // API format
    description: "Open shelves and organizers",
    imageUrl: "https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?w=600",
    parentId: 8,
    displayOrder: 4
  },
];

export default categories;
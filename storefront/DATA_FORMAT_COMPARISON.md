# Data Format Comparison

## Overview
Your storefront now has TWO data formats available for testing:

1. **Old Format** - Current fake data (products.js)
2. **New API Format** - Matches WonderSign API (products-api.js)

## Current Fake Data Structure

The current fake data in `src/lib/fake-data/products.js` looks like this:

```javascript
{
  id: 1,
  name: "Modern Velvet Sofa",
  slug: "modern-velvet-sofa",
  description: "Luxurious velvet upholstery...",
  price: 2498,
  compareAtPrice: 3299,
  sku: "SOF-VEL-001",
  categoryId: 101,
  stockQuantity: 8,
  images: [
    { id: 1, imageUrl: "...", displayOrder: 1 }
  ],
  isNew: true,
  isOnSale: true,
  isFeatured: true,
  variants: [
    { id: 1, name: "Navy Blue", sku: "SOF-VEL-001-NAV" }
  ]
}
```

## New API Format Structure

The new API-format data in `src/lib/fake-data/products-api.js` looks like this:

```javascript
{
  brand: "LiviPoint Collection",
  name: "Modern Velvet Sofa",
  description: "Luxurious velvet upholstery...",
  categories: [
    { imageUrl: "...", path: "living-room/sofas-couches" }
  ],
  media: {
    mainImages: [
      { variantProductIds: ["CPV000000001"], url: "..." }
    ],
    additionalImages: [...]
  },
  variants: [
    {
      productId: "CPV000000001",
      sku: "SOF-VEL-001-NAV",
      name: "Modern Velvet Sofa - Navy Blue",
      price: {
        retailPrice: 2498,
        listPrice: 3299,
        cost: 1200
      },
      dimensions: {
        height: 85,
        width: 90,
        length: 220,
        weight: 95,
        unitOfMeasureDistance: "cm",
        unitOfMeasureWeight: "kg"
      },
      attributes: [
        {
          attribute: "color",
          normalizedValues: [
            {
              commonName: "Navy Blue",
              hexValue: "#000080"
            }
          ]
        }
      ],
      custom: {
        isNew: true,
        isFeatured: true
      }
    }
  ]
}
```

## After Transformation

The transformation utility converts the API format to match what your frontend expects:

```javascript
// API Format (input)
{
  variants: [
    {
      productId: "CPV000000001",
      price: { retailPrice: 2498, listPrice: 3299 }
    }
  ]
}

// ↓ transformApiProductToFrontend() ↓

// Frontend Format (output)
{
  id: "CPV000000001",
  price: 2498,
  compareAtPrice: 3299
}
```

## How to Test Both Formats

### Option 1: Using Old Format (Current)
```javascript
import { getFeaturedProducts } from '@/lib/fake-data';

// Returns old format directly
const products = getFeaturedProducts();
```

### Option 2: Using New API Format
```javascript
import { getFeaturedProductsApiFormat } from '@/lib/fake-data';

// Returns API format → transformed → with inventory
const products = getFeaturedProductsApiFormat();
```

## Available Functions

### Old Format Functions
- `getFeaturedProducts(limit)` - Old format
- `getNewProducts(limit)` - Old format
- `getSaleProducts(limit)` - Old format
- `getProductById(id)` - Old format
- `getProductBySlug(slug)` - Old format

### New API Format Functions
- `getFeaturedProductsApiFormat(limit)` - New format + transformed
- `getNewProductsApiFormat(limit)` - New format + transformed
- `getProductsApiFormat()` - New format + transformed

### Raw Data
- `products` - Old format array
- `productsApiFormat` - New API format array (before transformation)
- `inventoryApiFormat` - Inventory data array

## Testing in Your Browser Console

1. Start your dev server:
```bash
npm run dev
```

2. Open browser console on any page

3. Test the transformation:
```javascript
// Import the function (if using module)
import { getProductsApiFormat } from '@/lib/fake-data';

// Get transformed products
const products = getProductsApiFormat();
console.log('Transformed Products:', products);

// Check first product
console.log('First Product:', products[0]);

// Check if it has inventory data
console.log('Stock Quantity:', products[0].stockQuantity);
console.log('In Stock:', products[0].inStock);
```

## Key Differences

| Field | Old Format | New API Format (before transform) |
|-------|------------|-----------------------------------|
| Product ID | `id: 1` | `variants[0].productId: "CPV000000001"` |
| Price | `price: 2498` | `variants[0].price.retailPrice: 2498` |
| Sale Price | `compareAtPrice: 3299` | `variants[0].price.listPrice: 3299` |
| Images | `images: [...]` | `media.mainImages: [...]` |
| Stock | `stockQuantity: 8` | Separate inventory API |
| Variants | Simple array | Rich objects with attributes |
| Category | `categoryId: 101` | `categories[0].path: "living-room/sofas-couches"` |

## Next Steps

1. **Keep using old format** - Everything works as before
2. **Test API format** - Use `getProductsApiFormat()` to see transformed data
3. **When API is ready** - Switch to real API, transformation happens automatically

## Example: Side-by-Side Comparison

```javascript
// OLD FORMAT
const oldProduct = {
  id: 1,
  name: "Modern Velvet Sofa",
  price: 2498,
  compareAtPrice: 3299,
  sku: "SOF-VEL-001",
  isNew: true,
  isFeatured: true
};

// NEW FORMAT (after transformation)
const newProduct = {
  id: "CPV000000001",
  name: "Modern Velvet Sofa",
  price: 2498,
  compareAtPrice: 3299,
  sku: "SOF-VEL-001-NAV",  // More specific SKU
  isNew: true,
  isFeatured: true,
  brand: "LiviPoint Collection",  // NEW
  collection: "Modern Living 2024",  // NEW
  dimensions: { height: 85, width: 90, ... },  // NEW
  stockQuantity: 8,  // From inventory API
  inStock: true,  // From inventory API
  locations: [...]  // From inventory API
};
```

Both produce the same visual result on the frontend, but the API format has richer data!

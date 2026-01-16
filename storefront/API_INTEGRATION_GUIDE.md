# API Integration Guide

## Overview
This guide explains how to integrate the WonderSign Data API with your furniture marketplace storefront.

## Current Setup

### Data Flow (Using Fake Data)
```
Fake Data (old format) → API Layer → Frontend Components
```

### When API is Ready
```
Real API Response → Transform Function → Frontend Components
```

## Files Created

### 1. Product Transformation Utilities
**Location:** `src/lib/utils/productTransform.js`

**Key Functions:**
- `transformApiProductToFrontend(apiProduct)` - Converts single API product to frontend format
- `transformApiProductsToFrontend(apiProducts)` - Converts array of API products
- `mergeProductWithInventory(product, inventoryData)` - Merges inventory data with product
- `getVariantColor(variant)` - Extracts color hex from variant attributes
- `getVariantMainImage(product, variantId)` - Gets main image for specific variant
- `formatPrice(price, currency)` - Formats price for display
- `calculateDiscountPercentage(originalPrice, salePrice)` - Calculates discount %
- `isProductInStock(product)` - Checks stock status
- `getStockStatus(product)` - Returns stock status message

## API Schema Reference

### Product GET Response
```json
[
  {
    "brand": "string",
    "categories": [{ "imageUrl": "string", "path": "string" }],
    "collection": "string",
    "consumerBrand": "string",
    "description": "string",
    "name": "string",
    "provider": "string",
    "relatedProducts": {
      "completeYourCollection": ["string"],
      "crossSell": ["string"],
      "series": ["string"]
    },
    "updatedAt": "ISO date",
    "media": {
      "additionalImages": [{"variantProductIds": ["string"], "url": "string"}],
      "mainImages": [{"variantProductIds": ["string"], "url": "string"}],
      "videoUrls": [{"variantProductIds": ["string"], "url": "string"}]
    },
    "variantKey": "string",
    "variants": [
      {
        "productId": "string",
        "sku": "string",
        "name": "string",
        "description": "string",
        "price": {
          "retailPrice": 0,
          "listPrice": 0,
          "cost": 0,
          "mapPrice": 0,
          "msrpPrice": 0
        },
        "dimensions": {
          "height": 0,
          "width": 0,
          "length": 0,
          "weight": 0,
          "unitOfMeasureDistance": "cm",
          "unitOfMeasureWeight": "kg"
        },
        "attributes": [...],
        "custom": {},
        ...
      }
    ]
  }
]
```

### Inventory GET Response
```json
[
  {
    "sku": "string",
    "availableQuantity": 0,
    "brand": "string",
    "inStock": true,
    "nextAvailableDate": "ISO date",
    "nextAvailableQuantity": 0,
    "locations": [
      {
        "currentQuantity": 0,
        "futureAvailabilityDate": "ISO date",
        "futureQuantity": 0,
        "locationName": "string",
        "locationType": "local"
      }
    ],
    "provider": "string"
  }
]
```

## Integration Steps (When You Get API Key)

### Step 1: Update Environment Variables
```env
# .env.local
NEXT_PUBLIC_API_URL=https://your-api-endpoint.com
NEXT_PUBLIC_USE_FAKE_DATA=false  # Switch to false when ready
NEXT_PUBLIC_API_KEY=your_api_key_here
```

### Step 2: Update API Client
In `src/lib/api/client.js`, add API key to headers:

```javascript
export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_API_KEY}`,  // Add this
  },
});
```

### Step 3: Update Products API
In `src/lib/api/products.js`, update the `getProducts` function:

```javascript
export async function getProducts(params = {}) {
  return handleApiCall(
    // Real API call
    async () => {
      const response = await get('/products', { params });

      // Transform API response to frontend format
      const products = transformApiProductsToFrontend(response.data || response);

      // Optionally fetch inventory data
      if (params.includeInventory) {
        const inventory = await get('/inventory');
        return products.map(p => mergeProductWithInventory(p, inventory.data));
      }

      return { data: products };
    },
    // Fake data (current)
    () => {
      // ... existing fake data logic
    }
  );
}
```

### Step 4: Update Single Product Fetch
```javascript
export async function getProductBySlug(slug) {
  return handleApiCall(
    async () => {
      const response = await get(`/products/slug/${slug}`);
      const product = transformApiProductToFrontend(response.data);

      // Fetch inventory for this product
      const inventory = await get(`/inventory?sku=${product.sku}`);
      const productWithInventory = mergeProductWithInventory(product, inventory.data);

      return { data: productWithInventory };
    },
    () => {
      // ... existing fake data logic
    }
  );
}
```

## Frontend Format (What Components Expect)

The transformation utilities convert the API format to this structure:

```javascript
{
  id: "CPV783132831",
  name: "Modern Velvet Sofa",
  slug: "modern-velvet-sofa",
  description: "Full description...",
  shortDescription: "Brief description...",
  price: 2498,
  compareAtPrice: 3299,  // Original price if on sale
  sku: "SOF-VEL-001-NAV",
  upc: "123456789001",

  category: {
    name: "Sofas & Couches",
    slug: "sofas-couches",
    path: "living-room/sofas-couches"
  },

  stockQuantity: 8,
  inStock: true,
  nextAvailableDate: "2026-02-15",
  nextAvailableQuantity: 15,

  images: [
    { id: 1, imageUrl: "...", displayOrder: 1 }
  ],

  isNew: true,
  isOnSale: true,
  isFeatured: true,

  specifications: {
    "Color": "Navy Blue",
    "Material": "Velvet",
    "Seating Capacity": "3-4 people"
  },

  dimensions: {
    height: 85,
    width: 90,
    length: 220,
    weight: 95,
    unit: "cm",
    weightUnit: "kg"
  },

  variants: [
    {
      id: "CPV783132831",
      name: "Navy Blue",
      sku: "SOF-VEL-001-NAV",
      price: 2498,
      compareAtPrice: 3299
    }
  ],

  brand: "LiviPoint Collection",
  collection: "Modern Living 2024",
  provider: "LiviPoint Furniture Co.",

  relatedProducts: {
    completeYourCollection: [...],
    crossSell: [...],
    series: [...]
  }
}
```

## Testing the Integration

### 1. With Fake Data (Current)
```bash
# .env.local
NEXT_PUBLIC_USE_FAKE_DATA=true
npm run dev
```

### 2. With Real API
```bash
# .env.local
NEXT_PUBLIC_USE_FAKE_DATA=false
NEXT_PUBLIC_API_URL=https://your-api-endpoint.com
NEXT_PUBLIC_API_KEY=your_key
npm run dev
```

### 3. Test Checklist
- [ ] Homepage shows featured products
- [ ] Product listing page displays correctly
- [ ] Product detail page shows all information
- [ ] Variants display with correct images
- [ ] Stock status shows correctly
- [ ] Prices display with sale prices
- [ ] Category navigation works
- [ ] Search functionality works
- [ ] Related products appear

## Key Mapping

| API Field | Frontend Field | Notes |
|-----------|----------------|-------|
| variants[0].productId | id | Uses first variant's ID |
| name | name | Direct mapping |
| description | description | Direct mapping |
| variants[0].price.retailPrice | price | Current selling price |
| variants[0].price.listPrice | compareAtPrice | Original price (if on sale) |
| variants[0].sku | sku | Product SKU |
| media.mainImages | images | Converted to array |
| variants[0].custom.isNew | isNew | Custom flag |
| variants[0].custom.isFeatured | isFeatured | Custom flag |
| categories[0].path | category.path | Category hierarchy |

## Inventory Integration

The inventory data is fetched separately and merged with product data:

```javascript
// Fetch products
const products = await getProducts();

// Fetch inventory (you can batch this)
const skus = products.data.map(p => p.sku).join(',');
const inventory = await get(`/inventory?skus=${skus}`);

// Merge
const productsWithInventory = products.data.map(product =>
  mergeProductWithInventory(product, inventory.data)
);
```

## Troubleshooting

### Products not displaying
- Check if API response is in correct format
- Verify transformation function is being called
- Check browser console for errors

### Images not loading
- Verify media.mainImages and media.additionalImages structure
- Check image URLs are accessible
- Ensure CORS is configured on image server

### Stock not showing
- Verify inventory endpoint is returning data
- Check SKU matching between products and inventory
- Ensure mergeProductWithInventory is being called

## Next Steps

1. Get API credentials from WonderSign
2. Test API endpoints in Postman/Insomnia
3. Update .env.local with API URL and key
4. Switch NEXT_PUBLIC_USE_FAKE_DATA to false
5. Test all product pages
6. Deploy to staging for QA

## Support

For API questions: Contact WonderSign support
For integration help: Check this guide or ask the dev team

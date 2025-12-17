# Furniture Marketplace API Documentation

## Overview
Complete REST API for a multi-vendor furniture marketplace platform with payments, search, and notifications.

**Base URL:** `http://localhost:3000/api`  
**Version:** 1.0  
**Last Updated:** December 2025

---

## Table of Contents
1. [Authentication](#authentication)
2. [Products](#products)
3. [Categories](#categories)
4. [Cart](#cart)
5. [Orders](#orders)
6. [Customers](#customers)
7. [Vendors](#vendors)
8. [Reviews](#reviews)
9. [Wishlist](#wishlist)
10. [Notifications](#notifications)
11. [Payments](#payments)
12. [Search](#search)
13. [Error Handling](#error-handling)

---

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Register

**POST** `/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "CUSTOMER"
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "CUSTOMER"
  }
}
```

**Validation:**
- `email`: Valid email format, unique
- `password`: 6-100 characters
- `firstName`: 1-50 characters
- `lastName`: 1-50 characters
- `role`: CUSTOMER, VENDOR, or ADMIN

---

### Login

**POST** `/auth/login`

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "firstName": "John",
    "role": "CUSTOMER"
  }
}
```

---

### Forgot Password

**POST** `/auth/forgot-password`

Request password reset token.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response (200):**
```json
{
  "message": "If that email exists, a password reset link has been sent"
}
```

---

### Reset Password

**POST** `/auth/reset-password`

Reset password using token from email.

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePass123!"
}
```

**Response (200):**
```json
{
  "message": "Password has been reset successfully"
}
```

---

### Change Password

**PUT** `/auth/change-password`

Change password for authenticated user.

**Authentication:** Required

**Request Body:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

**Response (200):**
```json
{
  "message": "Password changed successfully"
}
```

---

## Products

### Get All Products

**GET** `/products`

Get paginated list of products with optional filters.

**Query Parameters:**
- `categoryId` (string): Filter by category
- `vendorId` (string): Filter by vendor
- `minPrice` (number): Minimum price
- `maxPrice` (number): Maximum price
- `sortBy` (string): Sort field (price, createdAt, name, rating)
- `order` (string): asc or desc
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)

**Example:**
```
GET /products?categoryId=abc123&minPrice=100&maxPrice=1000&sortBy=price&order=asc&page=1&limit=20
```

**Response (200):**
```json
{
  "products": [
    {
      "id": "uuid",
      "name": "Luxury Velvet Sofa",
      "description": "Elegant 3-seater velvet sofa...",
      "price": 1299.99,
      "compareAtPrice": 1799.99,
      "images": ["url1", "url2"],
      "rating": 4.5,
      "totalReviews": 24,
      "stockQuantity": 15,
      "vendor": {
        "id": "uuid",
        "businessName": "Furniture Co"
      },
      "category": {
        "id": "uuid",
        "name": "Sofas"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 150,
    "totalPages": 8
  }
}
```

---

### Get Single Product

**GET** `/products/:id`

Get detailed information about a specific product.

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Luxury Velvet Sofa",
  "description": "Full description...",
  "price": 1299.99,
  "compareAtPrice": 1799.99,
  "sku": "SOF-VEL-LUX-001",
  "stockQuantity": 15,
  "images": ["url1", "url2"],
  "dimensions": { "width": 200, "height": 85, "depth": 95 },
  "materials": ["velvet", "oak"],
  "colors": ["blue", "gray"],
  "roomType": "living-room",
  "style": "modern",
  "brand": "LuxuryHome",
  "rating": 4.5,
  "totalReviews": 24,
  "isActive": true,
  "vendor": {
    "id": "uuid",
    "businessName": "Furniture Co",
    "rating": 4.8
  },
  "category": {
    "id": "uuid",
    "name": "Sofas"
  }
}
```

---

### Create Product

**POST** `/products`

Create a new product (vendor only).

**Authentication:** Required (VENDOR)

**Request Body:**
```json
{
  "categoryId": "uuid",
  "name": "Modern Dining Table",
  "description": "Beautiful oak dining table...",
  "price": 899.99,
  "compareAtPrice": 1199.99,
  "sku": "TAB-OAK-MOD-001",
  "stockQuantity": 10,
  "images": ["url1", "url2"],
  "dimensions": { "width": 180, "height": 75, "depth": 90 },
  "materials": ["oak", "metal"],
  "colors": ["natural", "black"],
  "roomType": "dining-room",
  "style": "modern",
  "assemblyRequired": true,
  "brand": "ModernHome",
  "warranty": "2 years",
  "careInstructions": "Wipe with damp cloth"
}
```

**Response (201):**
```json
{
  "message": "Product created successfully",
  "product": { /* full product object */ }
}
```

---

### Update Product

**PUT** `/products/:id`

Update existing product (vendor only, own products).

**Authentication:** Required (VENDOR)

**Request Body:** Same as Create Product (all fields optional)

**Response (200):**
```json
{
  "message": "Product updated successfully",
  "product": { /* full product object */ }
}
```

---

### Delete Product

**DELETE** `/products/:id`

Delete product (vendor only, own products).

**Authentication:** Required (VENDOR)

**Response (200):**
```json
{
  "message": "Product deleted successfully"
}
```

---

### Get Vendor Products

**GET** `/products/vendor/my-products`

Get all products for authenticated vendor.

**Authentication:** Required (VENDOR)

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page

**Response (200):**
```json
{
  "products": [ /* array of products */ ],
  "pagination": { /* pagination object */ }
}
```

---

### Activate Product

**PATCH** `/products/:id/activate`

Activate a product (make it visible).

**Authentication:** Required (VENDOR)

**Response (200):**
```json
{
  "message": "Product activated successfully"
}
```

---

### Deactivate Product

**PATCH** `/products/:id/deactivate`

Deactivate a product (hide it).

**Authentication:** Required (VENDOR)

**Response (200):**
```json
{
  "message": "Product deactivated successfully"
}
```

---

## Categories

### Get All Categories

**GET** `/categories`

Get all categories.

**Response (200):**
```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "Sofas",
      "description": "Comfortable sofas and couches",
      "slug": "sofas",
      "image": "url",
      "productCount": 45
    }
  ]
}
```

---

### Get Single Category

**GET** `/categories/:id`

Get category details with products.

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page

**Response (200):**
```json
{
  "category": {
    "id": "uuid",
    "name": "Sofas",
    "description": "Comfortable sofas...",
    "slug": "sofas",
    "image": "url"
  },
  "products": [ /* array of products */ ],
  "pagination": { /* pagination object */ }
}
```

---

### Create Category

**POST** `/categories`

Create new category (admin only).

**Authentication:** Required (ADMIN)

**Request Body:**
```json
{
  "name": "Sofas",
  "description": "Comfortable sofas and couches",
  "slug": "sofas",
  "image": "url"
}
```

**Response (201):**
```json
{
  "message": "Category created successfully",
  "category": { /* category object */ }
}
```

---

### Update Category

**PUT** `/categories/:id`

Update category (admin only).

**Authentication:** Required (ADMIN)

**Request Body:** Same as Create (all fields optional)

**Response (200):**
```json
{
  "message": "Category updated successfully",
  "category": { /* category object */ }
}
```

---

### Delete Category

**DELETE** `/categories/:id`

Delete category (admin only).

**Authentication:** Required (ADMIN)

**Response (200):**
```json
{
  "message": "Category deleted successfully"
}
```

---

## Cart

### Get Cart

**GET** `/cart`

Get customer's cart with items.

**Authentication:** Required (CUSTOMER)

**Response (200):**
```json
{
  "cart": {
    "id": "uuid",
    "items": [
      {
        "id": "uuid",
        "quantity": 2,
        "product": {
          "id": "uuid",
          "name": "Velvet Sofa",
          "price": 1299.99,
          "images": ["url"],
          "stockQuantity": 15
        }
      }
    ],
    "itemCount": 2,
    "subtotal": 2599.98
  }
}
```

---

### Add to Cart

**POST** `/cart`

Add product to cart.

**Authentication:** Required (CUSTOMER)

**Request Body:**
```json
{
  "productId": "uuid",
  "quantity": 2
}
```

**Response (201):**
```json
{
  "message": "Product added to cart",
  "cartItem": { /* cart item object */ }
}
```

---

### Update Cart Item

**PUT** `/cart/:itemId`

Update quantity of cart item.

**Authentication:** Required (CUSTOMER)

**Request Body:**
```json
{
  "quantity": 3
}
```

**Response (200):**
```json
{
  "message": "Cart item updated",
  "cartItem": { /* cart item object */ }
}
```

---

### Remove from Cart

**DELETE** `/cart/:itemId`

Remove item from cart.

**Authentication:** Required (CUSTOMER)

**Response (200):**
```json
{
  "message": "Item removed from cart"
}
```

---

### Clear Cart

**DELETE** `/cart`

Remove all items from cart.

**Authentication:** Required (CUSTOMER)

**Response (200):**
```json
{
  "message": "Cart cleared successfully"
}
```

---

## Orders

### Create Order

**POST** `/orders`

Create order from cart items.

**Authentication:** Required (CUSTOMER)

**Request Body:**
```json
{
  "addressId": "uuid",
  "notes": "Please deliver between 9-5"
}
```

**Response (201):**
```json
{
  "message": "Orders created successfully",
  "orders": [
    {
      "id": "uuid",
      "orderNumber": "ORD-ABC123-XYZ",
      "status": "PENDING",
      "subtotal": 1299.99,
      "tax": 103.99,
      "shippingCost": 50,
      "total": 1453.98,
      "paymentStatus": "PROCESSING",
      "clientSecret": "pi_xxx_secret_xxx",
      "paymentIntentId": "pi_xxx",
      "items": [ /* order items */ ],
      "vendor": { /* vendor info */ },
      "address": { /* shipping address */ }
    }
  ]
}
```

---

### Get Customer Orders

**GET** `/orders/customer`

Get all orders for customer.

**Authentication:** Required (CUSTOMER)

**Query Parameters:**
- `status` (string): Filter by status
- `page` (number): Page number
- `limit` (number): Items per page

**Response (200):**
```json
{
  "orders": [ /* array of orders */ ],
  "pagination": { /* pagination object */ }
}
```

---

### Get Vendor Orders

**GET** `/orders/vendor`

Get all orders for vendor.

**Authentication:** Required (VENDOR)

**Query Parameters:** Same as customer orders

**Response (200):**
```json
{
  "orders": [ /* array of orders */ ],
  "pagination": { /* pagination object */ }
}
```

---

### Get Single Order

**GET** `/orders/:id`

Get order details.

**Authentication:** Required

**Response (200):**
```json
{
  "id": "uuid",
  "orderNumber": "ORD-ABC123-XYZ",
  "status": "CONFIRMED",
  "paymentStatus": "SUCCEEDED",
  "subtotal": 1299.99,
  "tax": 103.99,
  "shippingCost": 50,
  "total": 1453.98,
  "notes": "Delivery instructions",
  "createdAt": "2025-12-01T10:00:00Z",
  "items": [
    {
      "id": "uuid",
      "quantity": 1,
      "price": 1299.99,
      "product": { /* product details */ }
    }
  ],
  "customer": { /* customer info */ },
  "vendor": { /* vendor info */ },
  "address": { /* shipping address */ }
}
```

---

### Update Order Status

**PATCH** `/orders/:id/status`

Update order status (vendor only).

**Authentication:** Required (VENDOR)

**Request Body:**
```json
{
  "status": "SHIPPED"
}
```

**Valid Statuses:**
- PENDING
- CONFIRMED
- PROCESSING
- SHIPPED
- DELIVERED
- CANCELLED
- REFUNDED

**Response (200):**
```json
{
  "message": "Order status updated successfully",
  "order": { /* order object */ }
}
```

---

### Cancel Order

**DELETE** `/orders/:id`

Cancel order and restore stock.

**Authentication:** Required (CUSTOMER)

**Response (200):**
```json
{
  "message": "Order cancelled successfully and stock restored",
  "order": { /* order object */ }
}
```
## Customers

### Get Customer Profile

**GET** `/customers/profile`

Get authenticated customer's profile.

**Authentication:** Required (CUSTOMER)

**Response (200):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "phone": "+1234567890",
  "dateOfBirth": "1990-01-01",
  "user": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  },
  "addresses": [
    {
      "id": "uuid",
      "street": "123 Main St",
      "city": "Atlanta",
      "state": "GA",
      "zipCode": "30301",
      "country": "US",
      "isDefault": true
    }
  ]
}
```

---

### Update Customer Profile

**PUT** `/customers/profile`

Update customer profile.

**Authentication:** Required (CUSTOMER)

**Request Body:**
```json
{
  "phone": "+1234567890",
  "dateOfBirth": "1990-01-01"
}
```

**Response (200):**
```json
{
  "message": "Profile updated successfully",
  "customer": { /* customer object */ }
}
```

---

### Get Addresses

**GET** `/customers/addresses`

Get all customer addresses.

**Authentication:** Required (CUSTOMER)

**Response (200):**
```json
{
  "addresses": [
    {
      "id": "uuid",
      "street": "123 Main St",
      "city": "Atlanta",
      "state": "GA",
      "zipCode": "30301",
      "country": "US",
      "isDefault": true
    }
  ]
}
```

---

### Create Address

**POST** `/customers/addresses`

Add new address.

**Authentication:** Required (CUSTOMER)

**Request Body:**
```json
{
  "street": "456 Oak Ave",
  "city": "Atlanta",
  "state": "GA",
  "zipCode": "30302",
  "country": "US",
  "isDefault": false
}
```

**Response (201):**
```json
{
  "message": "Address added successfully",
  "address": { /* address object */ }
}
```

---

### Update Address

**PUT** `/customers/addresses/:id`

Update existing address.

**Authentication:** Required (CUSTOMER)

**Request Body:** Same as Create (all fields optional)

**Response (200):**
```json
{
  "message": "Address updated successfully",
  "address": { /* address object */ }
}
```

---

### Delete Address

**DELETE** `/customers/addresses/:id`

Delete address.

**Authentication:** Required (CUSTOMER)

**Response (200):**
```json
{
  "message": "Address deleted successfully"
}
```

---

### Set Default Address

**PATCH** `/customers/addresses/:id/default`

Set address as default.

**Authentication:** Required (CUSTOMER)

**Response (200):**
```json
{
  "message": "Default address updated successfully",
  "address": { /* address object */ }
}
```

---

## Vendors

### Get Vendor Profile

**GET** `/vendors/profile`

Get authenticated vendor's profile.

**Authentication:** Required (VENDOR)

**Response (200):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "businessName": "Furniture Co",
  "description": "Premium furniture...",
  "logo": "url",
  "businessPhone": "+1234567890",
  "businessEmail": "contact@furniture.com",
  "address": {
    "street": "789 Business Blvd",
    "city": "Atlanta",
    "state": "GA",
    "zipCode": "30303",
    "country": "US"
  },
  "shippingZones": ["GA", "FL", "SC"],
  "returnPolicy": "30-day returns...",
  "shippingPolicy": "Free shipping over $500...",
  "responseTime": 24,
  "rating": 4.8,
  "totalReviews": 156,
  "stripeAccountStatus": "CONNECTED",
  "onboardingComplete": true,
  "payoutsEnabled": true,
  "commissionRate": 0.06,
  "isVerified": true
}
```

---

### Update Vendor Profile

**PUT** `/vendors/profile`

Update vendor profile.

**Authentication:** Required (VENDOR)

**Request Body:**
```json
{
  "businessName": "Premium Furniture Co",
  "description": "Updated description...",
  "logo": "new-logo-url",
  "businessPhone": "+1234567890",
  "returnPolicy": "Updated policy...",
  "shippingZones": ["GA", "FL", "SC", "NC"]
}
```

**Response (200):**
```json
{
  "message": "Vendor profile updated successfully",
  "vendor": { /* vendor object */ }
}
```

---

### Get Vendor Statistics

**GET** `/vendors/statistics`

Get vendor business statistics.

**Authentication:** Required (VENDOR)

**Response (200):**
```json
{
  "totalProducts": 45,
  "activeProducts": 42,
  "totalOrders": 234,
  "pendingOrders": 12,
  "totalRevenue": 125678.50,
  "totalCommission": 7540.71,
  "netRevenue": 118137.79,
  "averageOrderValue": 537.26,
  "rating": 4.8,
  "totalReviews": 156
}
```

---

### Get Public Vendors

**GET** `/vendors`

Get list of all vendors (public).

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page

**Response (200):**
```json
{
  "vendors": [
    {
      "id": "uuid",
      "businessName": "Furniture Co",
      "description": "Premium furniture...",
      "logo": "url",
      "rating": 4.8,
      "totalReviews": 156,
      "productCount": 45
    }
  ],
  "pagination": { /* pagination object */ }
}
```

---

### Get Public Vendor Details

**GET** `/vendors/:id`

Get vendor public profile with products.

**Response (200):**
```json
{
  "vendor": {
    "id": "uuid",
    "businessName": "Furniture Co",
    "description": "Premium furniture...",
    "logo": "url",
    "rating": 4.8,
    "totalReviews": 156,
    "responseTime": 24,
    "isVerified": true
  },
  "products": [ /* array of products */ ],
  "pagination": { /* pagination object */ }
}
```

---

### Connect Stripe Account

**POST** `/vendors/connect/stripe`

Start Stripe Connect onboarding.

**Authentication:** Required (VENDOR)

**Response (200):**
```json
{
  "url": "https://connect.stripe.com/setup/...",
  "accountId": "acct_xxx"
}
```

---

### Get Stripe Account Status

**GET** `/vendors/connect/status`

Check Stripe connection status.

**Authentication:** Required (VENDOR)

**Response (200):**
```json
{
  "connected": true,
  "status": "CONNECTED",
  "payoutsEnabled": true,
  "accountId": "acct_xxx"
}
```

---

### Disconnect Stripe Account

**DELETE** `/vendors/connect/stripe`

Disconnect Stripe account.

**Authentication:** Required (VENDOR)

**Response (200):**
```json
{
  "message": "Stripe account disconnected successfully"
}
```

---

### Get Stripe Dashboard Link

**GET** `/vendors/connect/dashboard`

Get link to Stripe Express dashboard.

**Authentication:** Required (VENDOR)

**Response (200):**
```json
{
  "url": "https://connect.stripe.com/express/..."
}
```

---

## Reviews

### Get Product Reviews

**GET** `/reviews/product/:productId`

Get all reviews for a product.

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page

**Response (200):**
```json
{
  "reviews": [
    {
      "id": "uuid",
      "rating": 5,
      "comment": "Excellent quality!",
      "createdAt": "2025-12-01T10:00:00Z",
      "customer": {
        "user": {
          "firstName": "John",
          "lastName": "D."
        }
      }
    }
  ],
  "averageRating": 4.5,
  "totalReviews": 24,
  "ratingDistribution": {
    "5": 15,
    "4": 6,
    "3": 2,
    "2": 1,
    "1": 0
  },
  "pagination": { /* pagination object */ }
}
```

---

### Create Review

**POST** `/reviews`

Create product review (must have purchased).

**Authentication:** Required (CUSTOMER)

**Request Body:**
```json
{
  "productId": "uuid",
  "orderId": "uuid",
  "rating": 5,
  "comment": "Excellent quality furniture!"
}
```

**Response (201):**
```json
{
  "message": "Review created successfully",
  "review": { /* review object */ }
}
```

---

### Update Review

**PUT** `/reviews/:id`

Update own review.

**Authentication:** Required (CUSTOMER)

**Request Body:**
```json
{
  "rating": 4,
  "comment": "Updated review text"
}
```

**Response (200):**
```json
{
  "message": "Review updated successfully",
  "review": { /* review object */ }
}
```

---

### Delete Review

**DELETE** `/reviews/:id`

Delete own review.

**Authentication:** Required (CUSTOMER)

**Response (200):**
```json
{
  "message": "Review deleted successfully"
}
```

---

## Wishlist

### Get Wishlist

**GET** `/wishlist`

Get customer's wishlist.

**Authentication:** Required (CUSTOMER)

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "product": {
        "id": "uuid",
        "name": "Velvet Sofa",
        "price": 1299.99,
        "images": ["url"],
        "rating": 4.5,
        "stockQuantity": 15
      },
      "addedAt": "2025-12-01T10:00:00Z"
    }
  ],
  "totalItems": 5
}
```

---

### Add to Wishlist

**POST** `/wishlist`

Add product to wishlist.

**Authentication:** Required (CUSTOMER)

**Request Body:**
```json
{
  "productId": "uuid"
}
```

**Response (201):**
```json
{
  "message": "Product added to wishlist",
  "item": { /* wishlist item */ }
}
```

---

### Remove from Wishlist

**DELETE** `/wishlist/:productId`

Remove product from wishlist.

**Authentication:** Required (CUSTOMER)

**Response (200):**
```json
{
  "message": "Product removed from wishlist"
}
```

---

### Check if in Wishlist

**GET** `/wishlist/check/:productId`

Check if product is in wishlist.

**Authentication:** Required (CUSTOMER)

**Response (200):**
```json
{
  "inWishlist": true
}
```

---

## Notifications

### Get Notifications

**GET** `/notifications`

Get user's notifications.

**Authentication:** Required

**Query Parameters:**
- `unreadOnly` (boolean): Filter unread only
- `page` (number): Page number
- `limit` (number): Items per page

**Response (200):**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "ORDER_PLACED",
      "title": "New Order Received! 🎉",
      "message": "Order #ORD-ABC123 for $1,453.98",
      "data": {
        "orderId": "uuid",
        "orderNumber": "ORD-ABC123"
      },
      "isRead": false,
      "createdAt": "2025-12-01T10:00:00Z"
    }
  ],
  "pagination": { /* pagination object */ }
}
```

**Notification Types:**
- `ORDER_PLACED` - Vendor notified of new order
- `ORDER_STATUS_CHANGED` - Customer notified of status change
- `ORDER_CANCELLED` - Customer notified of cancellation
- `PRODUCT_REVIEWED` - Vendor notified of new review

---

### Get Unread Count

**GET** `/notifications/unread-count`

Get count of unread notifications.

**Authentication:** Required

**Response (200):**
```json
{
  "count": 5
}
```

---

### Mark as Read

**PUT** `/notifications/:id/read`

Mark notification as read.

**Authentication:** Required

**Response (200):**
```json
{
  "message": "Notification marked as read"
}
```

---

### Mark All as Read

**PUT** `/notifications/read-all`

Mark all notifications as read.

**Authentication:** Required

**Response (200):**
```json
{
  "message": "All notifications marked as read"
}
```

---

## Payments

### Create Payment Intent

**POST** `/payments/create-intent`

Create payment intent for order.

**Authentication:** Required (CUSTOMER)

**Request Body:**
```json
{
  "orderId": "uuid"
}
```

**Response (200):**
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx",
  "amount": 1453.98
}
```

---

### Get Payment Status

**GET** `/payments/status/:orderId`

Get payment status for order.

**Authentication:** Required (CUSTOMER)

**Response (200):**
```json
{
  "orderId": "uuid",
  "paymentStatus": "SUCCEEDED",
  "paymentIntentId": "pi_xxx",
  "amount": 1453.98
}
```

**Payment Statuses:**
- `PENDING` - Not yet processed
- `PROCESSING` - Payment in progress
- `SUCCEEDED` - Payment successful
- `FAILED` - Payment failed
- `REFUNDED` - Payment refunded

---

### Process Refund

**POST** `/payments/refund`

Process full or partial refund.

**Authentication:** Required (VENDOR or ADMIN)

**Request Body:**
```json
{
  "orderId": "uuid",
  "amount": 1453.98,
  "reason": "requested_by_customer"
}
```

**Refund Reasons:**
- `requested_by_customer`
- `duplicate`
- `fraudulent`

**Response (200):**
```json
{
  "message": "Full refund processed successfully",
  "refund": {
    "id": "re_xxx",
    "amount": 1453.98,
    "status": "succeeded",
    "reason": "requested_by_customer"
  }
}
```

---

### Get Refund Details

**GET** `/payments/refund/:refundId`

Get refund information.

**Authentication:** Required

**Response (200):**
```json
{
  "id": "re_xxx",
  "amount": 1453.98,
  "status": "succeeded",
  "reason": "requested_by_customer",
  "created": "2025-12-01T10:00:00Z"
}
```

---

### Get Customer Payment History

**GET** `/payments/history/customer`

Get customer's payment history.

**Authentication:** Required (CUSTOMER)

**Query Parameters:**
- `status` (string): Filter by status
- `page` (number): Page number
- `limit` (number): Items per page

**Response (200):**
```json
{
  "payments": [
    {
      "id": "uuid",
      "orderNumber": "ORD-ABC123",
      "total": 1453.98,
      "paymentStatus": "SUCCEEDED",
      "stripePaymentIntentId": "pi_xxx",
      "createdAt": "2025-12-01T10:00:00Z",
      "vendor": {
        "businessName": "Furniture Co"
      }
    }
  ],
  "pagination": { /* pagination object */ },
  "summary": {
    "totalSpent": 15432.50
  }
}
```

---

### Get Vendor Payment History

**GET** `/payments/history/vendor`

Get vendor's payment/earnings history.

**Authentication:** Required (VENDOR)

**Query Parameters:** Same as customer

**Response (200):**
```json
{
  "payments": [
    {
      "id": "uuid",
      "orderNumber": "ORD-ABC123",
      "total": 1453.98,
      "commission": 87.24,
      "netAmount": 1366.74,
      "paymentStatus": "SUCCEEDED",
      "createdAt": "2025-12-01T10:00:00Z",
      "customer": {
        "user": {
          "firstName": "John",
          "lastName": "Doe"
        }
      }
    }
  ],
  "pagination": { /* pagination object */ },
  "summary": {
    "totalEarnings": 118137.79,
    "totalCommission": 7540.71,
    "grossSales": 125678.50
  }
}
```

---

### Get Payment Details

**GET** `/payments/history/details/:orderId`

Get detailed payment information.

**Authentication:** Required

**Response (200):**
```json
{
  "order": {
    "id": "uuid",
    "orderNumber": "ORD-ABC123",
    "total": 1453.98,
    "subtotal": 1299.99,
    "tax": 103.99,
    "shippingCost": 50,
    "commission": 87.24,
    "netAmount": 1366.74,
    "paymentStatus": "SUCCEEDED",
    "status": "CONFIRMED",
    "stripePaymentIntentId": "pi_xxx",
    "createdAt": "2025-12-01T10:00:00Z"
  },
  "items": [ /* order items */ ],
  "vendor": { /* vendor info */ },
  "customer": { /* customer info (if vendor/admin) */ },
  "address": { /* shipping address */ }
}
```

---

### Webhook (Stripe)

**POST** `/payments/webhook`

Receive Stripe webhook events (public endpoint).

**No Authentication Required**

This endpoint is called by Stripe to notify about payment events. It's automatically handled by the system.

---

## Search

### Search Products

**GET** `/search`

Search products with advanced filters.

**Query Parameters:**
- `q` (string): Search query
- `categoryId` (string): Filter by category
- `vendorId` (string): Filter by vendor
- `minPrice` (number): Minimum price
- `maxPrice` (number): Maximum price
- `materials` (string): Comma-separated materials
- `colors` (string): Comma-separated colors
- `roomType` (string): Room type filter
- `style` (string): Style filter
- `sort` (string): Sort field:direction (e.g., "price:asc")
- `page` (number): Page number
- `limit` (number): Items per page

**Examples:**
```
GET /search?q=velvet sofa
GET /search?q=modern&minPrice=500&maxPrice=2000
GET /search?q=&categoryId=abc123&colors=blue,gray
GET /search?q=furniture&materials=oak,leather&sort=price:asc
```

**Response (200):**
```json
{
  "query": "velvet sofa",
  "hits": [
    {
      "id": "uuid",
      "name": "Luxury Velvet Sofa",
      "description": "Elegant 3-seater...",
      "price": 1299.99,
      "compareAtPrice": 1799.99,
      "images": ["url"],
      "categoryName": "Sofas",
      "vendorName": "Furniture Co",
      "rating": 4.5,
      "totalReviews": 24,
      "stockQuantity": 15
    }
  ],
  "totalHits": 1,
  "page": 1,
  "limit": 20,
  "totalPages": 1,
  "processingTimeMs": 5
}
```

**Search Features:**
- ✅ Full-text search across name, description, category, vendor
- ✅ Instant results (sub-50ms)
- ✅ Typo tolerance for longer words
- ✅ Advanced filtering (price, category, materials, colors, etc.)
- ✅ Sorting options
- ✅ Pagination

---

## Error Handling

### Standard Error Response

All errors follow this format:
```json
{
  "error": "Error message description"
}
```

### HTTP Status Codes

- `200` - OK (Success)
- `201` - Created (Resource created successfully)
- `400` - Bad Request (Validation error or invalid data)
- `401` - Unauthorized (Missing or invalid authentication)
- `403` - Forbidden (Insufficient permissions)
- `404` - Not Found (Resource doesn't exist)
- `429` - Too Many Requests (Rate limit exceeded)
- `500` - Internal Server Error (Server error)

### Common Error Messages

**Authentication Errors:**
```json
{ "error": "Invalid credentials" }
{ "error": "Token expired" }
{ "error": "Access denied" }
```

**Validation Errors:**
```json
{ "error": "Email already exists" }
{ "error": "Price must be a positive number" }
{ "error": "Product not found" }
```

**Payment Errors:**
```json
{ 
  "error": "Your card was declined. Please try a different payment method.",
  "code": "card_declined",
  "type": "card_error"
}
```

**Rate Limit Error:**
```json
{ "error": "Too many requests, please try again later" }
```

### Payment Error Codes

Detailed payment errors include:
- `card_declined` - Card was declined
- `insufficient_funds` - Not enough funds
- `expired_card` - Card has expired
- `incorrect_cvc` - Invalid security code
- `processing_error` - Payment processor error
- `authentication_required` - 3D Secure required

---

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **General endpoints:** 100 requests per 15 minutes per IP
- **Authenticated endpoints:** 1000 requests per 15 minutes per user
- **Search endpoint:** 60 requests per minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1638360000
```

---

## Pagination

All list endpoints support pagination:

**Request:**
```
GET /products?page=2&limit=20
```

**Response:**
```json
{
  "products": [ /* array of items */ ],
  "pagination": {
    "page": 2,
    "limit": 20,
    "totalCount": 150,
    "totalPages": 8
  }
}
```

---

## Payment Methods Supported

The platform supports 10+ payment methods through Stripe:

- ✅ **Credit/Debit Cards** - Visa, Mastercard, Amex, Discover, etc.
- ✅ **Apple Pay** - iPhone, iPad, Mac users
- ✅ **Google Pay** - Android users
- ✅ **Link** - Stripe's instant checkout
- ✅ **Cash App Pay** - US users
- ✅ **Klarna** - Buy now, pay later
- ✅ **Afterpay/Clearpay** - Buy now, pay later
- ✅ **Affirm** - Buy now, pay later (US)
- ✅ **ACH Direct Debit** - Bank transfers (US)

All payment methods use the same endpoints. The frontend determines which methods to display based on customer location and device.

---

## Webhook Events

System sends webhooks for Stripe events. Configure webhook URL in Stripe Dashboard.

**Events Handled:**
- `payment_intent.succeeded` - Payment successful
- `payment_intent.payment_failed` - Payment failed
- `charge.refunded` - Refund processed

---

## Testing

### Test Mode

Use Stripe test mode for development:
- Test API keys start with `sk_test_` and `pk_test_`
- No real charges processed
- Use test card numbers

### Test Cards

**Success:**
```
Card: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
```

**Decline:**
```
Card: 4000 0000 0000 0002
```

**3D Secure:**
```
Card: 4000 0027 6000 3184
```

### Test Credentials

Create test accounts:
```json
{
  "email": "customer@test.com",
  "password": "TestPass123!",
  "role": "CUSTOMER"
}
```
```json
{
  "email": "vendor@test.com",
  "password": "TestPass123!",
  "role": "VENDOR"
}
```

---

## Environment Variables

Required environment variables:
```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/furniture_db

# JWT
JWT_SECRET=your-secret-key-here

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# Stripe
STRIPE_SECRET_KEY=sk_test_your-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-secret

# Meilisearch
MEILISEARCH_HOST=https://your-instance.meilisearch.io
MEILISEARCH_ADMIN_KEY=your-admin-key
MEILISEARCH_SEARCH_KEY=your-search-key

# Email (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM_NAME=Furniture Marketplace

# Frontend URL
FRONTEND_URL=http://localhost:3001
```

---

## Support

For API support or questions:
- **Documentation:** This file
- **Issues:** Create GitHub issue
- **Email:** support@yourplatform.com

---

**Last Updated:** December 2025  
**Version:** 1.0  
**API Base URL:** `http://localhost:3000/api`
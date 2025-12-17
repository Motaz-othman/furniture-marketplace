import { z } from 'zod';

// Auth validation schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  role: z.enum(['CUSTOMER', 'VENDOR', 'ADMIN']).optional(),
  businessName: z.string().max(100).optional()
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

// Product validation schemas
export const createProductSchema = z.object({
  vendorId: z.string().uuid('Invalid vendor ID'),
  categoryId: z.string().uuid('Invalid category ID'),
  name: z.string().min(1, 'Product name is required').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.number().positive('Price must be positive'),
  compareAtPrice: z.number().positive().optional(),
  sku: z.string().max(50).nullable().optional(),
  stockQuantity: z.number().int().min(0, 'Stock cannot be negative').optional(),
  images: z.array(z.string().url('Invalid image URL')).optional(),
  
  // Furniture-specific fields
  dimensions: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
    depth: z.number().positive(),
    weight: z.number().positive(),
    unit: z.enum(['cm', 'inch'])
  }).optional(),
  materials: z.array(z.string().max(50)).optional(),
  colors: z.array(z.string().max(30)).optional(),
  roomType: z.enum(['Living Room', 'Bedroom', 'Dining Room', 'Office', 'Kitchen', 'Bathroom', 'Outdoor', 'Kids Room']).optional(),
  style: z.enum(['Modern', 'Traditional', 'Rustic', 'Contemporary', 'Industrial', 'Minimalist', 'Vintage', 'Scandinavian', 'Mid-Century Modern', 'Bohemian', 'Farmhouse', 'Coastal', 'Art Deco', 'Transitional', 'Eclectic']).optional(),
  assemblyRequired: z.boolean().optional(),
  brand: z.string().max(100).optional(),
  warranty: z.string().max(200).optional(),
  careInstructions: z.string().max(500).optional()
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().min(10).optional(),
  price: z.number().positive().optional(),
  compareAtPrice: z.number().positive().optional(),
  sku: z.string().max(50).nullable().optional(),
  stockQuantity: z.number().int().min(0).optional(),
  images: z.array(z.string().url()).optional(),
  isActive: z.boolean().optional(),
  
  // Furniture-specific fields
  dimensions: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
    depth: z.number().positive(),
    weight: z.number().positive(),
    unit: z.enum(['cm', 'inch'])
  }).optional(),
  materials: z.array(z.string().max(50)).optional(),
  colors: z.array(z.string().max(30)).optional(),
  roomType: z.enum(['Living Room', 'Bedroom', 'Dining Room', 'Office', 'Kitchen', 'Bathroom', 'Outdoor', 'Kids Room']).optional(),
  style: z.enum(['Modern', 'Traditional', 'Rustic', 'Contemporary', 'Industrial', 'Minimalist', 'Vintage', 'Scandinavian', 'Mid-Century Modern', 'Bohemian', 'Farmhouse', 'Coastal', 'Art Deco', 'Transitional', 'Eclectic']).optional(),
  assemblyRequired: z.boolean().optional(),
  brand: z.string().max(100).optional(),
  warranty: z.string().max(200).optional(),
  careInstructions: z.string().max(500).optional()
});

// Category validation schemas
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens').optional(),
  description: z.string().max(500).optional(),
  image: z.string().url('Invalid image URL').optional()
});

// Cart validation schemas
export const addToCartSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  variantId: z.string().uuid('Invalid variant ID').optional(), // ← ADD THIS LINE
  quantity: z.number().int().positive('Quantity must be at least 1').max(100, 'Maximum quantity is 100')
});

export const updateCartSchema = z.object({
  quantity: z.number().int().positive('Quantity must be at least 1').max(100)
});

// Order validation schemas
export const createOrderSchema = z.object({
  addressId: z.string().uuid('Invalid address ID'),
  notes: z.string().max(500).optional()
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
  trackingNumber: z.string().max(100).optional(), // ← ADD THIS LINE
  trackingUrl: z.string().url('Invalid tracking URL').optional() // ← ADD THIS LINE
});

// Address validation schemas
export const createAddressSchema = z.object({
  street: z.string().min(1, 'Street is required').max(200),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(2, 'State is required').max(50),
  zipCode: z.string().min(4, 'Zip code is required').max(10),
  country: z.string().length(2, 'Country code must be 2 letters').optional(),
  isDefault: z.boolean().optional()
});

// Vendor validation schemas
export const updateVendorProfileSchema = z.object({
  businessName: z.string().min(2).max(100).optional(),
  description: z.string().max(1000).optional(),
  logo: z.string().url('Invalid logo URL').optional(),
  businessPhone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone format').optional(),
  businessEmail: z.string().email('Invalid email').optional(),
  address: z.object({
    street: z.string().min(1).max(200),
    city: z.string().min(1).max(100),
    state: z.string().min(2).max(50),
    zipCode: z.string().min(4).max(10),
    country: z.string().length(2, 'Country code must be 2 letters')
  }).optional(),
  shippingZones: z.array(z.string().length(2, 'State code must be 2 letters')).max(50).optional(),
  returnPolicy: z.string().max(500).optional(),
  shippingPolicy: z.string().max(500).optional()
});
// User profile validation schemas
export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  email: z.string().email().optional()
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6).max(100)
});

// Review validation schemas
export const createReviewSchema = z.object({
  productId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional()
});

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(500).optional()
});

// Wishlist validation schema
export const addToWishlistSchema = z.object({
  productId: z.string().uuid()
});

// Password reset validation schemas
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address')
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters').max(100)
});
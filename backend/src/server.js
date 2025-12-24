import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import authRoutes from './modules/auth/auth.routes.js';
import productsRoutes from './modules/products/products.routes.js';
import categoriesRoutes from './modules/categories/categories.routes.js';
import cartRoutes from './modules/cart/cart.routes.js';
import ordersRoutes from './modules/orders/orders.routes.js';
import vendorsRoutes from './modules/vendors/vendors.routes.js';
import customersRoutes from './modules/customers/customers.routes.js';
import reviewsRoutes from './modules/reviews/reviews.routes.js';
import wishlistRoutes from './modules/wishlist/wishlist.routes.js';
import uploadRoutes from './modules/upload/upload.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import paymentsRoutes from './modules/payments/payments.routes.js';
import searchRoutes from './modules/search/search.routes.js';
import variantsRoutes from './modules/products/variants.routes.js';
import addressesRoutes from './modules/addresses/addresses.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';



import { apiLimiter } from './shared/middleware/rateLimiter.js';
import { errorHandler } from './shared/middleware/errorHandler.js';

// ✅ WEBHOOK ROUTE FIRST (with raw body for Stripe signature verification)


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ THEN add webhook route
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req, res, next) => {
  const { handleStripeWebhook } = await import('./modules/payments/webhook.controller.js');
  return handleStripeWebhook(req, res, next);
});

// Security middleware
app.use(helmet()); // Add security headers
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Limit body size to 10MB
app.use(apiLimiter); // Apply rate limiting to all routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Furniture Marketplace API is running!',
    timestamp: new Date().toISOString()
  });
});


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/vendors', vendorsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api', variantsRoutes);
app.use('/api/addresses', addressesRoutes);
app.use('/api/admin', adminRoutes);


// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔒 Security: Rate limiting, Validation, Headers, Error handling`);
});
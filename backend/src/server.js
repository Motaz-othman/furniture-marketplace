import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { exec } from 'child_process';
import authRoutes from './modules/auth/auth.routes.js';
import productsRoutes from './modules/products/products.routes.js';
import categoriesRoutes from './modules/categories/categories.routes.js';
import cartRoutes from './modules/cart/cart.routes.js';
import ordersRoutes from './modules/orders/orders.routes.js';
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
import storefrontListingsRoutes from './modules/storefront/listings.routes.js';
import syncRoutes from './modules/sync/sync.routes.js';
import checkoutRoutes from './modules/checkout/guest.routes.js';
import settingsRoutes from './modules/settings/settings.routes.js';
import newsletterRoutes from './modules/newsletter/newsletter.routes.js';
import { initScheduler } from './shared/services/sync.service.js';
import { registry } from './integrations/index.js';
import integrationsRoutes from './integrations/router.js';




import { apiLimiter } from './shared/middleware/rateLimiter.js';
import { errorHandler } from './shared/middleware/errorHandler.js';

// ✅ WEBHOOK ROUTE FIRST (with raw body for Stripe signature verification)


dotenv.config();

// ── Validate required environment variables at startup ──────────────
const isProduction = process.env.NODE_ENV === 'production';
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    const msg = `Missing required environment variable: ${key}`;
    if (isProduction) { console.error(`❌ ${msg}`); process.exit(1); }
    else console.warn(`⚠️  ${msg}`);
  }
}
if (process.env.JWT_SECRET && (process.env.JWT_SECRET === 'your_jwt_secret_here' || process.env.JWT_SECRET.length < 32)) {
  const msg = 'JWT_SECRET is too weak or is a placeholder. Set a strong random string (min 32 chars).';
  if (isProduction) { console.error(`❌ ${msg}`); process.exit(1); }
  else console.warn(`⚠️  ${msg}`);
}
if (process.env.STRIPE_SECRET_KEY && (process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder' || !process.env.STRIPE_SECRET_KEY.startsWith('sk_'))) {
  const msg = 'STRIPE_SECRET_KEY is invalid or placeholder. Set a real Stripe secret key.';
  if (isProduction) { console.error(`❌ ${msg}`); process.exit(1); }
  else console.warn(`⚠️  ${msg}`);
}

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ THEN add webhook route
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req, res, next) => {
  const { handleStripeWebhook } = await import('./modules/payments/webhook.controller.js');
  return handleStripeWebhook(req, res, next);
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  frameguard: { action: 'deny' },
}));
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3001'];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    // In development, allow all origins
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    // In production, check against allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(apiLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Furniture Marketplace API is running!',
    timestamp: new Date().toISOString()
  });
});


// Routes
app.use('/api/settings', settingsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api', variantsRoutes);
app.use('/api/addresses', addressesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/storefront', storefrontListingsRoutes);
app.use('/api/admin/sync', syncRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/newsletter', newsletterRoutes);


// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
  // Load all integrations
  await registry.loadAll();

  // Start sync scheduler (if enabled via env)
  initScheduler();

  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📦 Integrations loaded: ${registry.getCodes().join(', ') || 'none'}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${PORT} in use — killing existing process...`);
      exec(`lsof -ti:${PORT} | xargs kill -9`, () => {
        server.close();
        setTimeout(() => server.listen(PORT), 500);
      });
    } else {
      throw err;
    }
  });
};

startServer();
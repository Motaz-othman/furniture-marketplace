# Furniture Marketplace Backend

Professional REST API for a multi-vendor furniture marketplace platform.

## 🚀 Features

- ✅ **Multi-vendor marketplace** with vendor onboarding
- ✅ **10+ payment methods** via Stripe (Apple Pay, Google Pay, cards, BNPL)
- ✅ **Split payments** with automatic vendor payouts
- ✅ **Advanced search** with Meilisearch (instant, typo-tolerant)
- ✅ **Real-time notifications** for orders and reviews
- ✅ **Secure authentication** with JWT
- ✅ **Image uploads** to AWS S3
- ✅ **Transaction-safe orders** with stock management
- ✅ **Purchase-verified reviews** with auto-ratings
- ✅ **Rate limiting** and security headers
- ✅ **Comprehensive refund system**
- ✅ **Payment history tracking**

## 📋 Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Search:** Meilisearch Cloud
- **Payments:** Stripe Connect
- **Storage:** AWS S3
- **Authentication:** JWT
- **Validation:** Zod

## 🏗️ Architecture
```
backend/
├── src/
│   ├── modules/          # Feature modules
│   │   ├── auth/         # Authentication
│   │   ├── products/     # Product management
│   │   ├── orders/       # Order processing
│   │   ├── payments/     # Payment handling
│   │   ├── search/       # Meilisearch integration
│   │   └── ...
│   ├── shared/
│   │   ├── config/       # Database, env config
│   │   ├── middleware/   # Auth, validation, rate limiting
│   │   ├── services/     # External services (Stripe, S3, etc.)
│   │   └── utils/        # Helpers, validation schemas
│   ├── scripts/          # Utility scripts
│   └── server.js         # App entry point
├── prisma/
│   └── schema.prisma     # Database schema
├── .env                  # Environment variables
└── package.json
```

## 🚦 Quick Start

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database
- Stripe account (test mode)
- Meilisearch Cloud account
- AWS S3 bucket

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. **Set up database:**
```bash
npx prisma db push
```

4. **Sync search index:**
```bash
npm run sync-search
```

5. **Start development server:**
```bash
npm run dev
```

Server runs on `http://localhost:3000`

## 📚 Documentation

- **[API Documentation](./API_DOCUMENTATION.md)** - Complete API reference
- **[Payment Methods](./PAYMENT_METHODS.md)** - Supported payment methods
- **[Deployment Guide](./DEPLOYMENT.md)** - Production deployment

## 🔑 Environment Variables

Create `.env` file with these variables:
```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/furniture_db

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars

# AWS S3
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Meilisearch
MEILISEARCH_HOST=https://ms-xxx.meilisearch.io
MEILISEARCH_ADMIN_KEY=your-admin-key
MEILISEARCH_SEARCH_KEY=your-search-key

# Email (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Frontend
FRONTEND_URL=http://localhost:3001
```

## 🧪 Testing

### Test Accounts

Create test accounts for different roles:

**Customer:**
```bash
POST /api/auth/register
{
  "email": "customer@test.com",
  "password": "TestPass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "CUSTOMER"
}
```

**Vendor:**
```bash
POST /api/auth/register
{
  "email": "vendor@test.com",
  "password": "TestPass123!",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "VENDOR"
}
```

### Test Payments

Use Stripe test cards:
- **Success:** 4242 4242 4242 4242
- **Decline:** 4000 0000 0000 0002
- **3D Secure:** 4000 0027 6000 3184

All test cards: Expiry (any future date), CVC (any 3 digits)

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `POST /api/auth/forgot-password` - Request reset
- `POST /api/auth/reset-password` - Reset password
- `PUT /api/auth/change-password` - Change password

### Products
- `GET /api/products` - List products
- `GET /api/products/:id` - Get product
- `POST /api/products` - Create product (vendor)
- `PUT /api/products/:id` - Update product (vendor)
- `DELETE /api/products/:id` - Delete product (vendor)

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders/customer` - Customer orders
- `GET /api/orders/vendor` - Vendor orders
- `PATCH /api/orders/:id/status` - Update status (vendor)
- `DELETE /api/orders/:id` - Cancel order

### Payments
- `POST /api/payments/create-intent` - Create payment
- `GET /api/payments/status/:orderId` - Payment status
- `POST /api/payments/refund` - Process refund
- `GET /api/payments/history/customer` - Payment history
- `GET /api/payments/history/vendor` - Earnings history

### Search
- `GET /api/search` - Search products

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete reference.

## 💳 Payment Flow

1. **Customer adds items to cart**
2. **Customer creates order** → Payment intent created
3. **Frontend collects payment** (Stripe.js)
4. **Stripe processes payment**
5. **Webhook confirms payment** → Order auto-confirmed
6. **Vendor receives notification**
7. **Money split automatically** (vendor gets net amount, platform keeps commission)

## 🔍 Search Features

- **Instant search** - Sub-50ms response time
- **Typo tolerance** - Finds results despite misspellings
- **Multi-field search** - Name, description, category, vendor
- **Advanced filters** - Price, category, materials, colors, room type, style
- **Sorting** - Price, rating, date, name
- **Pagination** - Handle thousands of results

## 🔒 Security

- ✅ JWT authentication
- ✅ Password hashing (bcrypt)
- ✅ Input validation (Zod)
- ✅ Rate limiting (100 req/15min)
- ✅ CORS configuration
- ✅ Security headers (Helmet)
- ✅ SQL injection prevention (Prisma)
- ✅ XSS protection

## 📊 Database Schema

12 models:
- User, Customer, Vendor
- Product, Category
- Cart, CartItem
- Order, OrderItem
- Review
- Wishlist
- Notification

See `prisma/schema.prisma` for full schema.

## 🛠️ Scripts
```bash
# Development
npm run dev              # Start dev server with hot reload

# Database
npx prisma db push       # Push schema to database
npx prisma studio        # Open Prisma Studio (DB GUI)

# Search
npm run sync-search      # Sync all products to Meilisearch
```

## 📈 Performance

- **API Response Time:** < 100ms average
- **Search Response Time:** < 50ms
- **Database Queries:** Optimized with indexes
- **Rate Limiting:** 100 req/15min (unauthenticated)
- **Pagination:** Handle 10,000+ products

## 🌟 Key Features Explained

### Multi-Vendor Support
- Each order is split by vendor
- Separate orders created for items from different vendors
- Each vendor manages their own products and orders

### Stripe Connect Integration
- Vendors connect their Stripe accounts
- Automatic split payments (vendor amount - commission)
- Platform commission (6% default) auto-deducted
- Vendors can access Stripe dashboard

### Stock Management
- Transaction-safe stock updates
- Stock reserved during checkout
- Stock restored on order cancellation
- Out-of-stock prevention

### Notifications
- Real-time in-app notifications
- ORDER_PLACED - Vendor notified
- ORDER_STATUS_CHANGED - Customer notified
- ORDER_CANCELLED - Customer notified
- PRODUCT_REVIEWED - Vendor notified

### Auto-Rating System
- Product ratings auto-calculated
- Vendor ratings auto-calculated
- Updates on review create/update/delete

## 🐛 Troubleshooting

**Database connection fails:**
```bash
# Check DATABASE_URL in .env
# Ensure PostgreSQL is running
```

**Meilisearch not working:**
```bash
# Run sync script
npm run sync-search

# Check MEILISEARCH_HOST and keys in .env
```

**Stripe webhooks not working:**
```bash
# For local testing, use Stripe CLI:
stripe listen --forward-to localhost:3000/api/payments/webhook
```

**Image upload fails:**
```bash
# Check AWS credentials in .env
# Verify S3 bucket permissions
```

## 📝 To-Do (Optional Features)

- [ ] Email notifications (SMTP configured, disabled)
- [ ] Admin dashboard
- [ ] Analytics/reporting
- [ ] Saved payment methods
- [ ] Dispute handling
- [ ] Multiple currencies
- [ ] Tax calculation API

## 🤝 Contributing

This is a production-ready MVP. Future enhancements welcome!

## 📄 License

Proprietary - All rights reserved

## 👥 Authors

Built with ❤️ for furniture marketplace startups

---

**Status:** ✅ Production Ready  
**Version:** 1.0  
**Last Updated:** December 2025
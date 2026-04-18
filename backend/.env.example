# ─── Server ───────────────────────────────────────────────
PORT=3000
NODE_ENV=development                        # Set to "production" on server

# ─── Database ─────────────────────────────────────────────
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/furniture_marketplace

# ─── Authentication ───────────────────────────────────────
JWT_SECRET=                                 # Strong random string (min 32 chars)

# ─── CORS ─────────────────────────────────────────────────
ALLOWED_ORIGINS=https://yourstore.vercel.app
FRONTEND_URL=https://yourstore.vercel.app

# ─── Stripe ───────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_live_...               # sk_test_... for staging
STRIPE_WEBHOOK_SECRET=whsec_...            # From Stripe dashboard after registering webhook

# ─── Meilisearch ──────────────────────────────────────────
MEILISEARCH_HOST=https://your-meilisearch-host
MEILISEARCH_ADMIN_KEY=                     # Master key from Meilisearch instance

# ─── AWS S3 (file uploads) ────────────────────────────────
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
SYNC_IMAGES_TO_S3=false                    # Set to true to sync product images to S3

# ─── Email ────────────────────────────────────────────────
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASSWORD=                            # Use an App Password, not your account password
EMAIL_FROM_NAME=Furniture Marketplace

# ─── Wondersign Integration (not yet active) ──────────────
WONDERSIGN_API_URL=https://api.wondersign.com
WONDERSIGN_API_KEY=
WONDERSIGN_MODE=sandbox                    # Change to "production" when live
WONDERSIGN_PAGE_SIZE=100

# ─── Sync Scheduler ───────────────────────────────────────
SYNC_INCREMENTAL_ENABLED=false
SYNC_INCREMENTAL_INTERVAL=*/15 * * * *
SYNC_FULL_ENABLED=false
SYNC_FULL_INTERVAL=0 2 * * *

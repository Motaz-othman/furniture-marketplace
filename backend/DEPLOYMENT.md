# Deployment Guide

Production deployment guide for the Furniture Marketplace Backend.

## 📋 Pre-Deployment Checklist

### 1. Code Ready
- ✅ All features tested locally
- ✅ Environment variables configured
- ✅ Database schema finalized
- ✅ API documentation complete

### 2. Services Setup
- ✅ Production database (PostgreSQL)
- ✅ Stripe account (live mode)
- ✅ Meilisearch Cloud (production plan)
- ✅ AWS S3 bucket (production)
- ✅ Domain name purchased
- ✅ SSL certificate ready

### 3. Security
- ✅ Strong JWT secret (32+ characters)
- ✅ Rate limiting configured
- ✅ CORS origins set
- ✅ Webhook secrets configured
- ✅ API keys secured

---

## 🚀 Deployment Options

### Option 1: Railway (Recommended for MVP)

**Pros:**
- Easy setup
- Free tier available
- Automatic deployments
- Built-in PostgreSQL
- Environment variable management

**Steps:**

1. **Create Railway Account**
   - Go to: https://railway.app
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your repository

3. **Add PostgreSQL**
   - Click "+ New"
   - Select "Database" → "PostgreSQL"
   - Copy `DATABASE_URL`

4. **Configure Environment Variables**
   - Go to project → Variables
   - Add all variables from `.env`:
```
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=(auto-provided)
   JWT_SECRET=your-production-secret-min-32-chars
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=your-production-bucket
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   MEILISEARCH_HOST=...
   MEILISEARCH_ADMIN_KEY=...
   MEILISEARCH_SEARCH_KEY=...
   FRONTEND_URL=https://your-frontend.com
```

5. **Deploy**
   - Railway auto-deploys on push
   - Get your URL: `https://your-app.railway.app`

6. **Run Database Migration**
   - In Railway dashboard → CLI
```bash
   npx prisma db push
```

7. **Sync Search Index**
```bash
   npm run sync-search
```

**Cost:** ~$5-20/month depending on usage

---

### Option 2: Render

**Pros:**
- Free tier with limitations
- Easy PostgreSQL setup
- Automatic SSL

**Steps:**

1. **Create Render Account**
   - Go to: https://render.com
   - Sign up

2. **Create Web Service**
   - New → Web Service
   - Connect GitHub repo
   - Settings:
     - Build Command: `npm install && npx prisma generate`
     - Start Command: `node src/server.js`

3. **Add PostgreSQL**
   - New → PostgreSQL
   - Copy internal database URL

4. **Environment Variables**
   - Add all variables in Environment section

5. **Deploy**
   - Render auto-deploys

**Cost:** Free tier available (limited), Paid: $7+/month

---

### Option 3: AWS (EC2 + RDS)

**Pros:**
- Full control
- Scalable
- Professional setup

**Steps:**

1. **Launch EC2 Instance**
   - Ubuntu 22.04 LTS
   - t2.small or larger
   - Configure security group (ports 22, 80, 443, 3000)

2. **Launch RDS PostgreSQL**
   - PostgreSQL 15
   - db.t3.micro or larger
   - Configure security group (port 5432)

3. **SSH into EC2**
```bash
   ssh -i your-key.pem ubuntu@your-ec2-ip
```

4. **Install Dependencies**
```bash
   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install Node.js 18
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs

   # Install PM2
   sudo npm install -g pm2

   # Install nginx
   sudo apt install -y nginx

   # Install certbot (SSL)
   sudo apt install -y certbot python3-certbot-nginx
```

5. **Clone Repository**
```bash
   cd /var/www
   sudo git clone your-repo.git backend
   cd backend
   sudo npm install
```

6. **Configure Environment**
```bash
   sudo nano .env
   # Paste production variables
```

7. **Run Migrations**
```bash
   npx prisma generate
   npx prisma db push
   npm run sync-search
```

8. **Start with PM2**
```bash
   pm2 start src/server.js --name furniture-api
   pm2 startup
   pm2 save
```

9. **Configure Nginx**
```bash
   sudo nano /etc/nginx/sites-available/api
```
```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
```
```bash
   sudo ln -s /etc/nginx/sites-available/api /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
```

10. **Setup SSL**
```bash
    sudo certbot --nginx -d api.yourdomain.com
```

**Cost:** ~$30-50/month (EC2 t2.small + RDS db.t3.micro)

---

### Option 4: DigitalOcean App Platform

**Pros:**
- Simple setup
- Managed service
- Good pricing

**Steps:**

1. **Create DigitalOcean Account**
   - Go to: https://www.digitalocean.com

2. **Create App**
   - Apps → Create App
   - Connect GitHub repo

3. **Add Database**
   - Resources → Add Database
   - PostgreSQL

4. **Configure Build**
   - Build Command: `npm install && npx prisma generate`
   - Run Command: `node src/server.js`

5. **Environment Variables**
   - Settings → Environment Variables
   - Add all production variables

6. **Deploy**
   - Click Deploy

**Cost:** ~$12+/month

---

## 🔐 Production Secrets

### Generate Strong JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Stripe Live Mode

1. Go to: https://dashboard.stripe.com
2. Toggle "Test mode" → OFF
3. Copy live keys: `sk_live_...` and `pk_live_...`
4. Update `.env` with live keys

### Stripe Webhook (Production)

1. Go to: Developers → Webhooks
2. Add endpoint: `https://api.yourdomain.com/api/payments/webhook`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
4. Copy signing secret: `whsec_...`
5. Update `.env`

---

## 🗄️ Database Setup

### PostgreSQL Production

**Recommended Providers:**
- Railway (built-in)
- AWS RDS
- DigitalOcean Managed Database
- Render PostgreSQL

**Minimum Specs:**
- 1GB RAM
- 10GB storage
- PostgreSQL 14+

**Connection String Format:**
```
postgresql://username:password@host:5432/database?sslmode=require
```

**Run Migrations:**
```bash
npx prisma db push
```

---

## 🔍 Meilisearch Production

### Upgrade to Production Plan

1. Go to: https://cloud.meilisearch.com
2. Upgrade from Free to Production
3. Choose region (closest to users)
4. Get production API keys
5. Update `.env`

### Sync Products
```bash
npm run sync-search
```

**Auto-sync is configured:** Products sync automatically on create/update/delete.

---

## ☁️ AWS S3 Production

### Create Production Bucket

1. Go to: AWS S3 Console
2. Create bucket:
   - Name: `your-app-production`
   - Region: Same as app server
   - Block public access: OFF (for product images)
3. Bucket policy:
```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicRead",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::your-app-production/*"
       }
     ]
   }
```
4. CORS configuration:
```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedOrigins": ["https://yourdomain.com"],
       "ExposeHeaders": ["ETag"]
     }
   ]
```

### Create IAM User

1. IAM → Users → Add user
2. Permissions: `AmazonS3FullAccess`
3. Get credentials (Access Key + Secret)
4. Update `.env`

---

## 🌐 Domain & DNS

### Configure Domain

**Example (Cloudflare):**

1. Add A record:
```
   Type: A
   Name: api
   Value: YOUR_SERVER_IP
```

2. Or CNAME (for Railway/Render):
```
   Type: CNAME
   Name: api
   Value: your-app.railway.app
```

### SSL Certificate

**Option 1: Let's Encrypt (Free)**
```bash
sudo certbot --nginx -d api.yourdomain.com
```

**Option 2: Cloudflare (Free)**
- Enable proxy (orange cloud)
- SSL/TLS → Full

---

## 📧 Email (Optional)

### Gmail SMTP

1. Enable 2FA on Gmail
2. Generate App Password
3. Update `.env`:
```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-16-char-app-password
```

### SendGrid (Better for production)

1. Sign up: https://sendgrid.com
2. Create API key
3. Update code to use SendGrid SDK

---

## 🔄 CI/CD Pipeline

### GitHub Actions (Optional)

Create: `.github/workflows/deploy.yml`
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run tests
        run: npm test
      
      - name: Deploy to Railway
        run: railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

---

## 📊 Monitoring

### Setup PM2 Monitoring (If using EC2)
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### View Logs
```bash
pm2 logs furniture-api
pm2 monit
```

### Health Check Endpoint

Add to `server.js`:
```javascript
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

---

## 🔧 Post-Deployment

### 1. Test All Endpoints
```bash
# Health check
curl https://api.yourdomain.com/health

# Register user
curl -X POST https://api.yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!","firstName":"Test","lastName":"User","role":"CUSTOMER"}'

# Test search
curl https://api.yourdomain.com/api/search?q=sofa
```

### 2. Configure Stripe Webhooks

Test webhook:
```bash
stripe trigger payment_intent.succeeded
```

### 3. Sync Meilisearch
```bash
npm run sync-search
```

### 4. Update Frontend

Update frontend `.env`:
```env
REACT_APP_API_URL=https://api.yourdomain.com/api
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

## 🚨 Troubleshooting

### Database Connection Issues
```bash
# Test connection
psql $DATABASE_URL

# Check Prisma
npx prisma db pull
```

### Stripe Webhooks Failing
```bash
# Check webhook logs
# Stripe Dashboard → Developers → Webhooks → Click endpoint

# Verify signature
# Make sure STRIPE_WEBHOOK_SECRET matches
```

### Meilisearch Not Returning Results
```bash
# Check connection
curl https://your-instance.meilisearch.io/health

# Re-sync
npm run sync-search
```

### Images Not Loading
```bash
# Check S3 bucket policy (public read)
# Check CORS configuration
# Verify AWS credentials
```

---

## 📈 Scaling

### When to Scale

- Response time > 500ms
- CPU usage > 80%
- Memory usage > 80%
- Database connections maxed

### Horizontal Scaling

**Load Balancer + Multiple Servers:**
1. Deploy multiple app instances
2. Use Nginx/AWS ALB for load balancing
3. Use Redis for session storage
4. Use managed database (RDS/Railway)

### Database Scaling

**Read Replicas:**
- Use for GET requests
- Master for writes
- Prisma supports read replicas

### Caching

**Add Redis:**
```bash
npm install redis
```

Cache frequently accessed data:
- Product listings
- Categories
- Vendor profiles

---

## 💰 Estimated Costs

### MVP (0-1000 users)
- **Hosting:** $10-20/month (Railway/Render)
- **Database:** $0-10/month (included)
- **Meilisearch:** $0-50/month (free tier → basic)
- **AWS S3:** $1-5/month
- **Stripe:** 2.9% + $0.30 per transaction
- **Domain:** $10-15/year
- **SSL:** Free (Let's Encrypt)

**Total:** ~$25-100/month

### Growth (1000-10,000 users)
- **Hosting:** $50-100/month
- **Database:** $25-50/month
- **Meilisearch:** $50-100/month
- **AWS S3:** $10-30/month
- **CDN:** $10-30/month (CloudFront)

**Total:** ~$145-310/month

### Scale (10,000+ users)
- **Hosting:** $200-500/month (multiple servers)
- **Database:** $100-300/month (managed)
- **Meilisearch:** $100-200/month
- **AWS S3 + CDN:** $50-150/month
- **Monitoring:** $50-100/month

**Total:** ~$500-1250/month

---

## ✅ Production Checklist

Before going live:

- [ ] All environment variables set
- [ ] Database migrated
- [ ] Meilisearch synced
- [ ] Stripe live mode configured
- [ ] Stripe webhooks configured
- [ ] AWS S3 bucket configured
- [ ] Domain configured
- [ ] SSL certificate installed
- [ ] CORS origins set
- [ ] Rate limiting configured
- [ ] Error monitoring setup
- [ ] Backups configured
- [ ] All endpoints tested
- [ ] Documentation updated
- [ ] Frontend connected
- [ ] Test payments working
- [ ] Email service configured (optional)

---

## 🆘 Support Resources

- **Stripe Docs:** https://stripe.com/docs
- **Meilisearch Docs:** https://docs.meilisearch.com
- **Prisma Docs:** https://www.prisma.io/docs
- **Railway Docs:** https://docs.railway.app
- **AWS Docs:** https://docs.aws.amazon.com

---

**Good luck with your deployment!** 🚀

If you encounter issues, check logs first:
```bash
pm2 logs furniture-api --lines 100
```
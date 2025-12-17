# Supported Payment Methods

## Overview
Our platform supports 10+ payment methods through Stripe, giving customers maximum flexibility.

## Payment Methods

### 💳 Credit & Debit Cards
- **Brands:** Visa, Mastercard, American Express, Discover, Diners, JCB, UnionPay
- **Regions:** Global
- **Fee:** 2.9% + $0.30

### 🍎 Apple Pay
- **Devices:** iPhone, iPad, Mac, Apple Watch
- **Regions:** 60+ countries
- **Fee:** 2.9% + $0.30 (same as cards)
- **Speed:** Instant (Face ID / Touch ID)

### 📱 Google Pay
- **Devices:** Android phones, tablets, web browsers
- **Regions:** 40+ countries
- **Fee:** 2.9% + $0.30
- **Speed:** Instant (fingerprint / PIN)

### 🔗 Link by Stripe
- **What:** One-click checkout with saved payment info
- **Speed:** Instant (no re-entering details)
- **Fee:** 2.9% + $0.30

### 💵 Cash App Pay
- **Region:** US only
- **Users:** 50+ million Cash App users
- **Fee:** 2.9% + $0.30
- **Speed:** Instant

### 🛍️ Buy Now, Pay Later (BNPL)

#### Klarna
- **Regions:** US, UK, EU, Australia
- **Options:** Pay in 4, Pay in 30 days, Financing
- **Order Min:** $35
- **Order Max:** $10,000
- **Fee:** 5.99% + $0.30

#### Afterpay / Clearpay
- **Regions:** US, UK, Australia, Canada
- **Payment Plan:** 4 interest-free payments
- **Order Min:** $35
- **Order Max:** $4,000
- **Fee:** 6% + $0.30

#### Affirm
- **Region:** US only
- **Payment Plans:** 3, 6, 12 months
- **Order Min:** $50
- **Order Max:** $17,500
- **Fee:** 2.9% - 15% + $0.30 (varies by plan)

### 🏦 ACH Direct Debit (US Bank Transfers)
- **Region:** US only
- **Processing Time:** 3-5 business days
- **Fee:** 0.8% (capped at $5)
- **Best For:** Large orders ($1000+)

## International Payment Methods

### 🇳🇱 iDEAL (Netherlands)
- **Fee:** 0.29€

### 🇪🇺 SEPA Direct Debit (Europe)
- **Fee:** 0.8% (capped at €5)

### 🇨🇳 Alipay (China)
- **Fee:** 2.9% + $0.30

### 🇨🇳 WeChat Pay (China)
- **Fee:** 2.9% + $0.30

## Technical Details

### How It Works
1. Customer selects payment method at checkout
2. Payment method availability detected automatically (device/region)
3. Payment processed through Stripe
4. Webhook confirms payment
5. Order auto-confirmed

### Backend Support
- ✅ All payment methods use same backend code
- ✅ `automatic_payment_methods: { enabled: true }`
- ✅ Works with both regular and split payments (Stripe Connect)

### Frontend Integration
Use Stripe Payment Element (one component, all methods):
```javascript
<PaymentElement />
```

## Customer Experience

### Desktop Users See:
- Credit/Debit card input
- Link (if they've used it before)
- ACH bank transfer option
- Buy now, pay later options

### iPhone/Mac Users See:
- Apple Pay button (instant checkout)
- All desktop options

### Android Users See:
- Google Pay button (instant checkout)
- All desktop options

### US Users with Cash App See:
- Cash App Pay button
- All other options

## Conversion Rates

**Average Conversion Improvement:**
- Adding Apple Pay: +8-12%
- Adding Google Pay: +5-8%
- Adding BNPL: +15-30%
- Adding Link: +7-10%

**Combined:** Up to 40% conversion improvement!

## Testing

### Test Cards (Test Mode)
- **Success:** 4242 4242 4242 4242
- **Declined:** 4000 0000 0000 0002
- **3D Secure:** 4000 0027 6000 3184

### Test Wallets
- Add test card to Apple Wallet / Google Pay
- Use in Safari (Apple Pay) or Chrome (Google Pay)

### Test BNPL
- Available in test mode automatically
- No actual loan created

## Notes

- All payment methods have same 2.9% + $0.30 fee except:
  - BNPL: Higher fees (5-15%)
  - ACH: Lower fees (0.8%)
- Payment methods auto-detected based on:
  - Customer location
  - Device type
  - Browser
- No additional code needed per method
- All handled by Stripe
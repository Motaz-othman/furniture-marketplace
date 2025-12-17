import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create payment intent with ALL payment methods
export const createPaymentIntent = async (amount, metadata = {}, options = {}) => {
  try {
    const totalAmount = Math.round(amount * 100); // Convert to cents

    const paymentIntentData = {
      amount: totalAmount,
      currency: options.currency || 'usd',
      metadata,
      automatic_payment_methods: {
        enabled: true, // Enables cards, Apple Pay, Google Pay, Link
        allow_redirects: 'always' // Enables Buy Now Pay Later, bank redirects
      }
    };

    // Add customer if provided (required for saved payment methods)
    if (options.customerId) {
      paymentIntentData.customer = options.customerId;
    }

    // Add statement descriptor (appears on customer's bank statement)
    if (options.statementDescriptor) {
      paymentIntentData.statement_descriptor = options.statementDescriptor;
    }

    // Enable specific payment method types
    if (options.paymentMethodTypes && options.paymentMethodTypes.length > 0) {
      paymentIntentData.payment_method_types = options.paymentMethodTypes;
      delete paymentIntentData.automatic_payment_methods;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);
    return paymentIntent;
  } catch (error) {
    console.error('Create payment intent error:', error);
    throw new Error('Failed to create payment intent');
  }
};

// Retrieve payment intent
export const retrievePaymentIntent = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('Retrieve payment intent error:', error);
    throw new Error('Failed to retrieve payment intent');
  }
};

// Verify webhook signature
export const verifyWebhookSignature = (payload, signature) => {
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    return event;
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    throw new Error('Invalid webhook signature');
  }
};

// ===== STRIPE CONNECT FUNCTIONS =====

// Create Stripe Connect account
export const createConnectAccount = async (email, country = 'US') => {
  try {
    const account = await stripe.accounts.create({
      type: 'express',
      country,
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      }
    });

    return account;
  } catch (error) {
    console.error('Create connect account error:', error);
    throw new Error('Failed to create Stripe account');
  }
};

// Create account onboarding link
export const createAccountLink = async (accountId, refreshUrl, returnUrl) => {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding'
    });

    return accountLink;
  } catch (error) {
    console.error('Create account link error:', error);
    throw new Error('Failed to create onboarding link');
  }
};

// Get account details
export const getAccountDetails = async (accountId) => {
  try {
    const account = await stripe.accounts.retrieve(accountId);
    return account;
  } catch (error) {
    console.error('Get account details error:', error);
    throw new Error('Failed to get account details');
  }
};

// Create payment intent with transfer (split payment) - ALL METHODS
export const createPaymentIntentWithTransfer = async (amount, vendorAccountId, commission, metadata = {}, options = {}) => {
  try {
    const vendorAmount = Math.round((amount - commission) * 100); // Vendor gets (total - commission)
    const totalAmount = Math.round(amount * 100);

    const paymentIntentData = {
      amount: totalAmount,
      currency: options.currency || 'usd',
      metadata,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'always'
      },
      transfer_data: {
        amount: vendorAmount,
        destination: vendorAccountId
      }
    };

    // Add customer if provided
    if (options.customerId) {
      paymentIntentData.customer = options.customerId;
    }

// Add statement descriptor suffix
if (options.statementDescriptor) {
    paymentIntentData.statement_descriptor_suffix = options.statementDescriptor.substring(0, 22);
  }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);
    return paymentIntent;
  } catch (error) {
    console.error('Create payment intent with transfer error:', error);
    throw new Error('Failed to create payment with transfer');
  }
};

// ===== REFUND FUNCTIONS =====

// Create refund
export const createRefund = async (paymentIntentId, amount = null, reason = 'requested_by_customer') => {
  try {
    const refundData = {
      payment_intent: paymentIntentId,
      reason
    };

    // If amount specified, partial refund. Otherwise full refund.
    if (amount) {
      refundData.amount = Math.round(amount * 100);
    }

    const refund = await stripe.refunds.create(refundData);
    return refund;
  } catch (error) {
    console.error('Create refund error:', error);
    throw new Error('Failed to create refund');
  }
};

// Get refund details
export const getRefund = async (refundId) => {
  try {
    const refund = await stripe.refunds.retrieve(refundId);
    return refund;
  } catch (error) {
    console.error('Get refund error:', error);
    throw new Error('Failed to get refund details');
  }
};

// List refunds for a payment intent
export const listRefunds = async (paymentIntentId) => {
  try {
    const refunds = await stripe.refunds.list({
      payment_intent: paymentIntentId,
      limit: 100
    });
    return refunds.data;
  } catch (error) {
    console.error('List refunds error:', error);
    throw new Error('Failed to list refunds');
  }
};

// Create Stripe Express dashboard login link
export const createDashboardLink = async (accountId) => {
  try {
    const loginLink = await stripe.accounts.createLoginLink(accountId);
    return loginLink;
  } catch (error) {
    console.error('Create dashboard link error:', error);
    throw new Error('Failed to create dashboard link');
  }
};

export default stripe;
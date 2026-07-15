import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

// Create payment intent with ALL payment methods
export const createPaymentIntent = async (amount, metadata = {}, options = {}) => {
  const totalAmount = Math.round(amount * 100); // Convert to cents

  const paymentIntentData = {
    amount: totalAmount,
    currency: options.currency || 'usd',
    metadata,
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: 'always'
    }
  };

  if (options.customerId) {
    paymentIntentData.customer = options.customerId;
  }

  if (options.statementDescriptor) {
    paymentIntentData.statement_descriptor = options.statementDescriptor;
  }

  if (options.paymentMethodTypes && options.paymentMethodTypes.length > 0) {
    paymentIntentData.payment_method_types = options.paymentMethodTypes;
    delete paymentIntentData.automatic_payment_methods;
  }

  return await stripe.paymentIntents.create(paymentIntentData);
};

// Update payment intent metadata (e.g. attach orderId after order is created)
export const updatePaymentIntentMetadata = async (paymentIntentId, metadata) => {
  return await stripe.paymentIntents.update(paymentIntentId, { metadata });
};

// Cancel payment intent (e.g. when order creation fails after intent was created)
export const cancelPaymentIntent = async (paymentIntentId) => {
  try {
    return await stripe.paymentIntents.cancel(paymentIntentId);
  } catch (error) {
    console.error('Cancel payment intent error:', error);
    throw error;
  }
};

// Retrieve payment intent
export const retrievePaymentIntent = async (paymentIntentId) => {
  return await stripe.paymentIntents.retrieve(paymentIntentId);
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

// ===== REFUND FUNCTIONS =====

// Create refund
export const createRefund = async (paymentIntentId, amount = null, reason = 'requested_by_customer') => {
  const refundData = { payment_intent: paymentIntentId, reason };
  if (amount) refundData.amount = Math.round(amount * 100);
  return await stripe.refunds.create(refundData);
};

// Get refund details
export const getRefund = async (refundId) => {
  try {
    const refund = await stripe.refunds.retrieve(refundId);
    return refund;
  } catch (error) {
    console.error('Get refund error:', error);
    throw error;
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
    throw error;
  }
};

export default stripe;
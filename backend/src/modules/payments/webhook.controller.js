import prisma from '../../shared/config/db.js';
import { verifyWebhookSignature } from '../../shared/services/stripe.service.js';
import { sendOrderConfirmationEmail, sendAdminOrderNotificationEmail } from '../../shared/services/email.service.js';

// Handle Stripe webhooks
export const handleStripeWebhook = async (req, res) => {
  // Step 1: verify signature — bad signature → 400, Stripe will NOT retry
  let event;
  try {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }
    event = verifyWebhookSignature(req.body, signature);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  // Step 2: process event — DB failures → 500, Stripe WILL retry
  try {
    console.log(`Webhook received: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      case 'charge.refunded':
        await handleRefund(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// Handle successful payment — idempotent: only updates if still in PROCESSING state
const handlePaymentSuccess = async (paymentIntent) => {
  const orderId = paymentIntent.metadata.orderId;
  if (!orderId) {
    console.error('No orderId in payment intent metadata');
    return;
  }

  const { count } = await prisma.order.updateMany({
    where: { id: orderId, paymentStatus: { not: 'SUCCEEDED' } },
    data: { paymentStatus: 'SUCCEEDED', status: 'CONFIRMED' }
  });

  if (count > 0) {
    console.log(`Payment succeeded for order ${orderId}`);
    prisma.orderEvent.create({
      data: { orderId, type: 'PAYMENT_RECEIVED', actor: 'stripe',
        data: { amount: paymentIntent.amount / 100, currency: paymentIntent.currency, paymentIntentId: paymentIntent.id } }
    }).catch(() => {});
    // Send confirmation email — fire-and-forget, never block the webhook response
    prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true, variant: true } },
        address: true,
        customer: { include: { user: true } },
      },
    }).then((order) => {
      if (order) {
        sendOrderConfirmationEmail(order).catch(() => {});
        sendAdminOrderNotificationEmail(order).catch(() => {});
      }
    }).catch(() => {});
  } else {
    console.log(`Duplicate payment.succeeded event ignored for order ${orderId}`);
  }
};

// Handle failed payment — idempotent: only updates if not already failed/succeeded
const handlePaymentFailed = async (paymentIntent) => {
  const orderId = paymentIntent.metadata.orderId;
  if (!orderId) {
    console.error('No orderId in payment intent metadata');
    return;
  }

  const { count } = await prisma.order.updateMany({
    where: { id: orderId, paymentStatus: { notIn: ['FAILED', 'SUCCEEDED', 'REFUNDED'] } },
    data: { paymentStatus: 'FAILED' }
  });

  if (count > 0) {
    console.log(`Payment failed for order ${orderId}`);
    prisma.orderEvent.create({
      data: { orderId, type: 'PAYMENT_FAILED', actor: 'stripe',
        data: { paymentIntentId: paymentIntent.id, lastPaymentError: paymentIntent.last_payment_error?.message } }
    }).catch(() => {});
  } else {
    console.log(`Duplicate payment.failed event ignored for order ${orderId}`);
  }
};

// Handle refund — idempotent: only updates if not already refunded
const handleRefund = async (charge) => {
  const order = await prisma.order.findFirst({
    where: { stripePaymentIntentId: charge.payment_intent }
  });

  if (!order) {
    console.error('Order not found for refund, payment_intent:', charge.payment_intent);
    return;
  }

  const { count } = await prisma.order.updateMany({
    where: { id: order.id, paymentStatus: { not: 'REFUNDED' } },
    data: { paymentStatus: 'REFUNDED', status: 'REFUNDED' }
  });

  if (count > 0) {
    console.log(`Refund processed for order ${order.id}`);
    prisma.orderEvent.create({
      data: { orderId: order.id, type: 'REFUND_PROCESSED', actor: 'stripe',
        data: { amount: charge.amount_refunded / 100, currency: charge.currency } }
    }).catch(() => {});
  } else {
    console.log(`Duplicate charge.refunded event ignored for order ${order.id}`);
  }
};
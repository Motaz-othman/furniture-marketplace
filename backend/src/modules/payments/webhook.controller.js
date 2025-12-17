import prisma from '../../shared/config/db.js';
import { verifyWebhookSignature } from '../../shared/services/stripe.service.js';

// Handle Stripe webhooks
export const handleStripeWebhook = async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];

    // For now, skip signature verification if webhook secret not set
    let event;
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      event = verifyWebhookSignature(req.body, signature);
    } else {
      // In development, accept webhook without verification
      event = JSON.parse(req.body.toString());
    }

    console.log('Webhook received:', event.type);

    // Handle different event types
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
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook handler failed' });
  }
};

// Handle successful payment
const handlePaymentSuccess = async (paymentIntent) => {
  try {
    const orderId = paymentIntent.metadata.orderId;

    if (!orderId) {
      console.error('No orderId in payment intent metadata');
      return;
    }

    // Update order payment status
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'SUCCEEDED',
        status: 'CONFIRMED' // Auto-confirm order on payment
      }
    });

    console.log(`Payment succeeded for order ${orderId}`);

  } catch (error) {
    console.error('Handle payment success error:', error);
  }
};

// Handle failed payment
const handlePaymentFailed = async (paymentIntent) => {
  try {
    const orderId = paymentIntent.metadata.orderId;

    if (!orderId) {
      console.error('No orderId in payment intent metadata');
      return;
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'FAILED'
      }
    });

    console.log(`Payment failed for order ${orderId}`);

  } catch (error) {
    console.error('Handle payment failed error:', error);
  }
};

// Handle refund
const handleRefund = async (charge) => {
  try {
    // Find order by payment intent
    const order = await prisma.order.findFirst({
      where: { stripePaymentIntentId: charge.payment_intent }
    });

    if (!order) {
      console.error('Order not found for refund');
      return;
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'REFUNDED',
        status: 'REFUNDED'
      }
    });

    console.log(`Refund processed for order ${order.id}`);

  } catch (error) {
    console.error('Handle refund error:', error);
  }
};
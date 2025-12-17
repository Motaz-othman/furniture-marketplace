import prisma from '../../shared/config/db.js';
import { createPaymentIntent, retrievePaymentIntent } from '../../shared/services/stripe.service.js';
import { formatPaymentError } from '../../shared/utils/payment-errors.js';

// Create payment intent for order
export const createOrderPayment = async (req, res) => {
  try {
    const customerId = req.user.customer.id;
    const { orderId } = req.body;

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { product: true }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check ownership
    if (order.customerId !== customerId) {
      return res.status(403).json({ error: 'Not your order' });
    }

    // Check if already has payment intent
    if (order.stripePaymentIntentId) {
      const existingIntent = await retrievePaymentIntent(order.stripePaymentIntentId);
      
      if (existingIntent.status === 'succeeded') {
        return res.status(400).json({ error: 'Order already paid' });
      }

      // Return existing intent
      return res.json({
        clientSecret: existingIntent.client_secret,
        paymentIntentId: existingIntent.id
      });
    }

    // Create new payment intent
    const paymentIntent = await createPaymentIntent(order.total, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId
    });

    // Save payment intent ID to order
    await prisma.order.update({
      where: { id: orderId },
      data: {
        stripePaymentIntentId: paymentIntent.id,
        paymentStatus: 'PROCESSING'
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

} catch (error) {
    console.error('Create order payment error:', error);
    
    // Check if it's a Stripe error
    if (error.type && error.type.includes('Stripe')) {
      return res.status(400).json(formatPaymentError(error));
    }
    
    res.status(500).json({ error: 'Failed to create payment' });
  }
};

// Get payment status
export const getPaymentStatus = async (req, res) => {
  try {
    const customerId = req.user.customer.id;
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        customerId: true,
        paymentStatus: true,
        stripePaymentIntentId: true
      }
    });

    if (!order || order.customerId !== customerId) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      paymentStatus: order.paymentStatus,
      paymentIntentId: order.stripePaymentIntentId
    });

  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ error: 'Failed to get payment status' });
  }
};
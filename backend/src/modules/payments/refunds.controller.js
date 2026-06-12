import prisma from '../../shared/config/db.js';
import { createRefund, getRefund, listRefunds } from '../../shared/services/stripe.service.js';
import { formatPaymentError } from '../../shared/utils/payment-errors.js';

// Process refund (admin only)
export const processRefund = async (req, res) => {
  try {
    const { orderId, amount, reason } = req.body;

    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.paymentStatus !== 'SUCCEEDED') return res.status(400).json({ error: 'Order has not been paid yet' });
    if (!order.stripePaymentIntentId) return res.status(400).json({ error: 'No payment found for this order' });

    // Query Stripe for already-issued refunds to prevent over-refunding
    const existingRefunds = await listRefunds(order.stripePaymentIntentId);
    const alreadyRefunded = existingRefunds.reduce((sum, r) => sum + r.amount, 0) / 100;
    const maxRefundable = order.total - alreadyRefunded;

    if (maxRefundable <= 0) {
      return res.status(400).json({ error: 'This order has already been fully refunded' });
    }

    const refundAmount = amount || maxRefundable;
    if (refundAmount > maxRefundable) {
      return res.status(400).json({ error: `Maximum refundable amount is $${maxRefundable.toFixed(2)}` });
    }

    const refund = await createRefund(order.stripePaymentIntentId, refundAmount, reason || 'requested_by_customer');

    const totalRefunded = alreadyRefunded + refundAmount;
    const isFullRefund = totalRefunded >= order.total;
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: isFullRefund ? 'REFUNDED' : 'SUCCEEDED',
        status: isFullRefund ? 'REFUNDED' : order.status
      }
    });

    res.json({
      message: isFullRefund ? 'Full refund processed successfully' : 'Partial refund processed successfully',
      refund: { id: refund.id, amount: refund.amount / 100, status: refund.status, reason: refund.reason }
    });
  } catch (error) {
    console.error('Process refund error:', error);
    if (error.type) return res.status(400).json(formatPaymentError(error));
    res.status(500).json({ error: 'Failed to process refund' });
  }
};

// Get refund details
export const getRefundDetails = async (req, res) => {
  try {
    const { refundId } = req.params;
    const refund = await getRefund(refundId);
    res.json({ id: refund.id, amount: refund.amount / 100, status: refund.status, reason: refund.reason, created: new Date(refund.created * 1000) });
  } catch (error) {
    console.error('Get refund details error:', error);
    res.status(500).json({ error: 'Failed to get refund details' });
  }
};

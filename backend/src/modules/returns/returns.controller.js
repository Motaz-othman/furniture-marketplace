import prisma from '../../shared/config/db.js';
import { sendReturnRequestEmail } from '../../shared/services/email.service.js';
import { createRefund, listRefunds } from '../../shared/services/stripe.service.js';
import { notifyReturnUpdated } from '../../shared/services/notification.service.js';

const ORDER_INCLUDE = {
  items: { include: { product: true, variant: true } },
  address: true,
  customer: { include: { user: true } },
};

// POST /orders/:orderId/request-return  — customer submits a return request
export const createReturnRequest = async (req, res) => {
  try {
    const customerId = req.user.customer.id;
    const { orderId } = req.params;
    const { items: returnItems } = req.body; // [{ orderItemId, quantity, reason }]

    if (!Array.isArray(returnItems) || returnItems.length === 0) {
      return res.status(400).json({ error: 'Select at least one item to return' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: ORDER_INCLUDE,
    });

    if (!order || order.customerId !== customerId) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orderItemIds = new Set(order.items.map((i) => i.id));
    for (const ri of returnItems) {
      if (!orderItemIds.has(ri.orderItemId)) {
        return res.status(400).json({ error: `Item ${ri.orderItemId} does not belong to this order` });
      }
      const orderItem = order.items.find((i) => i.id === ri.orderItemId);
      if (ri.quantity < 1 || ri.quantity > orderItem.quantity) {
        return res.status(400).json({ error: `Invalid quantity for item ${ri.orderItemId}` });
      }
      if (!ri.reason?.trim()) {
        return res.status(400).json({ error: 'Each item must have a reason' });
      }
      // Block if item already has an active return in progress
      if (['RETURN_REQUESTED', 'RETURN_APPROVED'].includes(orderItem.status)) {
        return res.status(409).json({ error: 'A return is already in progress for one or more items' });
      }
      if (orderItem.status !== 'DELIVERED') {
        return res.status(400).json({ error: 'Only delivered items can be returned' });
      }
    }

    const returnItemOrderItemIds = returnItems.map((i) => i.orderItemId);

    const [returnRequest] = await prisma.$transaction([
      prisma.returnRequest.create({
        data: {
          orderId,
          customerId,
          items: {
            create: returnItems.map((ri) => ({
              orderItemId: ri.orderItemId,
              quantity: ri.quantity,
              reason: ri.reason.trim(),
            })),
          },
        },
        include: { items: { include: { orderItem: { include: { product: true, variant: true } } } } },
      }),
      prisma.orderItem.updateMany({
        where: { id: { in: returnItemOrderItemIds } },
        data: { status: 'RETURN_REQUESTED' },
      }),
    ]);

    sendReturnRequestEmail(order, returnRequest).catch((err) =>
      console.error('Return request email error:', err)
    );

    prisma.orderEvent.create({
      data: { orderId, type: 'RETURN_REQUESTED', actor: 'customer',
        data: { returnRequestId: returnRequest.id, itemCount: returnItems.length } }
    }).catch(() => {});

    res.status(201).json({
      message: 'Return request submitted. Our team will contact you within 1–2 business days.',
      returnRequest,
    });
  } catch (error) {
    console.error('Create return request error:', error);
    res.status(500).json({ error: 'Failed to submit return request' });
  }
};

// GET /orders/:orderId/return-requests  — customer views return requests for an order
export const getOrderReturnRequests = async (req, res) => {
  try {
    const customerId = req.user.customer.id;
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { customerId: true } });
    if (!order || order.customerId !== customerId) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const returnRequests = await prisma.returnRequest.findMany({
      where: { orderId },
      include: {
        items: { include: { orderItem: { include: { product: true, variant: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ returnRequests });
  } catch (error) {
    console.error('Get return requests error:', error);
    res.status(500).json({ error: 'Failed to get return requests' });
  }
};

// GET /admin/return-requests  — admin lists all return requests
export const listReturnRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = status ? { status } : {};

    const [returnRequests, total] = await Promise.all([
      prisma.returnRequest.findMany({
        where,
        include: {
          order: { select: { orderNumber: true, total: true } },
          customer: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
          items: { include: { orderItem: { include: { product: true, variant: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.returnRequest.count({ where }),
    ]);

    res.json({
      returnRequests,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    console.error('List return requests error:', error);
    res.status(500).json({ error: 'Failed to list return requests' });
  }
};

// PATCH /admin/return-requests/:id  — admin approves or rejects
export const updateReturnRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const valid = ['APPROVED', 'REJECTED'];
    if (!valid.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be APPROVED or REJECTED' });
    }

    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id },
      include: { items: { select: { orderItemId: true } } },
    });
    if (!returnRequest) return res.status(404).json({ error: 'Return request not found' });

    const orderItemIds = returnRequest.items.map((i) => i.orderItemId);
    const itemStatus = status === 'APPROVED' ? 'RETURN_APPROVED' : 'RETURN_REJECTED';

    const [updated] = await prisma.$transaction([
      prisma.returnRequest.update({
        where: { id },
        data: { status, ...(adminNotes !== undefined && { adminNotes }) },
        include: {
          order: { select: { id: true, orderNumber: true } },
          customer: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
          items: { include: { orderItem: { include: { product: true, variant: true } } } },
        },
      }),
      prisma.orderItem.updateMany({
        where: { id: { in: orderItemIds } },
        data: { status: itemStatus },
      }),
    ]);

    const userId = updated.customer?.user?.id;
    if (userId) {
      notifyReturnUpdated(userId, updated.order, status).catch(console.error);
    }

    prisma.orderEvent.create({
      data: { orderId: updated.order.id, type: `RETURN_${status}`, actor: 'admin',
        data: { returnRequestId: id, adminNotes: adminNotes || null } }
    }).catch(() => {});

    res.json({ message: `Return request ${status.toLowerCase()}`, returnRequest: updated });
  } catch (error) {
    console.error('Update return request error:', error);
    res.status(500).json({ error: 'Failed to update return request' });
  }
};

// POST /admin/return-requests/:id/refund — issue Stripe partial refund + mark REFUNDED
export const refundReturnRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id },
      include: {
        order: true,
        items: { include: { orderItem: true } },
      },
    });

    if (!returnRequest) return res.status(404).json({ error: 'Return request not found' });
    if (returnRequest.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Return request must be APPROVED before refunding' });
    }

    const order = returnRequest.order;
    if (!order.stripePaymentIntentId) {
      return res.status(400).json({ error: 'No payment found for this order' });
    }

    const refundAmount = returnRequest.items.reduce(
      (sum, ri) => sum + (ri.orderItem?.price || 0) * ri.quantity, 0
    );
    if (refundAmount <= 0) return res.status(400).json({ error: 'Invalid refund amount' });

    const existingRefunds = await listRefunds(order.stripePaymentIntentId);
    const alreadyRefunded = existingRefunds.reduce((sum, r) => sum + r.amount, 0) / 100;
    const maxRefundable = order.total - alreadyRefunded;

    if (refundAmount > maxRefundable) {
      return res.status(400).json({ error: `Maximum refundable is $${maxRefundable.toFixed(2)}` });
    }

    const refund = await createRefund(order.stripePaymentIntentId, refundAmount, 'requested_by_customer');

    const orderItemIds = returnRequest.items.map((i) => i.orderItemId);

    const [updated] = await prisma.$transaction([
      prisma.returnRequest.update({
        where: { id },
        data: { status: 'REFUNDED' },
        include: {
          order: { select: { id: true, orderNumber: true } },
          customer: { include: { user: { select: { id: true } } } },
          items: { include: { orderItem: { include: { product: true, variant: true } } } },
        },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: (alreadyRefunded + refundAmount) >= order.total ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        },
      }),
      prisma.orderItem.updateMany({
        where: { id: { in: orderItemIds } },
        data: { status: 'REFUNDED' },
      }),
    ]);

    const userId = updated.customer?.user?.id;
    if (userId) {
      notifyReturnUpdated(userId, updated.order, 'REFUNDED').catch(console.error);
    }

    prisma.orderEvent.create({
      data: { orderId: order.id, type: 'RETURN_REFUNDED', actor: 'admin',
        data: { returnRequestId: id, amount: refundAmount, stripeRefundId: refund.id } }
    }).catch(() => {});

    res.json({
      message: `Refund of $${refundAmount.toFixed(2)} processed successfully`,
      returnRequest: updated,
      refund: { id: refund.id, amount: refund.amount / 100, status: refund.status },
    });
  } catch (error) {
    console.error('Refund return request error:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
};

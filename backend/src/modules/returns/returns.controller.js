import prisma from '../../shared/config/db.js';
import { sendReturnRequestEmail } from '../../shared/services/email.service.js';

const ORDER_INCLUDE = {
  items: { include: { product: true, variant: true } },
  address: true,
  customer: { include: { user: true } },
};

// POST /orders/:id/request-return  — customer submits a return request
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
    if (order.status !== 'DELIVERED') {
      return res.status(400).json({ error: 'Only delivered orders can be returned' });
    }

    // Validate each requested item belongs to this order
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
    }

    // Check no pending/approved return already exists for these items
    const existing = await prisma.returnRequest.findFirst({
      where: {
        orderId,
        status: { in: ['PENDING', 'APPROVED'] },
        items: { some: { orderItemId: { in: returnItems.map((i) => i.orderItemId) } } },
      },
    });
    if (existing) {
      return res.status(409).json({ error: 'A return request already exists for one or more of these items' });
    }

    const returnRequest = await prisma.returnRequest.create({
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
    });

    // Fire-and-forget email to admin
    sendReturnRequestEmail(order, returnRequest).catch((err) =>
      console.error('Return request email error:', err)
    );

    res.status(201).json({
      message: 'Return request submitted. Our team will contact you within 1–2 business days.',
      returnRequest,
    });
  } catch (error) {
    console.error('Create return request error:', error);
    res.status(500).json({ error: 'Failed to submit return request' });
  }
};

// GET /orders/:id/return-requests  — customer views return requests for an order
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

// PATCH /admin/return-requests/:id  — admin updates status (APPROVED / REJECTED / REFUNDED)
export const updateReturnRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const valid = ['APPROVED', 'REJECTED', 'REFUNDED'];
    if (!valid.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be APPROVED, REJECTED, or REFUNDED' });
    }

    const returnRequest = await prisma.returnRequest.findUnique({ where: { id } });
    if (!returnRequest) return res.status(404).json({ error: 'Return request not found' });

    const updated = await prisma.returnRequest.update({
      where: { id },
      data: { status, ...(adminNotes !== undefined && { adminNotes }) },
      include: {
        order: { select: { orderNumber: true } },
        customer: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        items: { include: { orderItem: { include: { product: true, variant: true } } } },
      },
    });

    res.json({ message: `Return request ${status.toLowerCase()}`, returnRequest: updated });
  } catch (error) {
    console.error('Update return request error:', error);
    res.status(500).json({ error: 'Failed to update return request' });
  }
};

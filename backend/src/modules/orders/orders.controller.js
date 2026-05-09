import prisma from '../../shared/config/db.js';
import { notifyOrderPlaced, notifyOrderStatusChanged, notifyOrderCancelled } from '../../shared/services/notification.service.js';
import { createPaymentIntent } from '../../shared/services/stripe.service.js';

const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `ORD-${timestamp}-${random}`.toUpperCase();
};

const generateTrackingNumber = (orderId) => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const orderSuffix = orderId.substring(0, 4).toUpperCase();
  return `TRK-${timestamp}${random}-${orderSuffix}`;
};

// Create order from cart
export const createOrder = async (req, res) => {
  try {
    const customerId = req.user.customer.id;
    const { addressId, notes } = req.body;

    const cartItems = await prisma.cartItem.findMany({
      where: { customerId },
      include: {
        product: true,
        variant: true
      }
    });

    if (cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Validate all items
    const invalidItems = [];
    for (const item of cartItems) {
      if (!item.product) {
        invalidItems.push({ reason: 'Product no longer exists', cartItemId: item.id });
        continue;
      }
      if (!item.product.isActive) {
        invalidItems.push({ reason: 'Product is no longer available', name: item.product.name });
        continue;
      }
      if (item.variantId) {
        if (!item.variant) {
          invalidItems.push({ reason: 'Product variant no longer exists', name: item.product.name });
          continue;
        }
        const variantLabel = Array.isArray(item.variant.attributes)
          ? item.variant.attributes.map(a => (a.values?.[0] || a.normalizedValues?.[0] || '')).filter(Boolean).join(' / ')
          : (item.variant.name || '');
        if (!item.variant.isActive) {
          invalidItems.push({ reason: 'Product variant is no longer available', name: item.product.name, variant: variantLabel });
          continue;
        }
        if (item.variant.stockQuantity < item.quantity) {
          invalidItems.push({ reason: 'Insufficient stock', name: item.product.name, variant: variantLabel, available: item.variant.stockQuantity, requested: item.quantity });
        }
      } else {
        if (item.product.totalStock < item.quantity) {
          invalidItems.push({ reason: 'Insufficient stock', name: item.product.name, available: item.product.totalStock, requested: item.quantity });
        }
      }
    }

    if (invalidItems.length > 0) {
      return res.status(400).json({ error: 'Some items are no longer available.', invalidItems });
    }

    const address = await prisma.address.findUnique({ where: { id: addressId } });
    if (!address || address.customerId !== customerId) {
      return res.status(404).json({ error: 'Address not found' });
    }

    const subtotal = cartItems.reduce((sum, item) => {
      const price = item.variant?.price?.retailPrice ?? item.product.minPrice ?? 0;
      return sum + (price * item.quantity);
    }, 0);

    const tax = subtotal * 0.08;
    const shippingCost = 50;
    const total = subtotal + tax + shippingCost;

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          customerId,
          addressId,
          orderNumber: generateOrderNumber(),
          subtotal,
          tax,
          shippingCost,
          total,
          notes,
          items: {
            create: cartItems.map(item => ({
              productId: item.productId,
              variantId: item.variantId || undefined,
              quantity: item.quantity,
              price: item.variant?.price?.retailPrice ?? item.product.minPrice ?? 0
            }))
          }
        },
        include: {
          items: { include: { product: true, variant: true } },
          address: true
        }
      });

      for (const item of cartItems) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockQuantity: { decrement: item.quantity } }
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: { totalStock: { decrement: item.quantity } }
          });
        }
      }

      await tx.cartItem.deleteMany({ where: { customerId } });
      return created;
    });

    // Create payment intent
    let clientSecret = null;
    try {
      const paymentIntent = await createPaymentIntent(
        order.total,
        { orderId: order.id, orderNumber: order.orderNumber, customerId: order.customerId },
        {}
      );
      await prisma.order.update({
        where: { id: order.id },
        data: { stripePaymentIntentId: paymentIntent.id, paymentStatus: 'PROCESSING' }
      });
      clientSecret = paymentIntent.client_secret;
    } catch (paymentError) {
      console.error('Payment intent creation failed:', paymentError);
    }

    // Notify customer
    try {
      await notifyOrderPlaced(req.user.id, order);
    } catch (notifError) {
      console.error('Notification error:', notifError);
    }

    res.status(201).json({ message: 'Order created successfully', order: { ...order, clientSecret } });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

// Get customer's orders
export const getCustomerOrders = async (req, res) => {
  try {
    const customerId = req.user.customer.id;
    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { customerId, ...(status && { status }) };

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: { include: { product: true, variant: true } },
          address: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.order.count({ where })
    ]);

    res.json({ orders, pagination: { page: parseInt(page), limit: parseInt(limit), totalCount, totalPages: Math.ceil(totalCount / parseInt(limit)) } });
  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({ error: 'Failed to get orders' });
  }
};

// Get single order
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true, variant: true } },
        customer: { include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } } },
        address: true
      }
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });

    const isCustomer = order.customer?.user?.id === userId || order.customer?.userId === userId;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isCustomer && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to get order' });
  }
};

// Update order status (admin only)
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber, trackingUrl } = req.body;

    const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const updateData = { status };
    if (status === 'SHIPPED' && !order.trackingNumber) {
      updateData.trackingNumber = trackingNumber || generateTrackingNumber(id);
    }
    if (trackingUrl) updateData.trackingUrl = trackingUrl;

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: { items: { include: { product: true, variant: true } } }
    });

    if (updatedOrder.customerId) {
      try {
        const customer = await prisma.customer.findUnique({ where: { id: updatedOrder.customerId }, select: { userId: true } });
        if (customer) await notifyOrderStatusChanged(customer.userId, updatedOrder, status);
      } catch (notifError) {
        console.error('Notification error:', notifError);
      }
    }

    res.json({ message: 'Order status updated', order: updatedOrder });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};

// Cancel order (customer only, PENDING status)
export const cancelOrder = async (req, res) => {
  try {
    const customerId = req.user.customer.id;
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: { include: { variant: true } } }
    });

    if (!order || order.customerId !== customerId) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.status !== 'PENDING') {
      return res.status(400).json({ error: `Cannot cancel order with status: ${order.status}` });
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const cancelled = await tx.order.update({ where: { id }, data: { status: 'CANCELLED' } });

      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.update({ where: { id: item.variantId }, data: { stockQuantity: { increment: item.quantity } } });
        } else {
          await tx.product.update({ where: { id: item.productId }, data: { totalStock: { increment: item.quantity } } });
        }
      }
      return cancelled;
    });

    try {
      const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { userId: true } });
      if (customer) await notifyOrderCancelled(customer.userId, updatedOrder);
    } catch (notifError) {
      console.error('Notification error:', notifError);
    }

    res.json({ message: 'Order cancelled successfully', order: updatedOrder });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
};

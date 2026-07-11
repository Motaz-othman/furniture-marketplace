import prisma from '../../shared/config/db.js';
import { notifyOrderPlaced, notifyOrderCancelled } from '../../shared/services/notification.service.js';
import { createPaymentIntent, cancelPaymentIntent } from '../../shared/services/stripe.service.js';

const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `ORD-${timestamp}-${random}`.toUpperCase();
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

    // Basic product/variant existence checks (outside transaction — fast)
    const quickInvalid = [];
    for (const item of cartItems) {
      if (!item.product) { quickInvalid.push({ reason: 'Product no longer exists', cartItemId: item.id }); continue; }
      if (!item.product.isActive) { quickInvalid.push({ reason: 'Product is no longer available', name: item.product.name }); continue; }
      if (item.variantId && !item.variant) { quickInvalid.push({ reason: 'Variant no longer exists', name: item.product.name }); continue; }
      if (item.variantId && !item.variant.isActive) { quickInvalid.push({ reason: 'Variant is no longer available', name: item.product.name }); continue; }
    }
    if (quickInvalid.length > 0) {
      return res.status(400).json({ error: 'Some items are no longer available.', invalidItems: quickInvalid });
    }

    const address = await prisma.address.findUnique({ where: { id: addressId } });
    if (!address || address.customerId !== customerId) {
      return res.status(404).json({ error: 'Address not found' });
    }

    const subtotal = cartItems.reduce((sum, item) => {
      const price = item.variant?.price?.retailPrice ?? item.product.minPrice ?? 0;
      return sum + (price * item.quantity);
    }, 0);

    const taxRate = parseFloat(process.env.TAX_RATE ?? '0.08');
    const shippingCost = parseFloat(process.env.SHIPPING_COST ?? '50');
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const total = subtotal + tax + shippingCost;

    const order = await prisma.$transaction(async (tx) => {
      // ── Re-validate stock INSIDE transaction to prevent race conditions ──
      const invalidItems = [];
      for (const item of cartItems) {
        if (item.variantId) {
          const fresh = await tx.productVariant.findUnique({ where: { id: item.variantId }, select: { stockQuantity: true, name: true } });
          const variantLabel = Array.isArray(item.variant.attributes)
            ? item.variant.attributes.map(a => (a.values?.[0] || a.normalizedValues?.[0] || '')).filter(Boolean).join(' / ')
            : (fresh?.name || '');
          if (!fresh || fresh.stockQuantity < item.quantity) {
            invalidItems.push({ reason: 'Insufficient stock', name: item.product.name, variant: variantLabel, available: fresh?.stockQuantity ?? 0, requested: item.quantity });
          }
        } else {
          const fresh = await tx.product.findUnique({ where: { id: item.productId }, select: { totalStock: true } });
          if (!fresh || fresh.totalStock < item.quantity) {
            invalidItems.push({ reason: 'Insufficient stock', name: item.product.name, available: fresh?.totalStock ?? 0, requested: item.quantity });
          }
        }
      }
      if (invalidItems.length > 0) {
        throw Object.assign(new Error('STOCK_CONFLICT'), { invalidItems });
      }

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
    }, { maxWait: 10000, timeout: 30000 });

    // Create payment intent — if Stripe is unavailable, cancel the order rather than
    // leaving it with no way to pay (stripePaymentIntentId would stay null forever).
    let clientSecret;
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
      // Restore stock since the transaction already committed
      await prisma.$transaction(async (tx) => {
        await tx.order.update({ where: { id: order.id }, data: { status: 'CANCELLED', paymentStatus: 'FAILED' } });
        for (const item of cartItems) {
          if (item.variantId) {
            await tx.productVariant.update({ where: { id: item.variantId }, data: { stockQuantity: { increment: item.quantity } } });
          } else {
            await tx.product.update({ where: { id: item.productId }, data: { totalStock: { increment: item.quantity } } });
          }
        }
      }).catch(() => {});
      return res.status(502).json({ error: 'Payment service unavailable. Your order has been cancelled — please try again.' });
    }

    // Notify customer
    try {
      await notifyOrderPlaced(req.user.id, order);
    } catch (notifError) {
      console.error('Notification error:', notifError);
    }

    res.status(201).json({ message: 'Order created successfully', order: { ...order, clientSecret } });
  } catch (error) {
    if (error.message === 'STOCK_CONFLICT') {
      return res.status(409).json({ error: 'Some items ran out of stock. Please review your cart.', invalidItems: error.invalidItems });
    }
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
          items: {
            include: {
              product: true,
              variant: true,
              shipment: { select: { status: true } },
              returnRequestItems: {
                include: { returnRequest: { select: { status: true } } },
                orderBy: { returnRequest: { createdAt: 'desc' } },
                take: 1,
              },
            },
          },
          address: true,
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

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
            shipment: true,
            returnRequestItems: {
              include: { returnRequest: { select: { status: true } } },
              orderBy: { returnRequest: { createdAt: 'desc' } },
              take: 1,
            },
          },
        },
        customer: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } } },
        address: true
      }
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });

    const isAdmin = req.user.role === 'ADMIN';
    const isCustomer = req.user.customer?.id && req.user.customer.id === order.customerId;

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
    }, { maxWait: 10000, timeout: 30000 });

    // Cancel the Stripe PaymentIntent so the client_secret can no longer be used
    if (order.stripePaymentIntentId) {
      cancelPaymentIntent(order.stripePaymentIntentId).catch((err) => {
        console.error('Failed to cancel PaymentIntent on order cancel:', err.message);
      });
    }

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


import prisma from '../../shared/config/db.js';
import { createPaymentIntent } from '../../shared/services/stripe.service.js';

const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `ORD-${timestamp}-${random}`.toUpperCase();
};

// ─── Guest / Logged-in Checkout ──────────────────────────────────────────────
// Creates a SINGLE order regardless of how many brands the items come from.
// Delivery/shipment assignment is handled by admin after the order is placed.

export const guestCheckout = async (req, res) => {
  try {
    const { email, firstName, lastName, phone, address, items, notes } = req.body;
    const customerId = req.user?.customer?.id || null;

    // ── Load all products + variants referenced in items ──────────────────
    const productIds = [...new Set(items.map(i => i.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { variants: true },
    });
    const productMap = new Map(products.map(p => [p.id, p]));

    // ── Validate every item ───────────────────────────────────────────────
    const invalidItems = [];
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        invalidItems.push({ reason: 'Product not found', productId: item.productId });
        continue;
      }
      if (!product.isActive) {
        invalidItems.push({ reason: 'Product is no longer available', name: product.name });
        continue;
      }
      if (item.variantId) {
        const variant = product.variants.find(v => v.id === item.variantId);
        if (!variant) {
          invalidItems.push({ reason: 'Product variant not found', name: product.name });
          continue;
        }
        if (!variant.isActive) {
          invalidItems.push({ reason: 'Product variant is no longer available', name: product.name });
          continue;
        }
        if (variant.stockQuantity < item.quantity) {
          invalidItems.push({
            reason: 'Insufficient stock',
            name: product.name,
            available: variant.stockQuantity,
            requested: item.quantity,
          });
        }
      } else {
        if ((product.totalStock ?? 0) < item.quantity) {
          invalidItems.push({
            reason: 'Insufficient stock',
            name: product.name,
            available: product.totalStock ?? 0,
            requested: item.quantity,
          });
        }
      }
    }

    if (invalidItems.length > 0) {
      return res.status(400).json({
        error: 'Some items are no longer available. Please update your cart and try again.',
        invalidItems,
      });
    }

    // ── Helper: resolve item price ────────────────────────────────────────
    function resolvePrice(item) {
      const product = productMap.get(item.productId);
      if (item.variantId) {
        const variant = product.variants.find(v => v.id === item.variantId);
        return variant?.price?.retailPrice ?? 0;
      }
      return product.minPrice ?? 0;
    }

    // ── Calculate totals ──────────────────────────────────────────────
    const subtotal = items.reduce((sum, item) => sum + resolvePrice(item) * item.quantity, 0);
    const taxRate = parseFloat(process.env.TAX_RATE ?? '0.08');
    const shippingCost = parseFloat(process.env.SHIPPING_COST ?? '0');
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const total = subtotal + tax + shippingCost;

    // ── Create Stripe payment intent FIRST — if this fails, no order is created ─
    let paymentIntent;
    try {
      paymentIntent = await createPaymentIntent(
        total,
        { orderNumber: 'pending', guestEmail: email },
        {},
      );
    } catch (paymentError) {
      console.error('Payment intent creation failed:', paymentError);
      return res.status(502).json({ error: 'Payment service unavailable. Please try again.' });
    }

    // ── Create order + decrement stock in one transaction ─────────────
    const order = await prisma.$transaction(async (tx) => {
      const guestAddress = await tx.address.create({
        data: {
          street: address.street,
          city: address.city,
          state: address.state,
          zipCode: address.zipCode,
          country: address.country || 'US',
        },
      });

      const createdOrder = await tx.order.create({
        data: {
          customerId,
          addressId: guestAddress.id,
          orderNumber: generateOrderNumber(),
          guestEmail: email,
          guestFirstName: firstName,
          guestLastName: lastName,
          guestPhone: phone || null,
          subtotal,
          tax,
          shippingCost,
          total,
          notes: notes || null,
          stripePaymentIntentId: paymentIntent.id,
          paymentStatus: 'PROCESSING',
          items: {
            create: items.map(item => ({
              productId: item.productId,
              variantId: item.variantId || undefined,
              quantity: item.quantity,
              price: resolvePrice(item),
            })),
          },
        },
        include: {
          items: { include: { product: true, variant: true } },
          address: true,
        },
      });

      for (const item of items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockQuantity: { decrement: item.quantity } },
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: { totalStock: { decrement: item.quantity } },
          });
        }
      }

      return createdOrder;
    });

    const clientSecret = paymentIntent.client_secret;
    const paymentIntentId = paymentIntent.id;

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        ...order,
        clientSecret,
        paymentIntentId,
      },
    });
  } catch (error) {
    console.error('Guest checkout error:', error);
    res.status(500).json({ error: 'Failed to process checkout' });
  }
};

// ─── Track Guest Order ────────────────────────────────────────────────────────

export const trackGuestOrder = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'Email is required to look up your order' });
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, mainImage: true, slug: true } },
            variant: { select: { id: true, name: true, externalProductId: true } },
          },
        },
        shipments: {
          select: {
            id: true,
            provider: true,
            type: true,
            status: true,
            trackingNumber: true,
            trackingUrl: true,
            estimatedCost: true,
          },
        },
        address: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify email matches
    if (order.guestEmail) {
      if (order.guestEmail.toLowerCase() !== email.toLowerCase()) {
        return res.status(404).json({ error: 'Order not found' });
      }
    } else if (order.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: order.customerId },
        include: { user: { select: { email: true } } },
      });
      if (!customer || customer.user.email.toLowerCase() !== email.toLowerCase()) {
        return res.status(404).json({ error: 'Order not found' });
      }
    } else {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      subtotal: order.subtotal,
      tax: order.tax,
      shippingCost: order.shippingCost,
      total: order.total,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      address: order.address,
      items: order.items,
      shipments: order.shipments,
    });
  } catch (error) {
    console.error('Track guest order error:', error);
    res.status(500).json({ error: 'Failed to look up order' });
  }
};

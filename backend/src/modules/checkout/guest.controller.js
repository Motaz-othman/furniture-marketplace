import prisma from '../../shared/config/db.js';
import { createPaymentIntent, cancelPaymentIntent, updatePaymentIntentMetadata } from '../../shared/services/stripe.service.js';
import { DEFAULT_DELIVERY_PRICING } from '../settings/settings.controller.js';

// Map variant packaging.shipType → pricing tier
function getDeliveryTier(shipType) {
  const s = (shipType || '').trim();
  if (s === 'LTL' || s === 'GROUND - OVERSIZE') return 'ltl';
  return 'smallParcel';
}

// Resolve the delivery fee for a given method + tier from current settings
async function resolveDeliveryFee(deliveryMethod, tier) {
  if (!deliveryMethod) return 0;
  try {
    const record = await prisma.siteSettings.findUnique({ where: { id: 'main' } });
    const pricing = record?.settings?.deliveryPricing || DEFAULT_DELIVERY_PRICING;
    const options = pricing[tier] || [];
    const option = options.find(o => o.key === deliveryMethod);
    return option?.price ?? 0;
  } catch {
    return 0;
  }
}

const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `ORD-${timestamp}-${random}`.toUpperCase();
};

// ─── Guest / Logged-in Checkout ──────────────────────────────────────────────
// Creates a SINGLE order regardless of how many brands the items come from.
// Delivery/shipment assignment is handled by admin after the order is placed.

export const validateCouponPublic = async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) return res.status(400).json({ error: 'Coupon code is required' });

    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon || !coupon.isActive) return res.status(404).json({ error: 'Invalid or inactive coupon code' });
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return res.status(400).json({ error: 'This coupon has expired' });
    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) return res.status(400).json({ error: 'This coupon has reached its usage limit' });
    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
      return res.status(400).json({ error: `Minimum order of $${coupon.minOrderAmount.toFixed(2)} required for this coupon` });
    }

    const discountAmount = coupon.type === 'PERCENTAGE'
      ? Math.round((coupon.value / 100) * subtotal * 100) / 100
      : Math.min(coupon.value, subtotal);

    res.json({ valid: true, code: coupon.code, type: coupon.type, value: coupon.value, discountAmount });
  } catch (error) {
    console.error('Validate coupon error:', error);
    res.status(500).json({ error: 'Failed to validate coupon' });
  }
};

export const guestCheckout = async (req, res) => {
  try {
    const { email, firstName, lastName, phone, address, items, notes, deliveryInstructions, couponCode } = req.body;
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
    const { getTaxRateByZip } = await import('../settings/tax.controller.js');
    const taxRate = await getTaxRateByZip(address?.zipCode);

    // Load delivery pricing once, then resolve per-item fees
    let deliveryPricing;
    try {
      const settingsRecord = await prisma.siteSettings.findUnique({ where: { id: 'main' } });
      deliveryPricing = settingsRecord?.settings?.deliveryPricing || DEFAULT_DELIVERY_PRICING;
    } catch {
      deliveryPricing = DEFAULT_DELIVERY_PRICING;
    }

    const itemDeliveryData = items.map(item => {
      const product = productMap.get(item.productId);
      const variant = item.variantId ? product.variants.find(v => v.id === item.variantId) : null;
      const shipType = variant?.packaging?.shipType || null;
      const tier = getDeliveryTier(shipType);
      const tierOptions = deliveryPricing[tier] || [];
      const selectedMethod = item.deliveryMethod || null;
      const fee = selectedMethod
        ? (tierOptions.find(o => o.key === selectedMethod)?.price ?? 0)
        : 0;
      return { deliveryMethod: selectedMethod, deliveryFee: fee };
    });

    const shippingCost = itemDeliveryData.reduce((sum, d) => sum + d.deliveryFee, 0);
    const tax = Math.round(subtotal * taxRate * 100) / 100;

    // ── Validate and apply coupon ─────────────────────────────────────
    let appliedCoupon = null;
    let discountAmount = 0;
    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
      if (!coupon || !coupon.isActive) {
        return res.status(400).json({ error: 'Invalid or inactive coupon code' });
      }
      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        return res.status(400).json({ error: 'This coupon has expired' });
      }
      if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
        return res.status(400).json({ error: 'This coupon has reached its usage limit' });
      }
      if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
        return res.status(400).json({ error: `Minimum order of $${coupon.minOrderAmount.toFixed(2)} required for this coupon` });
      }
      discountAmount = coupon.type === 'PERCENTAGE'
        ? Math.round((coupon.value / 100) * subtotal * 100) / 100
        : Math.min(coupon.value, subtotal);
      appliedCoupon = coupon;
    }

    const total = Math.max(0, subtotal + tax + shippingCost - discountAmount);

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
    // If the transaction fails, cancel the PaymentIntent so the customer is never charged.
    let order;
    try {
      order = await prisma.$transaction(async (tx) => {
        const guestAddress = await tx.address.create({
        data: {
          street: address.street,
          apartment: address.apartment || null,
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
          discountAmount,
          couponCode: appliedCoupon?.code || null,
          total,
          notes: notes || null,
          deliveryInstructions: deliveryInstructions || null,
          stripePaymentIntentId: paymentIntent.id,
          paymentStatus: 'PROCESSING',
          items: {
            create: items.map((item, idx) => ({
              productId: item.productId,
              variantId: item.variantId || undefined,
              quantity: item.quantity,
              price: resolvePrice(item),
              deliveryMethod: itemDeliveryData[idx].deliveryMethod,
              deliveryFee: itemDeliveryData[idx].deliveryFee,
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
          const result = await tx.productVariant.updateMany({
            where: { id: item.variantId, stockQuantity: { gte: item.quantity } },
            data: { stockQuantity: { decrement: item.quantity } },
          });
          if (result.count === 0) {
            throw new Error(`Item sold out during checkout`);
          }
        } else {
          const result = await tx.product.updateMany({
            where: { id: item.productId, totalStock: { gte: item.quantity } },
            data: { totalStock: { decrement: item.quantity } },
          });
          if (result.count === 0) {
            throw new Error(`Item sold out during checkout`);
          }
        }
      }

      // Atomically increment coupon usedCount inside the transaction to prevent race conditions
      if (appliedCoupon) {
        const updated = await tx.coupon.updateMany({
          where: {
            id: appliedCoupon.id,
            ...(appliedCoupon.maxUses != null && { usedCount: { lt: appliedCoupon.maxUses } }),
          },
          data: { usedCount: { increment: 1 } },
        });
        if (updated.count === 0 && appliedCoupon.maxUses != null) {
          throw new Error('COUPON_EXHAUSTED');
        }
      }

      return createdOrder;
      }, { maxWait: 10000, timeout: 30000 });
    } catch (txError) {
      // Cancel the PaymentIntent so the customer cannot be charged for a non-existent order.
      try {
        await cancelPaymentIntent(paymentIntent.id);
      } catch (cancelError) {
        console.error('Failed to cancel orphaned PaymentIntent:', cancelError);
      }
      if (txError.message === 'COUPON_EXHAUSTED') {
        return res.status(400).json({ error: 'This coupon has reached its usage limit' });
      }
      throw txError;
    }

    // Attach the real orderId so the webhook handler can look up the order
    await updatePaymentIntentMetadata(paymentIntent.id, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      guestEmail: email,
    });

    prisma.orderEvent.create({
      data: { orderId: order.id, type: 'ORDER_PLACED', actor: 'customer',
        data: { orderNumber: order.orderNumber, total: order.total, itemCount: order.items.length, guestEmail: email } }
    }).catch(() => {});

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
    const { email } = req.body;

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
      deliveryInstructions: order.deliveryInstructions,
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

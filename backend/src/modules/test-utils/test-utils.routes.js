import { Router } from 'express';
import prisma from '../../shared/config/db.js';

const router = Router();

const devOnly = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') return res.status(404).json({ error: 'Not found' });
  next();
};

// Reset a product's variant stock
router.post('/reset-stock', devOnly, async (req, res) => {
  try {
    const { slug, quantity = 100 } = req.body;
    if (!slug) return res.status(400).json({ error: 'slug required' });
    const result = await prisma.productVariant.updateMany({
      where: { product: { slug } },
      data: { stockQuantity: Number(quantity) },
    });
    if (result.count === 0) return res.status(404).json({ error: 'Product not found or has no variants' });
    res.json({ ok: true, updated: result.count, slug, quantity });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a minimal test order for a given customer (by email) and product (by slug)
router.post('/create-test-order', devOnly, async (req, res) => {
  try {
    const { email, productSlug, status = 'PENDING', paymentStatus = 'PENDING' } = req.body;
    if (!email || !productSlug) return res.status(400).json({ error: 'email and productSlug required' });

    const customer = await prisma.customer.findFirst({ where: { user: { email } } });
    if (!customer) return res.status(404).json({ error: 'Customer not found for email: ' + email });

    const variant = await prisma.productVariant.findFirst({
      where: { product: { slug: productSlug } },
      include: { product: true },
    });
    if (!variant) return res.status(404).json({ error: 'No variant found for slug: ' + productSlug });

    // Reuse an existing address or create a minimal one
    let address = await prisma.address.findFirst({ where: { customerId: customer.id } });
    if (!address) {
      address = await prisma.address.create({
        data: { customerId: customer.id, street: '123 Test St', city: 'Atlanta', state: 'GA', zipCode: '30301', country: 'US' },
      });
    }

    const price = variant.retailPrice ?? 100;
    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        addressId: address.id,
        orderNumber: `TEST-${Date.now()}`,
        status,
        paymentStatus,
        subtotal: price,
        tax: 0,
        shippingCost: 0,
        total: price,
        items: {
          create: [{ productId: variant.productId, variantId: variant.id, quantity: 1, price }],
        },
      },
    });

    res.json({ ok: true, order: { id: order.id, orderNumber: order.orderNumber, status: order.status } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Set an order's status (and optionally paymentStatus + item statuses) — for test setup
router.post('/set-order-status', devOnly, async (req, res) => {
  try {
    const { orderNumber, status, paymentStatus, itemStatus } = req.body;
    if (!orderNumber || !status) return res.status(400).json({ error: 'orderNumber and status required' });

    const order = await prisma.order.findUnique({ where: { orderNumber } });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    await prisma.order.update({
      where: { orderNumber },
      data: {
        status,
        ...(paymentStatus && { paymentStatus }),
        ...(itemStatus && { items: { updateMany: { where: {}, data: { status: itemStatus } } } }),
      },
    });

    res.json({ ok: true, orderNumber, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear all wishlist items for a user (by email) — for test isolation
router.delete('/wishlist/:email', devOnly, async (req, res) => {
  try {
    const { email } = req.params;
    const customer = await prisma.customer.findFirst({ where: { user: { email } } });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    const { count } = await prisma.wishlist.deleteMany({ where: { customerId: customer.id } });
    res.json({ ok: true, deleted: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

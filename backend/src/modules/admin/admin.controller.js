import prisma from '../../shared/config/db.js';
import { notifyOrderStatusChanged } from '../../shared/services/notification.service.js';
import { createRefund } from '../../shared/services/stripe.service.js';

// ============================================
// PLATFORM STATISTICS
// ============================================

export const getPlatformStats = async (req, res) => {
  try {
    const [totalUsers, totalCustomers, totalAdmins] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
    ]);

    let blockedUsers = 0;
    try { blockedUsers = await prisma.user.count({ where: { isBlocked: true } }); } catch {}

    const [totalProducts, activeProducts] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalOrders, totalRevenueAgg, ordersByStatusRaw, recentOrders, recentUsers,
      recentRevenueAgg, todayOrdersAgg, productsByVendorRaw, lowStockCount, totalListings,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { total: true } }),
      prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.order.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.order.aggregate({ where: { createdAt: { gte: thirtyDaysAgo } }, _sum: { total: true } }),
      prisma.order.aggregate({ where: { createdAt: { gte: todayStart } }, _sum: { total: true }, _count: { _all: true } }),
      prisma.product.groupBy({ by: ['source'], _count: { _all: true } }),
      prisma.product.count({ where: { isActive: true, totalStock: { lte: 5 } } }),
      prisma.storefrontListing.count({ where: { isPublished: true } }),
    ]);

    const totalRevenue = totalRevenueAgg._sum.total || 0;
    const ordersByStatus = Object.fromEntries(ordersByStatusRaw.map(r => [r.status, r._count._all]));
    const recentRevenue = recentRevenueAgg._sum.total || 0;
    const byVendor = Object.fromEntries(productsByVendorRaw.map(r => [r.source, r._count._all]));

    const [totalCategories, totalReviews] = await Promise.all([
      prisma.category.count(),
      prisma.review.count(),
    ]);

    res.json({
      users: { total: totalUsers, customers: totalCustomers, admins: totalAdmins, blocked: blockedUsers, newLast30Days: recentUsers },
      products: { total: totalProducts, active: activeProducts, inactive: totalProducts - activeProducts, byVendor, lowStock: lowStockCount },
      orders: {
        total: totalOrders, byStatus: ordersByStatus, newLast30Days: recentOrders,
        today: { count: todayOrdersAgg._count._all, revenue: todayOrdersAgg._sum.total || 0 },
        pending: ordersByStatus['PENDING'] || 0,
      },
      revenue: { total: totalRevenue, last30Days: recentRevenue },
      listings: { active: totalListings },
      categories: totalCategories,
      reviews: totalReviews,
    });
  } catch (error) {
    console.error('Get platform stats error:', error);
    res.status(500).json({ error: 'Failed to get platform statistics' });
  }
};

export const getRevenueChart = async (req, res) => {
  try {
    const now = new Date();
    const monthRanges = Array.from({ length: 12 }, (_, i) => {
      const start = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const end = new Date(now.getFullYear(), now.getMonth() - (11 - i) + 1, 0, 23, 59, 59);
      return { start, end };
    });

    const results = await Promise.all(
      monthRanges.map(({ start, end }) =>
        prisma.order.aggregate({
          where: { createdAt: { gte: start, lte: end }, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
          _sum: { total: true },
          _count: { _all: true },
        })
      )
    );

    const months = results.map((result, i) => ({
      month: monthRanges[i].start.toLocaleString('default', { month: 'short', year: '2-digit' }),
      revenue: result._sum.total || 0,
      orders: result._count._all,
    }));

    res.json({ data: months });
  } catch (error) {
    console.error('Get revenue chart error:', error);
    res.status(500).json({ error: 'Failed to get revenue data' });
  }
};

// ============================================
// USER MANAGEMENT
// ============================================

export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, status, sortBy = 'createdAt', order = 'desc' } = req.query;

    const where = {
      ...(role && { role }),
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(status === 'blocked' && { isBlocked: true }),
      ...(status === 'active' && { isBlocked: false }),
    };

    const [users, totalCount, customerCount, adminCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, firstName: true, lastName: true, phone: true,
          role: true, isBlocked: true, lastLoginAt: true, createdAt: true, updatedAt: true,
          customer: { select: { id: true } }
        },
        orderBy: { [sortBy]: order },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.user.count({ where }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
    ]);

    res.json({
      users,
      totalUsers: await prisma.user.count(),
      customerCount,
      adminCount,
      pagination: { page: parseInt(page), limit: parseInt(limit), totalCount, totalPages: Math.ceil(totalCount / parseInt(limit)) },
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true,
        role: true, isBlocked: true, createdAt: true, updatedAt: true,
        customer: { include: { addresses: true } },
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    let stats = {};
    if (user.customer) {
      const [orderCount, reviewCount, wishlistCount] = await Promise.all([
        prisma.order.count({ where: { customerId: user.customer.id } }),
        prisma.review.count({ where: { customerId: user.customer.id } }),
        prisma.wishlist.count({ where: { customerId: user.customer.id } }),
      ]);
      stats = { totalOrders: orderCount, totalReviews: reviewCount, wishlistItems: wishlistCount };
    }

    res.json({ ...user, stats });
  } catch (error) {
    console.error('Get user by id error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, isBlocked } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) return res.status(404).json({ error: 'User not found' });
    if (id === req.user.id && isBlocked === true) return res.status(400).json({ error: 'Cannot block yourself' });
    if (existingUser.role === 'ADMIN' && isBlocked === true) return res.status(400).json({ error: 'Cannot block an admin user' });

    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (isBlocked !== undefined) updateData.isBlocked = isBlocked;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, isBlocked: true, createdAt: true, updatedAt: true }
    });

    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const existingUser = await prisma.user.findUnique({ where: { id }, include: { customer: true } });
    if (!existingUser) return res.status(404).json({ error: 'User not found' });
    if (id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
    if (existingUser.role === 'ADMIN') return res.status(400).json({ error: 'Cannot delete an admin user' });

    // Read order IDs before the transaction (reads outside are fine — we validate inside)
    let orderIds = [];
    if (existingUser.customer) {
      const customerOrders = await prisma.order.findMany({
        where: { customerId: existingUser.customer.id },
        select: { id: true },
      });
      orderIds = customerOrders.map(o => o.id);
    }

    await prisma.$transaction(async (tx) => {
      if (existingUser.customer) {
        const customerId = existingUser.customer.id;
        await tx.wishlist.deleteMany({ where: { customerId } });
        await tx.review.deleteMany({ where: { customerId } });
        await tx.cartItem.deleteMany({ where: { customerId } });

        if (orderIds.length > 0) {
          await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
          await tx.order.deleteMany({ where: { customerId } });
        }
        await tx.address.deleteMany({ where: { customerId } });
        await tx.customer.delete({ where: { id: customerId } });
      }

      await tx.notification.deleteMany({ where: { userId: id } });
      await tx.user.delete({ where: { id } });
    }, { maxWait: 10000, timeout: 30000 });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// ============================================
// ORDER MANAGEMENT
// ============================================

export const getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, customerId, search, sortBy = 'createdAt', order = 'desc' } = req.query;

    const where = {
      ...(status && { status }),
      ...(customerId && { customerId }),
      ...(search && {
        OR: [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { trackingNumber: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: { select: { user: { select: { firstName: true, lastName: true, email: true } } } },
          items: { include: { product: { select: { name: true, mainImage: true } } } },
          _count: { select: { shipments: true } },
        },
        orderBy: { [sortBy]: order },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.order.count({ where }),
    ]);

    res.json({ orders, pagination: { page: parseInt(page), limit: parseInt(limit), totalCount, totalPages: Math.ceil(totalCount / parseInt(limit)) } });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ error: 'Failed to get orders' });
  }
};

export const getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        address: true,
        customer: { include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } } },
        items: {
          include: {
            product: true,
            variant: true,
            shipment: { select: { id: true, status: true } },
            returnRequestItems: {
              include: { returnRequest: { select: { id: true, status: true } } },
              orderBy: { returnRequest: { createdAt: 'desc' } },
              take: 1,
            },
          },
        },
        shipments: {
          include: {
            items: {
              include: {
                product: { select: { name: true, mainImage: true } },
                variant: { select: { name: true, attributes: true, sku: true } },
              }
            }
          },
          orderBy: { createdAt: 'asc' },
        },
        returnRequests: {
          include: {
            items: {
              include: {
                orderItem: {
                  include: {
                    product: { select: { name: true, mainImage: true } },
                    variant: { select: { name: true } },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        events: { orderBy: { createdAt: 'desc' } },
      }
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ order });
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({ error: 'Failed to get order details' });
  }
};

const ALLOWED_TRANSITIONS = {
  PENDING:    ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:  ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED:    ['DELIVERED'],
  DELIVERED:  ['REFUNDED'],
  CANCELLED:  [],
  REFUNDED:   [],
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note, force } = req.body;

    const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const existing = await prisma.order.findUnique({
      where: { id },
      include: { customer: { include: { user: true } } },
    });
    if (!existing) return res.status(404).json({ error: 'Order not found' });

    const allowed = ALLOWED_TRANSITIONS[existing.status] || [];
    if (!force && !allowed.includes(status)) {
      return res.status(400).json({
        error: `Cannot move order from ${existing.status} to ${status}`,
        allowedTransitions: allowed,
      });
    }

    // When admin cancels a CONFIRMED (paid) order, issue a full Stripe refund
    const isCancellingPaidOrder = status === 'CANCELLED'
      && existing.status === 'CONFIRMED'
      && existing.paymentStatus === 'SUCCEEDED'
      && existing.stripePaymentIntentId;

    if (isCancellingPaidOrder) {
      await createRefund(existing.stripePaymentIntentId, existing.total, 'requested_by_customer');
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        status: isCancellingPaidOrder ? 'REFUNDED' : status,
        ...(note && { notes: note }),
        ...(isCancellingPaidOrder && { paymentStatus: 'REFUNDED' }),
      },
    });

    // Update all item statuses to match the cancellation
    if (status === 'CANCELLED') {
      await prisma.orderItem.updateMany({
        where: { orderId: id },
        data: { status: 'CANCELLED' },
      });
    }

    const userId = existing.customer?.user?.id;
    if (userId) {
      notifyOrderStatusChanged(userId, order, status).catch(console.error);
    }

    prisma.orderEvent.create({
      data: { orderId: id, type: 'STATUS_CHANGE', actor: 'admin',
        data: { from: existing.status, to: isCancellingPaidOrder ? 'REFUNDED' : status, note: note || null } }
    }).catch(() => {});

    if (isCancellingPaidOrder) {
      prisma.orderEvent.create({
        data: { orderId: id, type: 'REFUND_PROCESSED', actor: 'admin',
          data: { amount: existing.total, note: 'Full refund — order cancelled by admin' } }
      }).catch(() => {});
    }

    res.json({ message: 'Order status updated', order });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};

// ============================================
// SHIPMENT MANAGEMENT
// ============================================

export const createShipment = async (req, res) => {
  try {
    const { id: orderId } = req.params;
    const { provider, type, notes, itemIds } = req.body;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (itemIds?.length) {
      const validItems = await prisma.orderItem.findMany({
        where: { id: { in: itemIds }, orderId },
        select: { id: true },
      });
      if (validItems.length !== itemIds.length) {
        return res.status(400).json({ error: 'One or more items do not belong to this order' });
      }
    }

    const shipment = await prisma.shipment.create({
      data: {
        orderId,
        provider: provider || null,
        type: type || null,
        notes: notes || null,
        ...(itemIds?.length && { items: { connect: itemIds.map(id => ({ id })) } }),
      },
      include: {
        items: { include: { product: { select: { name: true, mainImage: true } }, variant: { select: { name: true, sku: true } } } }
      },
    });

    res.status(201).json({ shipment });
  } catch (error) {
    console.error('Create shipment error:', error);
    res.status(500).json({ error: 'Failed to create shipment' });
  }
};

export const updateShipment = async (req, res) => {
  try {
    const { id: orderId, shipmentId } = req.params;
    const { provider, type, status, estimatedCost, actualCost, trackingNumber, trackingUrl, notes } = req.body;

    const existing = await prisma.shipment.findUnique({ where: { id: shipmentId } });
    if (!existing || existing.orderId !== orderId) return res.status(404).json({ error: 'Shipment not found' });

    const shipment = await prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        ...(provider !== undefined && { provider }),
        ...(type !== undefined && { type }),
        ...(status !== undefined && { status }),
        ...(estimatedCost !== undefined && { estimatedCost }),
        ...(actualCost !== undefined && { actualCost }),
        ...(trackingNumber !== undefined && { trackingNumber }),
        ...(trackingUrl !== undefined && { trackingUrl }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        items: { include: { product: { select: { name: true, mainImage: true } }, variant: { select: { name: true, sku: true } } } }
      },
    });

    // Auto-advance items to DELIVERED when shipment is marked delivered
    if (status === 'DELIVERED') {
      await prisma.orderItem.updateMany({
        where: { shipmentId, status: { in: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'] } },
        data: { status: 'DELIVERED' },
      });
    }

    res.json({ shipment });
  } catch (error) {
    console.error('Update shipment error:', error);
    res.status(500).json({ error: 'Failed to update shipment' });
  }
};

export const deleteShipment = async (req, res) => {
  try {
    const { id: orderId, shipmentId } = req.params;

    const existing = await prisma.shipment.findUnique({ where: { id: shipmentId } });
    if (!existing || existing.orderId !== orderId) return res.status(404).json({ error: 'Shipment not found' });

    await prisma.orderItem.updateMany({ where: { shipmentId }, data: { shipmentId: null } });
    await prisma.shipment.delete({ where: { id: shipmentId } });

    res.json({ message: 'Shipment deleted' });
  } catch (error) {
    console.error('Delete shipment error:', error);
    res.status(500).json({ error: 'Failed to delete shipment' });
  }
};

export const assignShipmentItems = async (req, res) => {
  try {
    const { id: orderId, shipmentId } = req.params;
    const { itemIds } = req.body;

    const existing = await prisma.shipment.findUnique({ where: { id: shipmentId } });
    if (!existing || existing.orderId !== orderId) return res.status(404).json({ error: 'Shipment not found' });

    await prisma.orderItem.updateMany({ where: { shipmentId, id: { notIn: itemIds } }, data: { shipmentId: null } });
    await prisma.orderItem.updateMany({ where: { orderId, id: { in: itemIds } }, data: { shipmentId } });

    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { items: { include: { product: { select: { name: true, mainImage: true } }, variant: { select: { name: true, sku: true } } } } },
    });

    res.json({ shipment });
  } catch (error) {
    console.error('Assign shipment items error:', error);
    res.status(500).json({ error: 'Failed to assign items' });
  }
};

export const updateItemStatus = async (req, res) => {
  try {
    const { id: orderId, itemId } = req.params;
    const { status } = req.body;

    const VALID = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_REJECTED'];
    if (!VALID.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const item = await prisma.orderItem.findFirst({ where: { id: itemId, orderId } });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const updated = await prisma.orderItem.update({
      where: { id: itemId },
      data: { status },
      include: { product: { select: { name: true } }, variant: { select: { name: true } } },
    });

    prisma.orderEvent.create({
      data: { orderId, type: 'ITEM_STATUS_CHANGE', actor: 'admin',
        data: { itemId, from: item.status, to: status,
          product: updated.product?.name, variant: updated.variant?.name } }
    }).catch(() => {});

    res.json({ item: updated });
  } catch (error) {
    console.error('Update item status error:', error);
    res.status(500).json({ error: 'Failed to update item status' });
  }
};

// ============================================
// PRODUCT MANAGEMENT
// ============================================

export const getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, categoryId, isActive, stock, minPrice, maxPrice, sortBy = 'createdAt', order = 'desc' } = req.query;

    const where = {
      ...(categoryId && { categoryId }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    if (stock === 'out_of_stock') where.totalStock = 0;
    else if (stock === 'low_stock') where.totalStock = { gt: 0, lte: 10 };
    else if (stock === 'in_stock') where.totalStock = { gt: 10 };

    if (minPrice || maxPrice) {
      where.minPrice = {};
      if (minPrice) where.minPrice.gte = parseFloat(minPrice);
      if (maxPrice) where.minPrice.lte = parseFloat(maxPrice);
    }

    const [products, totalCount, categories] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          variants: true,
          _count: { select: { reviews: true, variants: true } }
        },
        orderBy: { [sortBy]: order },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.product.count({ where }),
      prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    ]);

    const [inStockCount, lowStockCount, outOfStockCount] = await Promise.all([
      prisma.product.count({ where: { totalStock: { gt: 10 } } }),
      prisma.product.count({ where: { totalStock: { gt: 0, lte: 10 } } }),
      prisma.product.count({ where: { totalStock: 0 } }),
    ]);

    res.json({
      products,
      categories,
      stockStats: { inStock: inStockCount, lowStock: lowStockCount, outOfStock: outOfStockCount },
      pagination: { page: parseInt(page), limit: parseInt(limit), totalCount, totalPages: Math.ceil(totalCount / parseInt(limit)) },
    });
  } catch (error) {
    console.error('Get all products error:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
};

export const toggleProductActive = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const updated = await prisma.product.update({ where: { id }, data: { isActive: !product.isActive } });
    res.json({ message: `Product ${updated.isActive ? 'activated' : 'deactivated'}`, product: updated });
  } catch (error) {
    console.error('Toggle product error:', error);
    res.status(500).json({ error: 'Failed to toggle product status' });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.$transaction(async (tx) => {
      await tx.storefrontListing.deleteMany({ where: { productId: id } });
      await tx.productVariant.deleteMany({ where: { productId: id } });
      await tx.review.deleteMany({ where: { productId: id } });
      await tx.wishlist.deleteMany({ where: { productId: id } });
      await tx.cartItem.deleteMany({ where: { productId: id } });
      await tx.orderItem.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    }, { maxWait: 10000, timeout: 30000 });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    if (error.code === 'P2025') return res.status(404).json({ error: 'Product not found' });
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

// ============================================
// CATEGORY MANAGEMENT
// ============================================

export const getAllCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' }
    });
    res.json({ categories });
  } catch (error) {
    console.error('Get all categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
};

// ============================================
// RECENT ACTIVITY
// ============================================

export const getRecentActivity = async (req, res) => {
  try {
    const [recentOrders, recentUsers, recentProducts] = await Promise.all([
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { user: { select: { firstName: true, lastName: true } } } },
        }
      }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true }
      }),
      prisma.product.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, minPrice: true, mainImage: true, isActive: true }
      }),
    ]);

    res.json({ recentOrders, recentUsers, recentProducts });
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({ error: 'Failed to get recent activity' });
  }
};

// ============================================
// CUSTOMERS
// ============================================

export const getCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = search ? {
      user: {
        OR: [
          { email:     { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName:  { contains: search, mode: 'insensitive' } },
        ],
      },
    } : {};

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { orders: { _count: 'desc' } },
        select: {
          id: true,
          user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, createdAt: true, isBlocked: true } },
          _count: { select: { orders: true } },
          orders: {
            select: { total: true, createdAt: true, status: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    // Compute total spend per customer
    const customerIds = customers.map(c => c.id);
    const spends = await prisma.order.groupBy({
      by: ['customerId'],
      where: { customerId: { in: customerIds }, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
      _sum: { total: true },
    });
    const spendMap = Object.fromEntries(spends.map(s => [s.customerId, s._sum.total || 0]));

    const data = customers.map(c => ({
      id: c.id,
      user: c.user,
      orderCount: c._count.orders,
      totalSpend: spendMap[c.id] || 0,
      lastOrderAt: c.orders[0]?.createdAt || null,
      lastOrderStatus: c.orders[0]?.status || null,
    }));

    res.json({ data, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    console.error('Get customers error:', err);
    res.status(500).json({ error: 'Failed to get customers' });
  }
};

export const getCustomerDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, createdAt: true, isBlocked: true } },
        addresses: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          include: { items: { include: { product: { select: { name: true, mainImage: true } } } } },
        },
      },
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const totalSpend = customer.orders
      .filter(o => !['CANCELLED', 'REFUNDED'].includes(o.status))
      .reduce((sum, o) => sum + o.total, 0);

    res.json({ ...customer, totalSpend });
  } catch (err) {
    console.error('Get customer detail error:', err);
    res.status(500).json({ error: 'Failed to get customer' });
  }
};

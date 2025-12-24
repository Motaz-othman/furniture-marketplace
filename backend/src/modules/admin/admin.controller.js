// src/modules/admin/admin.controller.js
import prisma from '../../shared/config/db.js';

// ============================================
// PLATFORM STATISTICS
// ============================================

// Get platform-wide statistics
export const getPlatformStats = async (req, res) => {
  try {
    // User counts
    const [totalUsers, totalCustomers, totalVendors, totalAdmins] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.user.count({ where: { role: 'VENDOR' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
    ]);

    // Blocked users count (handle if field doesn't exist)
    let blockedUsers = 0;
    try {
      blockedUsers = await prisma.user.count({ where: { isBlocked: true } });
    } catch (e) {
      // isBlocked field may not exist
    }

    // Vendor stats
    const [verifiedVendors, pendingVendors] = await Promise.all([
      prisma.vendor.count({ where: { isVerified: true } }),
      prisma.vendor.count({ where: { isVerified: false } }),
    ]);

    // Product stats
    const [totalProducts, activeProducts] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
    ]);

    // Order stats
    const orders = await prisma.order.findMany({
      select: { total: true, commission: true, status: true, createdAt: true }
    });

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalCommission = orders.reduce((sum, o) => sum + (o.commission || 0), 0);

    // Orders by status
    const ordersByStatus = {};
    orders.forEach(order => {
      ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1;
    });

    // Recent stats (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [recentOrders, recentUsers, recentVendors] = await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.vendor.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    ]);

    // Revenue last 30 days
    const recentOrdersData = await prisma.order.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { total: true, commission: true }
    });
    const recentRevenue = recentOrdersData.reduce((sum, o) => sum + (o.total || 0), 0);
    const recentCommission = recentOrdersData.reduce((sum, o) => sum + (o.commission || 0), 0);

    // Category count
    const totalCategories = await prisma.category.count();

    // Review stats
    const totalReviews = await prisma.review.count();

    res.json({
      users: {
        total: totalUsers,
        customers: totalCustomers,
        vendors: totalVendors,
        admins: totalAdmins,
        blocked: blockedUsers,
        newLast30Days: recentUsers,
      },
      vendors: {
        total: totalVendors,
        verified: verifiedVendors,
        pending: pendingVendors,
        newLast30Days: recentVendors,
      },
      products: {
        total: totalProducts,
        active: activeProducts,
        inactive: totalProducts - activeProducts,
      },
      orders: {
        total: totalOrders,
        byStatus: ordersByStatus,
        newLast30Days: recentOrders,
      },
      revenue: {
        total: totalRevenue,
        commission: totalCommission,
        net: totalRevenue - totalCommission,
        last30Days: recentRevenue,
        commissionLast30Days: recentCommission,
      },
      categories: totalCategories,
      reviews: totalReviews,
    });
  } catch (error) {
    console.error('Get platform stats error:', error);
    res.status(500).json({ error: 'Failed to get platform statistics' });
  }
};

// Get revenue chart data (last 12 months)
export const getRevenueChart = async (req, res) => {
  try {
    const months = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      const orders = await prisma.order.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          status: { notIn: ['CANCELLED', 'REFUNDED'] }
        },
        select: { total: true, commission: true }
      });

      const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
      const commission = orders.reduce((sum, o) => sum + (o.commission || 0), 0);

      months.push({
        month: start.toLocaleString('default', { month: 'short', year: '2-digit' }),
        revenue,
        commission,
        orders: orders.length,
      });
    }

    res.json({ data: months });
  } catch (error) {
    console.error('Get revenue chart error:', error);
    res.status(500).json({ error: 'Failed to get revenue data' });
  }
};

// ============================================
// USER MANAGEMENT
// ============================================

// Get all users with filters
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, status, sortBy = 'createdAt', order = 'desc' } = req.query;

    // Build where clause
    let where = {
      ...(role && { role }),
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // Only add isBlocked filter if status is specified
    if (status === 'blocked') {
      where.isBlocked = true;
    } else if (status === 'active') {
      where.isBlocked = false;
    }

    const [users, totalCount, customerCount, vendorCount, adminCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isBlocked: true,
          createdAt: true,
          updatedAt: true,
          vendor: {
            select: {
              id: true,
              businessName: true,
              isVerified: true,
            }
          },
          customer: {
            select: {
              id: true,
            }
          }
        },
        orderBy: { [sortBy]: order },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.user.count({ where }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.user.count({ where: { role: 'VENDOR' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
    ]);

    res.json({
      users,
      totalUsers: await prisma.user.count(),
      customerCount,
      vendorCount,
      adminCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
};

// Get single user details
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isBlocked: true,
        createdAt: true,
        updatedAt: true,
        vendor: true,
        customer: {
          include: {
            addresses: true,
          }
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get additional stats based on role
    let stats = {};
    if (user.role === 'CUSTOMER' && user.customer) {
      const [orderCount, reviewCount, wishlistCount] = await Promise.all([
        prisma.order.count({ where: { customerId: user.customer.id } }),
        prisma.review.count({ where: { customerId: user.customer.id } }),
        prisma.wishlist.count({ where: { customerId: user.customer.id } }),
      ]);
      stats = { totalOrders: orderCount, totalReviews: reviewCount, wishlistItems: wishlistCount };
    } else if (user.role === 'VENDOR' && user.vendor) {
      const [productCount, orderCount] = await Promise.all([
        prisma.product.count({ where: { vendorId: user.vendor.id } }),
        prisma.order.count({ where: { vendorId: user.vendor.id } }),
      ]);
      const orders = await prisma.order.findMany({
        where: { vendorId: user.vendor.id },
        select: { total: true }
      });
      const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
      stats = { totalProducts: productCount, totalOrders: orderCount, totalRevenue: revenue };
    }

    res.json({ ...user, stats });
  } catch (error) {
    console.error('Get user by id error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
};

// Update user (block/unblock only - NO role changes)
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, isBlocked } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { id } });
    
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent blocking yourself
    if (id === req.user.id && isBlocked === true) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }

    // Prevent blocking other admins
    if (existingUser.role === 'ADMIN' && isBlocked === true) {
      return res.status(400).json({ error: 'Cannot block an admin user' });
    }

    // Build update data - NO role changes allowed
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (isBlocked !== undefined) updateData.isBlocked = isBlocked;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isBlocked: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user', details: error.message });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ 
      where: { id },
      include: { vendor: true, customer: true }
    });
    
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting yourself
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    // Prevent deleting other admins
    if (existingUser.role === 'ADMIN') {
      return res.status(400).json({ error: 'Cannot delete an admin user' });
    }

    // Delete related data first (in correct order to avoid FK constraints)
    if (existingUser.customer) {
      const customerId = existingUser.customer.id;
      
      // Delete customer related data (order matters!)
      await prisma.wishlist.deleteMany({ where: { customerId } });
      await prisma.review.deleteMany({ where: { customerId } });
      await prisma.cartItem.deleteMany({ where: { customerId } });
      
      // Get customer orders and delete order items first
      const customerOrders = await prisma.order.findMany({ 
        where: { customerId },
        select: { id: true }
      });
      const orderIds = customerOrders.map(o => o.id);
      
      if (orderIds.length > 0) {
        await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
        await prisma.order.deleteMany({ where: { customerId } });
      }
      
      // NOW we can delete addresses (after orders are gone)
      await prisma.address.deleteMany({ where: { customerId } });
      
      // Delete customer profile
      await prisma.customer.delete({ where: { id: customerId } });
    }

    if (existingUser.vendor) {
      const vendorId = existingUser.vendor.id;
      
      // Get all vendor products
      const vendorProducts = await prisma.product.findMany({
        where: { vendorId },
        select: { id: true }
      });
      const productIds = vendorProducts.map(p => p.id);
      
      if (productIds.length > 0) {
        // Delete product related data
        await prisma.productVariant.deleteMany({ where: { productId: { in: productIds } } });
        await prisma.review.deleteMany({ where: { productId: { in: productIds } } });
        await prisma.wishlist.deleteMany({ where: { productId: { in: productIds } } });
        await prisma.cartItem.deleteMany({ where: { productId: { in: productIds } } });
        await prisma.orderItem.deleteMany({ where: { productId: { in: productIds } } });
        
        // Delete products
        await prisma.product.deleteMany({ where: { vendorId } });
      }
      
      // Delete vendor orders (order items first, then orders)
      const vendorOrders = await prisma.order.findMany({ 
        where: { vendorId },
        select: { id: true }
      });
      const vendorOrderIds = vendorOrders.map(o => o.id);
      if (vendorOrderIds.length > 0) {
        await prisma.orderItem.deleteMany({ where: { orderId: { in: vendorOrderIds } } });
        await prisma.order.deleteMany({ where: { vendorId } });
      }
      
      // Delete vendor profile
      await prisma.vendor.delete({ where: { id: vendorId } });
    }

    // Delete notifications
    await prisma.notification.deleteMany({ where: { userId: id } });

    // Finally delete the user
    await prisma.user.delete({ where: { id } });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  }
};

// ============================================
// VENDOR MANAGEMENT
// ============================================

// Get all vendors with details
export const getAllVendors = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, sortBy = 'createdAt', order = 'desc' } = req.query;

    const where = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { businessName: { contains: search, mode: 'insensitive' } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { user: { firstName: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [vendors, totalCount] = await Promise.all([
      prisma.vendor.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              isBlocked: true,
              createdAt: true,
            }
          },
          _count: {
            select: {
              products: true,
              orders: true,
            }
          }
        },
        orderBy: { [sortBy]: order },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.vendor.count({ where }),
    ]);

    // Get additional stats for each vendor
    const vendorsWithStats = await Promise.all(vendors.map(async (vendor) => {
      // Get order stats
      const [allOrders, pendingOrders, cancelledOrders, refundedOrders] = await Promise.all([
        prisma.order.findMany({
          where: { vendorId: vendor.id },
          select: { total: true, status: true }
        }),
        prisma.order.count({ where: { vendorId: vendor.id, status: 'PENDING' } }),
        prisma.order.count({ where: { vendorId: vendor.id, status: 'CANCELLED' } }),
        prisma.order.count({ where: { vendorId: vendor.id, status: 'REFUNDED' } }),
      ]);

      const totalRevenue = allOrders.reduce((sum, o) => sum + (o.total || 0), 0);

      // Get overall reviews from all products
      const productReviews = await prisma.review.findMany({
        where: {
          product: { vendorId: vendor.id }
        },
        select: { rating: true }
      });

      const totalReviews = productReviews.length;
      const avgRating = totalReviews > 0 
        ? productReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews 
        : 0;

      return {
        ...vendor,
        stats: {
          totalRevenue,
          totalProducts: vendor._count.products,
          totalOrders: vendor._count.orders,
          pendingOrders,
          cancelledOrders,
          refundedOrders,
          totalReviews,
          avgRating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
        }
      };
    }));

    // Get counts by status (handle if status field doesn't exist)
    let pendingCount = 0, approvedCount = 0, verifiedCount = 0;
    try {
      [pendingCount, approvedCount, verifiedCount] = await Promise.all([
        prisma.vendor.count({ where: { status: 'PENDING' } }),
        prisma.vendor.count({ where: { status: 'APPROVED' } }),
        prisma.vendor.count({ where: { status: 'VERIFIED' } }),
      ]);
    } catch (e) {
      // status field may not exist yet, use isVerified
      const [verified, notVerified] = await Promise.all([
        prisma.vendor.count({ where: { isVerified: true } }),
        prisma.vendor.count({ where: { isVerified: false } }),
      ]);
      verifiedCount = verified;
      pendingCount = notVerified;
    }

    res.json({
      vendors: vendorsWithStats,
      statusCounts: {
        pending: pendingCount,
        approved: approvedCount,
        verified: verifiedCount,
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get all vendors error:', error);
    res.status(500).json({ error: 'Failed to get vendors' });
  }
};

// Get vendor details
export const getVendorById = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            isBlocked: true,
            createdAt: true,
          }
        },
        products: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            price: true,
            images: true,
            isActive: true,
            stock: true,
          }
        },
      }
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Get comprehensive stats
    const [
      productCount,
      totalOrders,
      pendingOrders,
      confirmedOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      refundedOrders,
    ] = await Promise.all([
      prisma.product.count({ where: { vendorId: id } }),
      prisma.order.count({ where: { vendorId: id } }),
      prisma.order.count({ where: { vendorId: id, status: 'PENDING' } }),
      prisma.order.count({ where: { vendorId: id, status: 'CONFIRMED' } }),
      prisma.order.count({ where: { vendorId: id, status: 'PROCESSING' } }),
      prisma.order.count({ where: { vendorId: id, status: 'SHIPPED' } }),
      prisma.order.count({ where: { vendorId: id, status: 'DELIVERED' } }),
      prisma.order.count({ where: { vendorId: id, status: 'CANCELLED' } }),
      prisma.order.count({ where: { vendorId: id, status: 'REFUNDED' } }),
    ]);

    // Get revenue stats
    const orders = await prisma.order.findMany({
      where: { vendorId: id },
      select: { total: true, commission: true }
    });

    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalCommission = orders.reduce((sum, o) => sum + (o.commission || 0), 0);

    // Get review stats
    const productReviews = await prisma.review.findMany({
      where: {
        product: { vendorId: id }
      },
      select: { rating: true }
    });

    const totalReviews = productReviews.length;
    const avgRating = totalReviews > 0 
      ? productReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews 
      : 0;

    // Get recent orders
    const recentOrders = await prisma.order.findMany({
      where: { vendorId: id },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: {
            user: { select: { firstName: true, lastName: true } }
          }
        }
      }
    });

    res.json({
      ...vendor,
      recentOrders,
      stats: {
        totalProducts: productCount,
        totalOrders,
        pendingOrders,
        confirmedOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        refundedOrders,
        totalRevenue,
        totalCommission,
        netRevenue: totalRevenue - totalCommission,
        totalReviews,
        avgRating: Math.round(avgRating * 10) / 10,
      }
    });
  } catch (error) {
    console.error('Get vendor by id error:', error);
    res.status(500).json({ error: 'Failed to get vendor' });
  }
};

// Update vendor status (PENDING -> APPROVED -> VERIFIED)
export const updateVendorStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'APPROVED', 'VERIFIED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be PENDING, APPROVED, or VERIFIED' });
    }

    const vendor = await prisma.vendor.update({
      where: { id },
      data: { 
        status,
        // Also update isVerified for backwards compatibility
        isVerified: status === 'VERIFIED'
      },
    });

    // Create notification for vendor
    let notificationMessage = '';
    if (status === 'APPROVED') {
      notificationMessage = 'Your vendor account has been approved! You can now start adding products.';
    } else if (status === 'VERIFIED') {
      notificationMessage = 'Congratulations! Your vendor account is now fully verified.';
    }

    if (notificationMessage) {
      await prisma.notification.create({
        data: {
          userId: vendor.userId,
          title: `Account ${status}`,
          message: notificationMessage,
          type: 'SYSTEM',
        }
      });
    }

    res.json({ message: `Vendor status updated to ${status}`, vendor });
  } catch (error) {
    console.error('Update vendor status error:', error);
    res.status(500).json({ error: 'Failed to update vendor status' });
  }
};

// Update vendor admin rating
export const updateVendorRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminRating } = req.body;

    if (adminRating < 0 || adminRating > 5) {
      return res.status(400).json({ error: 'Admin rating must be between 0 and 5' });
    }

    const vendor = await prisma.vendor.update({
      where: { id },
      data: { adminRating },
    });

    res.json({ message: 'Admin rating updated', vendor });
  } catch (error) {
    console.error('Update vendor rating error:', error);
    res.status(500).json({ error: 'Failed to update vendor rating' });
  }
};

// Update vendor commission rate
export const updateVendorCommission = async (req, res) => {
  try {
    const { id } = req.params;
    const { commissionRate } = req.body;

    if (commissionRate < 0 || commissionRate > 1) {
      return res.status(400).json({ error: 'Commission rate must be between 0 and 1' });
    }

    const vendor = await prisma.vendor.update({
      where: { id },
      data: { commissionRate },
    });

    res.json({ message: 'Commission rate updated', vendor });
  } catch (error) {
    console.error('Update commission error:', error);
    res.status(500).json({ error: 'Failed to update commission rate' });
  }
};

// Keep these for backwards compatibility
export const verifyVendor = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await prisma.vendor.update({
      where: { id },
      data: { 
        status: 'VERIFIED',
        isVerified: true 
      },
    });

    await prisma.notification.create({
      data: {
        userId: vendor.userId,
        title: 'Account Verified',
        message: 'Congratulations! Your vendor account has been verified.',
        type: 'SYSTEM',
      }
    });

    res.json({ message: 'Vendor verified successfully', vendor });
  } catch (error) {
    console.error('Verify vendor error:', error);
    res.status(500).json({ error: 'Failed to verify vendor' });
  }
};

export const unverifyVendor = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await prisma.vendor.update({
      where: { id },
      data: { 
        status: 'PENDING',
        isVerified: false 
      },
    });

    res.json({ message: 'Vendor unverified', vendor });
  } catch (error) {
    console.error('Unverify vendor error:', error);
    res.status(500).json({ error: 'Failed to unverify vendor' });
  }
};

// ============================================
// ORDER MANAGEMENT
// ============================================

// Get all orders (platform-wide)
export const getAllOrders = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status,
      vendorId,
      customerId,
      search,
      sortBy = 'createdAt', 
      order = 'desc' 
    } = req.query;

    const where = {
      ...(status && { status }),
      ...(vendorId && { vendorId }),
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
          customer: {
            select: {
              user: {
                select: { firstName: true, lastName: true, email: true }
              }
            }
          },
          vendor: {
            select: { businessName: true }
          },
          items: {
            include: {
              product: {
                select: { name: true, images: true }
              }
            }
          }
        },
        orderBy: { [sortBy]: order },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ error: 'Failed to get orders' });
  }
};

// Get order details
export const getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: {
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true, phone: true }
            },
            addresses: true,
          }
        },
        vendor: true,
        items: {
          include: {
            product: true,
            variant: true,
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order });
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({ error: 'Failed to get order details' });
  }
};

// Update order status (admin override)
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const order = await prisma.order.update({
      where: { id },
      data: { 
        status,
        ...(note && { notes: note })
      },
    });

    res.json({ message: 'Order status updated', order });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};

// ============================================
// PRODUCT MANAGEMENT
// ============================================

// Get all products (platform-wide)
export const getAllProducts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search,
      vendorId,
      categoryId,
      isActive,
      stock, // 'all', 'in_stock', 'low_stock', 'out_of_stock'
      minPrice,
      maxPrice,
      sortBy = 'createdAt', 
      order = 'desc' 
    } = req.query;

    const where = {
      ...(vendorId && { vendorId }),
      ...(categoryId && { categoryId }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // Stock filter
    if (stock === 'out_of_stock') {
      where.stockQuantity = 0;
    } else if (stock === 'low_stock') {
      where.stockQuantity = { gt: 0, lte: 10 };
    } else if (stock === 'in_stock') {
      where.stockQuantity = { gt: 10 };
    }

    // Price range filter
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    const [products, totalCount, categories, vendors] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          vendor: {
            select: { id: true, businessName: true, isVerified: true }
          },
          category: {
            select: { id: true, name: true }
          },
          variants: true,
          _count: {
            select: { reviews: true, variants: true }
          }
        },
        orderBy: { [sortBy]: order },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.product.count({ where }),
      // Get all categories for filter dropdown
      prisma.category.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
      }),
      // Get all vendors for filter dropdown
      prisma.vendor.findMany({
        select: { id: true, businessName: true },
        orderBy: { businessName: 'asc' }
      }),
    ]);

    // Get stock stats
    const [inStockCount, lowStockCount, outOfStockCount] = await Promise.all([
      prisma.product.count({ where: { stockQuantity: { gt: 10 } } }),
      prisma.product.count({ where: { stockQuantity: { gt: 0, lte: 10 } } }),
      prisma.product.count({ where: { stockQuantity: 0 } }),
    ]);

    res.json({
      products,
      categories,
      vendors,
      stockStats: {
        inStock: inStockCount,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get all products error:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
};

// Toggle product active status
export const toggleProductActive = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { isActive: !product.isActive },
    });

    res.json({ 
      message: `Product ${updated.isActive ? 'activated' : 'deactivated'}`,
      product: updated 
    });
  } catch (error) {
    console.error('Toggle product error:', error);
    res.status(500).json({ error: 'Failed to toggle product status' });
  }
};

// Delete product (admin)
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete related data first
    await prisma.productVariant.deleteMany({ where: { productId: id } });
    await prisma.review.deleteMany({ where: { productId: id } });
    await prisma.wishlist.deleteMany({ where: { productId: id } });
    await prisma.cartItem.deleteMany({ where: { productId: id } });
    await prisma.orderItem.deleteMany({ where: { productId: id } });

    await prisma.product.delete({ where: { id } });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

// ============================================
// CATEGORY MANAGEMENT
// ============================================

// Get all categories with product count
export const getAllCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true }
        }
      },
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

// Get recent activity for dashboard
export const getRecentActivity = async (req, res) => {
  try {
    const [recentOrders, recentUsers, recentVendors, recentProducts] = await Promise.all([
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              user: { select: { firstName: true, lastName: true } }
            }
          },
          vendor: { select: { businessName: true } }
        }
      }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
        }
      }),
      prisma.vendor.findMany({
        take: 5,
        where: { isVerified: false },
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { email: true, firstName: true, lastName: true } }
        }
      }),
      prisma.product.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          price: true,
          images: true,
          isActive: true,
          vendor: { select: { businessName: true } }
        }
      }),
    ]);

    res.json({
      recentOrders,
      recentUsers,
      pendingVendors: recentVendors,
      recentProducts,
    });
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({ error: 'Failed to get recent activity' });
  }
};
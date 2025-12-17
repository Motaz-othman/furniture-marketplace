import prisma from '../../shared/config/db.js';

// Get customer payment history
export const getCustomerPaymentHistory = async (req, res) => {
  try {
    const customerId = req.user.customer.id;
    const { page = 1, limit = 20, status } = req.query;

    const where = {
      customerId,
      paymentStatus: { not: 'PENDING' }
    };

    if (status) {
      where.paymentStatus = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          total: true,
          paymentStatus: true,
          stripePaymentIntentId: true,
          createdAt: true,
          updatedAt: true,
          vendor: {
            select: { businessName: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.order.count({ where })
    ]);

    // Calculate total spent
    const totalSpent = await prisma.order.aggregate({
      where: {
        customerId,
        paymentStatus: 'SUCCEEDED'
      },
      _sum: { total: true }
    });

    res.json({
      payments: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      },
      summary: {
        totalSpent: totalSpent._sum.total || 0
      }
    });

  } catch (error) {
    console.error('Get customer payment history error:', error);
    res.status(500).json({ error: 'Failed to get payment history' });
  }
};

// Get vendor payment history (earnings)
export const getVendorPaymentHistory = async (req, res) => {
  try {
    const vendorId = req.user.vendor.id;
    const { page = 1, limit = 20, status } = req.query;

    const where = {
      vendorId,
      paymentStatus: { not: 'PENDING' }
    };

    if (status) {
      where.paymentStatus = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          total: true,
          commission: true,
          paymentStatus: true,
          stripePaymentIntentId: true,
          createdAt: true,
          updatedAt: true,
          customer: {
            select: {
              user: {
                select: { firstName: true, lastName: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.order.count({ where })
    ]);

    // Calculate earnings
    const earnings = await prisma.order.aggregate({
      where: {
        vendorId,
        paymentStatus: 'SUCCEEDED'
      },
      _sum: { 
        total: true,
        commission: true
      }
    });

    const totalEarnings = (earnings._sum.total || 0) - (earnings._sum.commission || 0);

    // Add net amount to each order
    const paymentsWithNet = orders.map(order => ({
      ...order,
      netAmount: order.total - order.commission
    }));

    res.json({
      payments: paymentsWithNet,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      },
      summary: {
        totalEarnings,
        totalCommission: earnings._sum.commission || 0,
        grossSales: earnings._sum.total || 0
      }
    });

  } catch (error) {
    console.error('Get vendor payment history error:', error);
    res.status(500).json({ error: 'Failed to get payment history' });
  }
};

// Get single payment details
export const getPaymentDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { product: true }
        },
        customer: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true }
            }
          }
        },
        vendor: {
          select: { 
            userId: true, 
            businessName: true 
          }
        },
        address: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check authorization
    const isCustomer = order.customer.user.id === userId;
    const isVendor = order.vendor.userId === userId;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isCustomer && !isVendor && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
        subtotal: order.subtotal,
        tax: order.tax,
        shippingCost: order.shippingCost,
        commission: order.commission,
        netAmount: order.total - order.commission,
        paymentStatus: order.paymentStatus,
        status: order.status,
        stripePaymentIntentId: order.stripePaymentIntentId,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      },
      items: order.items,
      vendor: order.vendor,
      customer: isVendor || isAdmin ? order.customer : null,
      address: order.address
    });

  } catch (error) {
    console.error('Get payment details error:', error);
    res.status(500).json({ error: 'Failed to get payment details' });
  }
};
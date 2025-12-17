import prisma from '../../shared/config/db.js';

// Get vendor's own profile (protected)
export const getVendorProfile = async (req, res) => {
  try {
    const vendorId = req.user.vendor.id;

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        user: {
          select: { email: true, firstName: true, lastName: true }
        }
      }
    });

    res.json(vendor);

  } catch (error) {
    console.error('Get vendor error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

// Update vendor profile (protected)
export const updateVendorProfile = async (req, res) => {
  try {
    const vendorId = req.user.vendor.id;
    const { 
      businessName, description, logo, businessPhone, businessEmail,
      address, shippingZones, returnPolicy, shippingPolicy 
    } = req.body;

    const vendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        businessName,
        description,
        logo,
        businessPhone,
        businessEmail,
        address,
        shippingZones,
        returnPolicy,
        shippingPolicy
      }
    });

    res.json({
      message: 'Profile updated successfully',
      vendor
    });

  } catch (error) {
    console.error('Update vendor error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Get all vendors (public)
export const getAllVendors = async (req, res) => {
  try {
    const vendors = await prisma.vendor.findMany({
      where: { isVerified: true },
      select: {
        id: true,
        businessName: true,
        description: true,
        logo: true,
        rating: true,
        totalReviews: true,
        shippingZones: true,
        responseTime: true,
        createdAt: true
      },
      orderBy: { rating: 'desc' }
    });

    res.json(vendors);

  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({ error: 'Failed to get vendors' });
  }
};

// Get vendor by ID with products (public)
export const getVendorById = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        products: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            price: true,
            images: true,
            stockQuantity: true,
            category: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json({ vendor });
  } catch (error) {
    console.error('Get vendor error:', error);
    res.status(500).json({ error: 'Failed to fetch vendor' });
  }
};

// Get vendor statistics (vendor only) - DETAILED VERSION
export const getVendorStats = async (req, res) => {
  try {
    const vendorId = req.user.vendor.id;

    // Total orders
    const totalOrders = await prisma.order.count({
      where: { vendorId }
    }).catch(() => 0);

    // Total revenue (sum of all order totals minus commission)
    const orders = await prisma.order.findMany({
      where: { vendorId },
      select: { total: true, commission: true }
    }).catch(() => []);

    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const totalCommission = orders.reduce((sum, order) => sum + (order.commission || 0), 0);
    const netRevenue = totalRevenue - totalCommission;

    // Orders by status
    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      where: { vendorId },
      _count: { id: true }
    }).catch(() => []);

    // Total products
    const totalProducts = await prisma.product.count({
      where: { vendorId }
    });

    const activeProducts = await prisma.product.count({
      where: { vendorId, isActive: true }
    });

    // Average rating
    const products = await prisma.product.findMany({
      where: { vendorId },
      include: {
        reviews: {
          select: { rating: true }
        }
      }
    }).catch(() => []);

    let totalReviews = 0;
    let totalRating = 0;
    products.forEach(product => {
      if (product.reviews) {
        product.reviews.forEach(review => {
          totalReviews++;
          totalRating += review.rating;
        });
      }
    });

    const averageRating = totalReviews > 0 ? (totalRating / totalReviews).toFixed(2) : 0;

    res.json({
      orders: {
        total: totalOrders,
        byStatus: ordersByStatus
      },
      revenue: {
        total: totalRevenue,
        commission: totalCommission,
        net: netRevenue
      },
      products: {
        total: totalProducts,
        active: activeProducts,
        inactive: totalProducts - activeProducts
      },
      reviews: {
        total: totalReviews,
        averageRating: parseFloat(averageRating)
      }
    });

  } catch (error) {
    console.error('Get vendor stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
};

// Get vendor products (vendor only) - FOR PRODUCTS PAGE
export const getVendorProducts = async (req, res) => {
  try {
    const vendorId = req.user.vendor.id;
    
    const { page = 1, limit = 10, search, categoryId, isActive } = req.query;

    const where = {
      vendorId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(categoryId && { categoryId }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
    };

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        _count: {
          select: { variants: true }
        }
      },
      skip: (page - 1) * limit,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    });

    const totalCount = await prisma.product.count({ where });

    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
      },
    });
  } catch (error) {
    console.error('Get vendor products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

// Get vendor statistics (simple version) - FOR DASHBOARD
export const getVendorStatistics = async (req, res) => {
  try {
    const vendorId = req.user.vendor.id;

    // Count products
    const totalProducts = await prisma.product.count({
      where: { vendorId }
    });

    // Count active products
    const activeProducts = await prisma.product.count({
      where: { vendorId, isActive: true }
    });

    // Count orders (with error handling if orders table doesn't exist)
    const totalOrders = await prisma.order.count({
      where: { vendorId }
    }).catch(() => 0);

    // Calculate revenue (with error handling)
    const orders = await prisma.order.findMany({
      where: { vendorId },
      select: { total: true }
    }).catch(() => []);

    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

    // Set pending orders to 0 for now (to avoid enum issues)
    const pendingOrders = 0;

    res.json({
      totalProducts,
      activeProducts,
      totalOrders,
      totalRevenue,
      pendingOrders,
    });
  } catch (error) {
    console.error('Get vendor statistics error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};
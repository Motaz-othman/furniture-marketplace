import prisma from '../../shared/config/db.js';
import { updateProductRating, updateVendorRating } from '../../shared/utils/ratings.js';
import { notifyProductReviewed } from '../../shared/services/notification.service.js';

// Create review (customer only)
export const createReview = async (req, res) => {
  try {
    const customerId = req.user.customer.id;
    const { productId, rating, comment } = req.body;

    // ✅ CHECK IF CUSTOMER PURCHASED THIS PRODUCT
    const hasPurchased = await prisma.orderItem.findFirst({
      where: {
        productId,
        order: {
          customerId,
          status: {
            notIn: ['PENDING', 'CANCELLED']
          }
        }
      }
    });

    if (!hasPurchased) {
      return res.status(403).json({ 
        error: 'You can only review products you have purchased and received' 
      });
    }

    // Check if customer already reviewed this product
    const existingReview = await prisma.review.findUnique({
      where: {
        productId_customerId: {
          productId,
          customerId
        }
      }
    });

    if (existingReview) {
      return res.status(400).json({ error: 'You already reviewed this product' });
    }

    const review = await prisma.review.create({
      data: {
        productId,
        customerId,
        rating,
        comment
      },
      include: {
        customer: {
          include: {
            user: {
              select: { firstName: true, lastName: true }
            }
          }
        },
        product: {
          select: { vendorId: true, name: true }
        }
      }
    });

    // ✅ AUTO-UPDATE RATINGS
    await updateProductRating(productId);
    await updateVendorRating(review.product.vendorId);

    // ✅ NOTIFY VENDOR (before response)
    try {
      const vendor = await prisma.vendor.findUnique({
        where: { id: review.product.vendorId },
        select: { userId: true }
      });
      
      if (vendor) {
        await notifyProductReviewed(vendor.userId, review.product, rating);
      }
    } catch (notifError) {
      console.error('Notification error:', notifError);
    }

    res.status(201).json({
      message: 'Review created successfully',
      review
    });

  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
};

// Get product reviews (public)
export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    const reviews = await prisma.review.findMany({
      where: { productId },
      include: {
        customer: {
          include: {
            user: {
              select: { firstName: true, lastName: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(reviews);

  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to get reviews' });
  }
};

// Update review (customer only, own review)
export const updateReview = async (req, res) => {
  try {
    const customerId = req.user.customer.id;
    const { id } = req.params;
    const { rating, comment } = req.body;

    // Check ownership and get product info
    const existingReview = await prisma.review.findUnique({
      where: { id },
      include: {
        product: {
          select: { vendorId: true }
        }
      }
    });

    if (!existingReview || existingReview.customerId !== customerId) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const review = await prisma.review.update({
      where: { id },
      data: { rating, comment }
    });

    // ✅ AUTO-UPDATE RATINGS
    await updateProductRating(existingReview.productId);
    await updateVendorRating(existingReview.product.vendorId);

    res.json({
      message: 'Review updated successfully',
      review
    });

  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
};

// Delete review (customer only, own review)
export const deleteReview = async (req, res) => {
  try {
    const customerId = req.user.customer.id;
    const { id } = req.params;

    // Check ownership and get product info before deleting
    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        product: {
          select: { vendorId: true }
        }
      }
    });

    if (!review || review.customerId !== customerId) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const productId = review.productId;
    const vendorId = review.product.vendorId;

    await prisma.review.delete({
      where: { id }
    });

    // ✅ AUTO-UPDATE RATINGS
    await updateProductRating(productId);
    await updateVendorRating(vendorId);

    res.json({ message: 'Review deleted successfully' });

  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
};
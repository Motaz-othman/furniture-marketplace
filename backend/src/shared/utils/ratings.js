import prisma from '../config/db.js';

// Update product rating based on reviews
export const updateProductRating = async (productId) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { productId },
      select: { rating: true }
    });

    if (reviews.length === 0) {
      // No reviews, set rating to 0
      await prisma.product.update({
        where: { id: productId },
        data: { 
          rating: 0,
          totalReviews: 0
        }
      });
      return;
    }

    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    await prisma.product.update({
      where: { id: productId },
      data: {
        rating: averageRating,
        totalReviews: reviews.length
      }
    });

  } catch (error) {
    console.error('Update product rating error:', error);
  }
};


import prisma from '../../shared/config/db.js';

// Add to wishlist
export const addToWishlist = async (req, res) => {
  try {
    const customerId = req.user.customer.id;
    const { productId } = req.body;

    // Check if already in wishlist
    const existing = await prisma.wishlist.findUnique({
      where: {
        customerId_productId: {
          customerId,
          productId
        }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Product already in wishlist' });
    }

    const wishlistItem = await prisma.wishlist.create({
      data: {
        customerId,
        productId
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            images: true,
            stockQuantity: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Added to wishlist',
      wishlistItem
    });

  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
};

// Get customer's wishlist
export const getWishlist = async (req, res) => {
  try {
    const customerId = req.user.customer.id;

    const wishlist = await prisma.wishlist.findMany({
      where: { customerId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            images: true,
            stockQuantity: true,
            category: { select: { name: true } },
            vendor: { select: { businessName: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(wishlist);

  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ error: 'Failed to get wishlist' });
  }
};

// Remove from wishlist
export const removeFromWishlist = async (req, res) => {
  try {
    const customerId = req.user.customer.id;
    const { id } = req.params;

    // Check ownership
    const wishlistItem = await prisma.wishlist.findUnique({
      where: { id }
    });

    if (!wishlistItem || wishlistItem.customerId !== customerId) {
      return res.status(404).json({ error: 'Wishlist item not found' });
    }

    await prisma.wishlist.delete({
      where: { id }
    });

    res.json({ message: 'Removed from wishlist' });

  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
};
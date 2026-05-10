import prisma from '../../shared/config/db.js';

// Get all variants for a product
export const getProductVariants = async (req, res) => {
  try {
    const { productId } = req.params;

    const variants = await prisma.productVariant.findMany({
      where: { productId, isActive: true },
      orderBy: { rank: 'asc' }
    });

    res.json({ variants });
  } catch (error) {
    console.error('Get variants error:', error);
    res.status(500).json({ error: 'Failed to fetch variants' });
  }
};

// Get single variant by ID
export const getVariantById = async (req, res) => {
  try {
    const { variantId } = req.params;

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: { select: { id: true, name: true, slug: true } } }
    });

    if (!variant) return res.status(404).json({ error: 'Variant not found' });

    res.json({ variant });
  } catch (error) {
    console.error('Get variant error:', error);
    res.status(500).json({ error: 'Failed to fetch variant' });
  }
};

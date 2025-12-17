import prisma from '../../shared/config/db.js';

// Get all variants for a product
export const getProductVariants = async (req, res) => {
  try {
    const { productId } = req.params;

    const variants = await prisma.productVariant.findMany({
      where: { productId },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ variants });
  } catch (error) {
    console.error('Get variants error:', error);
    res.status(500).json({ error: 'Failed to fetch variants' });
  }
};

// Create variant
export const createVariant = async (req, res) => {
  try {
    const { productId } = req.params;
    const { color, size, price, compareAtPrice, sku, stockQuantity, images } = req.body;

    // Verify product exists and belongs to vendor
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // At least color or size must be provided
    if (!color && !size) {
      return res.status(400).json({ error: 'At least color or size must be specified' });
    }

    const variant = await prisma.productVariant.create({
      data: {
        productId,
        color: color || null,
        size: size || null,
        price,
        compareAtPrice: compareAtPrice || null,
        sku: sku || null,
        stockQuantity: stockQuantity || 0,
        images: images || []
      }
    });

    res.status(201).json({
      message: 'Variant created successfully',
      variant
    });
  } catch (error) {
    console.error('Create variant error:', error);
    res.status(500).json({ error: 'Failed to create variant' });
  }
};

// Update variant
export const updateVariant = async (req, res) => {
  try {
    const { variantId } = req.params;
    const { color, size, price, compareAtPrice, sku, stockQuantity, images, isActive } = req.body;

    const variant = await prisma.productVariant.update({
      where: { id: variantId },
      data: {
        color: color !== undefined ? color : undefined,
        size: size !== undefined ? size : undefined,
        price: price !== undefined ? price : undefined,
        compareAtPrice: compareAtPrice !== undefined ? compareAtPrice : undefined,
        sku: sku !== undefined ? sku : undefined,
        stockQuantity: stockQuantity !== undefined ? stockQuantity : undefined,
        images: images !== undefined ? images : undefined,
        isActive: isActive !== undefined ? isActive : undefined
      }
    });

    res.json({
      message: 'Variant updated successfully',
      variant
    });
  } catch (error) {
    console.error('Update variant error:', error);
    res.status(500).json({ error: 'Failed to update variant' });
  }
};

// Delete variant
export const deleteVariant = async (req, res) => {
  try {
    const { variantId } = req.params;

    await prisma.productVariant.delete({
      where: { id: variantId }
    });

    res.json({ message: 'Variant deleted successfully' });
  } catch (error) {
    console.error('Delete variant error:', error);
    res.status(500).json({ error: 'Failed to delete variant' });
  }
};
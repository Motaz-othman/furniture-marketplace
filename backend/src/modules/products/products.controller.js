import prisma from '../../shared/config/db.js';
import { indexProduct, removeProductFromIndex } from '../../shared/services/meilisearch.service.js';


// Get all products with filtering
export const getAllProducts = async (req, res) => {
  try {
    const { 
      categoryId, 
      vendorId, 
      minPrice, 
      maxPrice, 
      sortBy = 'createdAt', 
      order = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    // Build where clause
    const where = {
      isActive: true
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (vendorId) {
      where.vendorId = vendorId;
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    // Build orderBy
    const validSortFields = ['price', 'createdAt', 'name', 'rating'];
    const validOrders = ['asc', 'desc'];
    
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderDirection = validOrders.includes(order) ? order : 'desc';

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Get products with pagination
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          vendor: {
            select: { businessName: true }
          },
          category: {
            select: { name: true, slug: true }
          },
          variants: true  // ← ADD THIS LINE
        },
        orderBy: { [orderByField]: orderDirection },
        skip,
        take
      }),
      prisma.product.count({ where })
    ]);

    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
};

// Get single product
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        vendor: {
          select: { businessName: true, description: true }
        },
        category: {
          select: { name: true, slug: true }
        },
        variants: true  // ← ADD THIS LINE
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to get product' });
  }
};
// Create product (vendor only - we'll add protection later)
export const createProduct = async (req, res) => {
  try {
    const { 
      vendorId, 
      categoryId, 
      name, 
      description, 
      price, 
      compareAtPrice, 
      sku, 
      stockQuantity, 
      images,
      dimensions,
      materials,
      colors,
      roomType,
      style,
      assemblyRequired,
      brand,
      warranty,
      careInstructions
    } = req.body;

    const product = await prisma.product.create({
      data: {
        vendorId,
        categoryId,
        name,
        description,
        price,
        compareAtPrice,
        sku,
        stockQuantity: stockQuantity || 0,
        images: images || [],
        dimensions: dimensions || null,
        materials: materials || [],
        colors: colors || [],
        roomType: roomType || null,
        style: style || null,
        assemblyRequired: assemblyRequired || false,
        brand: brand || null,
        warranty: warranty || null,
        careInstructions: careInstructions || null
      },
      include: {
        vendor: {
          select: { businessName: true }
        },
        category: {
          select: { name: true }
        }
      }
    });

    // Sync to Meilisearch
    try {
      await indexProduct(product);
    } catch (searchError) {
      console.error('Failed to index product in search:', searchError);
    }

    res.status(201).json({
      message: 'Product created successfully',
      product: product
    });

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
};

export const updateProduct = async (req, res) => {
  try {
    console.log('🔧 UPDATE PRODUCT CALLED');
    console.log('🔧 Product ID:', req.params.id);
    console.log('🔧 Update data:', req.body);
    console.log('🔧 User:', req.user?.id, req.user?.role);
    
    const { id } = req.params;
    const updateData = req.body;

    // Update the product
    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        vendor: {
          select: {
            id: true,
            businessName: true,
          },
        },
      },
    });

    console.log('✅ PRODUCT UPDATED SUCCESSFULLY');

    res.json({
      message: 'Product updated successfully',
      product,
    });
  } catch (error) {
    console.error('❌ UPDATE PRODUCT ERROR:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(500).json({ error: 'Failed to update product' });
  }
};

// Delete product
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // First, delete all OrderItems that reference this product
    await prisma.orderItem.deleteMany({
      where: { productId: id }
    });

    // Then delete the product
    await prisma.product.delete({
      where: { id }
    });

    // Remove from Meilisearch
    try {
      await removeProductFromIndex(id);
    } catch (searchError) {
      console.error('Failed to remove product from search:', searchError);
    }

    res.json({ message: 'Product deleted successfully' });

  } catch (error) {
    console.error('Delete product error:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

// Toggle product active status (vendor only)
export const toggleProductStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Get current product
    const currentProduct = await prisma.product.findUnique({
      where: { id },
      select: { isActive: true },
    });

    if (!currentProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Toggle status
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { isActive: !currentProduct.isActive },
      include: {
        category: true,
        _count: {
          select: { variants: true }
        }
      },
    });

    res.json({
      message: `Product ${updatedProduct.isActive ? 'activated' : 'deactivated'} successfully`,
      product: updatedProduct,
    });
  } catch (error) {
    console.error('Toggle product status error:', error);
    res.status(500).json({ error: 'Failed to toggle product status' });
  }
};
// Get vendor's own products (vendor only)
export const getVendorProducts = async (req, res) => {
  try {
    const vendorId = req.user.vendorId;
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
          select: { variants: true }  // ← Add this to count variants
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
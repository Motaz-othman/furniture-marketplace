import prisma from '../../shared/config/db.js';
import { transformProductForStorefront } from '../../shared/utils/storefront.transforms.js';
import { indexProduct, removeProductFromIndex } from '../../shared/services/meilisearch.service.js';

// ─── Shared includes for storefront queries ─────────────────────────

const storefrontProductInclude = {
  vendor: { select: { businessName: true } },
  category: { select: { id: true, name: true, slug: true, parentId: true } },
  variants: true,
  storefront: {
    include: {
      category: { select: { id: true, name: true, slug: true, parentId: true } },
    },
  },
};

// ─── Public: Get all storefront products ─────────────────────────────

export const getAllProducts = async (req, res) => {
  try {
    const {
      categoryId,
      featured,
      new: isNew,
      sale,
      search,
      sortBy,
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Fetch all published products via StorefrontListing
    const listings = await prisma.storefrontListing.findMany({
      where: { isPublished: true },
      include: {
        product: {
          include: {
            vendor: { select: { businessName: true } },
            category: { select: { id: true, name: true, slug: true, parentId: true } },
            variants: true,
          },
        },
        category: { select: { id: true, name: true, slug: true, parentId: true } },
      },
    });

    // Transform all listings to frontend shape
    let products = listings.map(listing =>
      transformProductForStorefront(listing.product, listing)
    );

    // Apply filters
    if (categoryId) {
      products = products.filter(p => p.categoryId === categoryId);
    }
    if (featured === 'true') {
      products = products.filter(p => p.isFeatured);
    }
    if (isNew === 'true') {
      products = products.filter(p => p.isNew);
    }
    if (sale === 'true') {
      products = products.filter(p => p.isOnSale);
    }
    if (search) {
      const q = search.toLowerCase();
      products = products.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === 'price-asc') {
      products.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      products.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'name') {
      products.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'newest') {
      products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Paginate
    const total = products.length;
    const paginatedProducts = products.slice(
      (pageNum - 1) * limitNum,
      pageNum * limitNum
    );

    res.json({
      data: paginatedProducts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
};

// ─── Public: Get product by ID ───────────────────────────────────────

export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: storefrontProductInclude,
    });

    if (!product || !product.storefront?.isPublished) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ data: transformProductForStorefront(product) });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to get product' });
  }
};

// ─── Public: Get product by slug ─────────────────────────────────────

export const getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const product = await prisma.product.findUnique({
      where: { slug },
      include: storefrontProductInclude,
    });

    if (!product || !product.storefront?.isPublished) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ data: transformProductForStorefront(product) });
  } catch (error) {
    console.error('Get product by slug error:', error);
    res.status(500).json({ error: 'Failed to get product' });
  }
};

// ─── Public: Search products ─────────────────────────────────────────

export const searchProducts = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query (q) is required' });
    }

    req.query.search = q;
    return getAllProducts(req, res);
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({ error: 'Failed to search products' });
  }
};

// ─── Vendor: Create product ──────────────────────────────────────────

export const createProduct = async (req, res) => {
  try {
    const {
      vendorId,
      categoryId,
      name,
      slug,
      description,
      brand,
      collection,
    } = req.body;

    const product = await prisma.product.create({
      data: {
        vendorId,
        categoryId,
        name,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        description: description || '',
        brand,
        collection,
        source: 'MANUAL',
      },
      include: {
        vendor: { select: { businessName: true } },
        category: { select: { name: true } },
      },
    });

    try {
      await indexProduct(product);
    } catch (searchError) {
      console.error('Failed to index product in search:', searchError);
    }

    res.status(201).json({ message: 'Product created successfully', product });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
};

// ─── Vendor: Update product ──────────────────────────────────────────

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        vendor: { select: { id: true, businessName: true } },
      },
    });

    res.json({ message: 'Product updated successfully', product });
  } catch (error) {
    console.error('Update product error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(500).json({ error: 'Failed to update product' });
  }
};

// ─── Vendor: Delete product ──────────────────────────────────────────

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.orderItem.deleteMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });

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

// ─── Vendor: Toggle product active status ────────────────────────────

export const toggleProductStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const currentProduct = await prisma.product.findUnique({
      where: { id },
      select: { isActive: true },
    });

    if (!currentProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { isActive: !currentProduct.isActive },
      include: {
        category: true,
        _count: { select: { variants: true } },
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

// ─── Vendor: Get own products ────────────────────────────────────────

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
        _count: { select: { variants: true } },
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

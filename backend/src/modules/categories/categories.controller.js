import prisma from '../../shared/config/db.js';

// Get all categories
export const getAllCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });

    res.json(categories);

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
};

// Get single category
export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            price: true,
            images: true
          }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);

  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ error: 'Failed to get category' });
  }
};

// Create category (admin only)
export const createCategory = async (req, res) => {
  try {
    const { name, slug, description, image } = req.body;

    // Check if category exists
    const existingCategory = await prisma.category.findFirst({
      where: {
        OR: [
          { name },
          { slug }
        ]
      }
    });

    if (existingCategory) {
      return res.status(400).json({ error: 'Category with this name or slug already exists' });
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
        description,
        image
      }
    });

    res.status(201).json({
      message: 'Category created successfully',
      category
    });

  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
};

// Update category (admin only)
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, image } = req.body;

    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        slug,
        description,
        image
      }
    });

    res.json({
      message: 'Category updated successfully',
      category
    });

  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
};

// Delete category (admin only)
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category has products
    const productsCount = await prisma.product.count({
      where: { categoryId: id }
    });

    if (productsCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete category. ${productsCount} products are using this category.` 
      });
    }

    await prisma.category.delete({
      where: { id }
    });

    res.json({ message: 'Category deleted successfully' });

  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
};


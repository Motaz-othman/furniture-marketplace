import prisma from '../../shared/config/db.js';
import { invalidateKeywords } from '../../shared/services/keywords.service.js';

// ─── Public: Get all categories ──────────────────────────────────────

export const getAllCategories = async (req, res) => {
  try {
    const { parentOnly } = req.query;

    const where = parentOnly === 'true' ? { parentId: null } : {};

    const categories = await prisma.category.findMany({
      where,
      include: {
        children: parentOnly === 'true' ? { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] } : false,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    res.json({ data: categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
};

// ─── Public: Get category by ID ──────────────────────────────────────

export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        children: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
        parent: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ data: category });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ error: 'Failed to get category' });
  }
};

// ─── Public: Get category by slug ────────────────────────────────────

export const getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        children: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
        parent: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ data: category });
  } catch (error) {
    console.error('Get category by slug error:', error);
    res.status(500).json({ error: 'Failed to get category' });
  }
};

// ─── Public: Get subcategories ───────────────────────────────────────

export const getSubcategories = async (req, res) => {
  try {
    const { parentId } = req.params;

    const subcategories = await prisma.category.findMany({
      where: { parentId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    res.json({ data: subcategories });
  } catch (error) {
    console.error('Get subcategories error:', error);
    res.status(500).json({ error: 'Failed to get subcategories' });
  }
};

// ─── Public: Get category hierarchy ──────────────────────────────────

export const getCategoryHierarchy = async (req, res) => {
  try {
    const { categoryId } = req.params;

    // Build breadcrumb: walk up the parent chain
    const hierarchy = [];
    let currentId = categoryId;

    while (currentId) {
      const cat = await prisma.category.findUnique({
        where: { id: currentId },
        select: { id: true, name: true, slug: true, parentId: true },
      });

      if (!cat) break;
      hierarchy.unshift(cat);
      currentId = cat.parentId;
    }

    if (hierarchy.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ data: hierarchy });
  } catch (error) {
    console.error('Get category hierarchy error:', error);
    res.status(500).json({ error: 'Failed to get category hierarchy' });
  }
};

// ─── Admin: Create category ──────────────────────────────────────────

export const createCategory = async (req, res) => {
  try {
    const { name, slug, description, imageUrl, parentId, sortOrder } = req.body;

    const existingCategory = await prisma.category.findFirst({
      where: { OR: [{ name }, { slug }] },
    });

    if (existingCategory) {
      return res.status(400).json({ error: 'Category with this name or slug already exists' });
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
        description,
        imageUrl,
        parentId: parentId || null,
        sortOrder: sortOrder ?? 0,
      },
    });

    invalidateKeywords();
    res.status(201).json({ message: 'Category created successfully', category });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
};

// ─── Admin: Update category ──────────────────────────────────────────

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, imageUrl, parentId, sortOrder } = req.body;

    const category = await prisma.category.update({
      where: { id },
      data: { name, slug, description, imageUrl, parentId, sortOrder },
    });

    invalidateKeywords();
    res.json({ message: 'Category updated successfully', category });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
};

// ─── Admin: Delete category ──────────────────────────────────────────

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const productsCount = await prisma.product.count({
      where: { categoryId: id },
    });

    if (productsCount > 0) {
      return res.status(400).json({
        error: `Cannot delete category. ${productsCount} products are using this category.`,
      });
    }

    await prisma.category.delete({ where: { id } });

    invalidateKeywords();
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
};

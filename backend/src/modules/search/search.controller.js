import { searchProducts } from '../../shared/services/meilisearch.service.js';

// Search products
export const search = async (req, res) => {
  try {
    const { 
      q, 
      categoryId, 
      vendorId, 
      minPrice, 
      maxPrice, 
      materials, 
      colors, 
      roomType, 
      style,
      sort,
      page = 1, 
      limit = 20 
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const options = {
      limit: parseInt(limit),
      offset,
      categoryId,
      vendorId,
      minPrice: minPrice ? parseFloat(minPrice) : null,
      maxPrice: maxPrice ? maxPrice ? parseFloat(maxPrice) : null : null,
      materials: materials ? materials.split(',') : [],
      colors: colors ? colors.split(',') : [],
      roomType,
      style,
      sort
    };

    const results = await searchProducts(q || '', options);

    res.json({
      query: q || '',
      hits: results.hits,
      totalHits: results.estimatedTotalHits,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(results.estimatedTotalHits / parseInt(limit)),
      processingTimeMs: results.processingTimeMs
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
};
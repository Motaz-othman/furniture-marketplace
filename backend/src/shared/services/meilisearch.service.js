import { MeiliSearch } from 'meilisearch';

const client = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST,
  apiKey: process.env.MEILISEARCH_ADMIN_KEY
});

const PRODUCTS_INDEX = 'products';

// Initialize products index with settings
export const initializeProductsIndex = async () => {
  try {
    const index = client.index(PRODUCTS_INDEX);

    // Configure searchable attributes
    await index.updateSearchableAttributes([
      'name',
      'description',
      'categoryName',
      'vendorName',
      'materials',
      'colors',
      'style',
      'brand',
      'sku'
    ]);

    // Configure filterable attributes
    await index.updateFilterableAttributes([
      'categoryId',
      'vendorId',
      'price',
      'isActive',
      'materials',
      'colors',
      'roomType',
      'style',
      'rating',
      'stockQuantity'
    ]);

    // Configure sortable attributes
    await index.updateSortableAttributes([
      'price',
      'rating',
      'createdAt',
      'name'
    ]);

    // Configure ranking rules
    await index.updateRankingRules([
      'words',
      'typo',
      'proximity',
      'attribute',
      'sort',
      'exactness'
    ]);

    // Configure displayed attributes
    await index.updateDisplayedAttributes([
      'id',
      'name',
      'description',
      'price',
      'compareAtPrice',
      'images',
      'categoryId',
      'categoryName',
      'vendorId',
      'vendorName',
      'rating',
      'totalReviews',
      'stockQuantity',
      'materials',
      'colors',
      'roomType',
      'style',
      'brand'
    ]);

    console.log('Meilisearch products index initialized');
  } catch (error) {
    console.error('Initialize products index error:', error);
    throw error;
  }
};

// Add or update product in search index
export const indexProduct = async (product) => {
  try {
    const index = client.index(PRODUCTS_INDEX);
    
    const document = {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      sku: product.sku,
      images: product.images,
      isActive: product.isActive,
      categoryId: product.categoryId,
      categoryName: product.category?.name || '',
      vendorId: product.vendorId,
      vendorName: product.vendor?.businessName || '',
      rating: product.rating || 0,
      totalReviews: product.totalReviews || 0,
      stockQuantity: product.stockQuantity,
      materials: product.materials || [],
      colors: product.colors || [],
      roomType: product.roomType,
      style: product.style,
      brand: product.brand,
      createdAt: product.createdAt
    };

    await index.addDocuments([document]);
    return document;
  } catch (error) {
    console.error('Index product error:', error);
    throw error;
  }
};

// Remove product from search index
export const removeProductFromIndex = async (productId) => {
  try {
    const index = client.index(PRODUCTS_INDEX);
    await index.deleteDocument(productId);
  } catch (error) {
    console.error('Remove product from index error:', error);
    throw error;
  }
};

// Sync all products to search index
export const syncAllProducts = async (products) => {
  try {
    const index = client.index(PRODUCTS_INDEX);
    
    const documents = products.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      sku: product.sku,
      images: product.images,
      isActive: product.isActive,
      categoryId: product.categoryId,
      categoryName: product.category?.name || '',
      vendorId: product.vendorId,
      vendorName: product.vendor?.businessName || '',
      rating: product.rating || 0,
      totalReviews: product.totalReviews || 0,
      stockQuantity: product.stockQuantity,
      materials: product.materials || [],
      colors: product.colors || [],
      roomType: product.roomType,
      style: product.style,
      brand: product.brand,
      createdAt: product.createdAt
    }));

    await index.addDocuments(documents);
    console.log(`Synced ${documents.length} products to Meilisearch`);
  } catch (error) {
    console.error('Sync all products error:', error);
    throw error;
  }
};

// Search products
export const searchProducts = async (query, options = {}) => {
  try {
    const index = client.index(PRODUCTS_INDEX);
    
    const searchOptions = {
      limit: options.limit || 20,
      offset: options.offset || 0,
      filter: [],
      sort: options.sort ? [options.sort] : ['rating:desc']
    };

    // Build filters
    if (options.categoryId) {
      searchOptions.filter.push(`categoryId = ${options.categoryId}`);
    }

    if (options.vendorId) {
      searchOptions.filter.push(`vendorId = ${options.vendorId}`);
    }

    if (options.minPrice || options.maxPrice) {
      if (options.minPrice && options.maxPrice) {
        searchOptions.filter.push(`price ${options.minPrice} TO ${options.maxPrice}`);
      } else if (options.minPrice) {
        searchOptions.filter.push(`price >= ${options.minPrice}`);
      } else if (options.maxPrice) {
        searchOptions.filter.push(`price <= ${options.maxPrice}`);
      }
    }

    if (options.materials && options.materials.length > 0) {
      const materialFilters = options.materials.map(m => `materials = ${m}`);
      searchOptions.filter.push(`(${materialFilters.join(' OR ')})`);
    }

    if (options.colors && options.colors.length > 0) {
      const colorFilters = options.colors.map(c => `colors = ${c}`);
      searchOptions.filter.push(`(${colorFilters.join(' OR ')})`);
    }

    if (options.roomType) {
      searchOptions.filter.push(`roomType = ${options.roomType}`);
    }

    if (options.style) {
      searchOptions.filter.push(`style = ${options.style}`);
    }

    // Only show active products
    searchOptions.filter.push('isActive = true');

    // Combine filters with AND
    if (searchOptions.filter.length > 0) {
      searchOptions.filter = searchOptions.filter.join(' AND ');
    } else {
      delete searchOptions.filter;
    }

    const results = await index.search(query, searchOptions);
    return results;
  } catch (error) {
    console.error('Search products error:', error);
    throw error;
  }
};

export default client;
import api from './axios';

export const categoriesService = {
  // Get all categories
  getCategories: async () => {
    const result = await api.get('/categories');
    // Handle both array and object response
    if (Array.isArray(result)) {
      return { categories: result };
    }
    return result;
  },

  // Get single category
  getCategory: async (categoryId) => {
    return await api.get(`/categories/${categoryId}`);
  },
};
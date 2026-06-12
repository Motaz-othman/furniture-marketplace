import { getProducts } from '@/lib/api/products';
import { getCategories } from '@/lib/api/categories';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://livipoint.vercel.app';

export default async function sitemap() {
  const staticRoutes = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/products`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/categories`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
  ];

  let productRoutes = [];
  let categoryRoutes = [];

  try {
    const productsRes = await getProducts({ limit: 1000 });
    const products = productsRes?.data?.products || productsRes?.data || [];
    productRoutes = products.map((product) => ({
      url: `${BASE_URL}/products/${product.slug}`,
      lastModified: new Date(product.updatedAt || product.createdAt || Date.now()),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));
  } catch {
    // Products fetch failed — sitemap will only include static routes
  }

  try {
    const categoriesRes = await getCategories();
    const categories = categoriesRes?.data || [];
    categoryRoutes = categories.map((category) => ({
      url: `${BASE_URL}/categories/${category.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    }));
  } catch {
    // Categories fetch failed — sitemap will only include static routes
  }

  return [...staticRoutes, ...productRoutes, ...categoryRoutes];
}

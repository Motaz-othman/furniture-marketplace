import { getProducts } from '@/lib/api/products';
import { getCategories } from '@/lib/api/categories';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://livipoint.com';
const PRODUCTS_PER_SITEMAP = 500;

// Called at build time (and on-demand revalidation) to determine how many
// sitemap files to generate. id=0 is static+categories; id=1..N are products.
export async function generateSitemaps() {
  try {
    const res = await getProducts({ limit: 1, page: 1 });
    const total =
      res?.data?.pagination?.total ??
      res?.pagination?.total ??
      0;
    const productPages = Math.max(1, Math.ceil(total / PRODUCTS_PER_SITEMAP));
    return [{ id: 0 }, ...Array.from({ length: productPages }, (_, i) => ({ id: i + 1 }))];
  } catch {
    return [{ id: 0 }];
  }
}

export default async function sitemap({ id }) {
  if (id === 0) {
    const staticRoutes = [
      { url: BASE_URL,                    lastModified: new Date(), changeFrequency: 'daily',  priority: 1.0 },
      { url: `${BASE_URL}/products`,      lastModified: new Date(), changeFrequency: 'daily',  priority: 0.9 },
      { url: `${BASE_URL}/categories`,    lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    ];

    try {
      const res = await getCategories();
      const categories = res?.data || [];
      const categoryRoutes = categories.flatMap((cat) => {
        const routes = [{
          url: `${BASE_URL}/categories/${cat.slug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.7,
        }];
        (cat.children || []).forEach((sub) => routes.push({
          url: `${BASE_URL}/categories/${cat.slug}/${sub.slug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.6,
        }));
        return routes;
      });
      return [...staticRoutes, ...categoryRoutes];
    } catch {
      return staticRoutes;
    }
  }

  // id >= 1: one page of products
  try {
    const res = await getProducts({ limit: PRODUCTS_PER_SITEMAP, page: id });
    const products = res?.data?.products ?? res?.data ?? [];
    return products.map((p) => ({
      url: `${BASE_URL}/products/${p.slug}`,
      lastModified: new Date(p.updatedAt || p.createdAt || Date.now()),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));
  } catch {
    return [];
  }
}

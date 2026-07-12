import { notFound } from 'next/navigation';
import { getCategoryBySlug } from '@/lib/api/categories';
import CategoryContent from './CategoryContent';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://livipoint.com';

async function fetchCategory(slug) {
  try {
    const res = await getCategoryBySlug(slug);
    return res?.data || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const slugArray = Array.isArray(slug) ? slug : [slug];
  const parentSlug = slugArray[0];
  const subcategorySlug = slugArray[1] || null;

  const category = await fetchCategory(parentSlug);
  if (!category) return { title: 'Category Not Found' };

  const subcategory = subcategorySlug
    ? (category.children || []).find(c => c.slug === subcategorySlug)
    : null;

  const active = subcategory || category;
  const canonicalUrl = subcategory
    ? `${SITE_URL}/categories/${parentSlug}/${subcategorySlug}`
    : `${SITE_URL}/categories/${parentSlug}`;

  const title = `${active.name} Furniture`;
  const description = active.description
    || `Shop our ${active.name.toLowerCase()} furniture collection at LiviPoint — premium pieces delivered to your home in Georgia.`;

  return {
    title,
    description,
    keywords: [active.name, 'furniture', 'home decor', 'LiviPoint', 'Georgia furniture store'],
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `${title} | LiviPoint`,
      description,
      type: 'website',
      url: canonicalUrl,
      images: active.imageUrl
        ? [{ url: active.imageUrl, width: 1200, height: 630, alt: active.name }]
        : [{ url: `${SITE_URL}/og-image.jpg`, width: 1200, height: 630, alt: 'LiviPoint Furniture' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | LiviPoint`,
      description,
    },
  };
}

function BreadcrumbJsonLd({ category, subcategory, parentSlug, subcategorySlug }) {
  const items = [
    { name: 'Home', url: SITE_URL },
    { name: `${category.name} Furniture`, url: `${SITE_URL}/categories/${parentSlug}` },
  ];
  if (subcategory) {
    items.push({ name: subcategory.name, url: `${SITE_URL}/categories/${parentSlug}/${subcategorySlug}` });
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: items.map((item, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: item.name,
            item: item.url,
          })),
        }),
      }}
    />
  );
}

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  const slugArray = Array.isArray(slug) ? slug : [slug];
  const parentSlug = slugArray[0];
  const subcategorySlug = slugArray[1] || null;

  const category = await fetchCategory(parentSlug);
  if (!category) notFound();

  const subcategory = subcategorySlug
    ? (category.children || []).find(c => c.slug === subcategorySlug)
    : null;

  if (subcategorySlug && !subcategory) notFound();

  return (
    <>
      <BreadcrumbJsonLd
        category={category}
        subcategory={subcategory}
        parentSlug={parentSlug}
        subcategorySlug={subcategorySlug}
      />
      <CategoryContent params={params} />
    </>
  );
}

import { getProductBySlug, getCategoryById } from '@/lib/fake-data';
import ProductDetailContent from './ProductDetailContent';
import '../../../styles/product-detail.css';

// Generate dynamic metadata for SEO
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    return {
      title: 'Product Not Found',
      description: 'The product you are looking for does not exist.',
    };
  }

  const imageUrl = product.images?.[0]?.imageUrl || '/og-image.jpg';
  const category = typeof product.category === 'object' ? product.category : null;
  const categoryName = category?.name || '';

  return {
    title: product.name,
    description: product.shortDescription || product.description?.substring(0, 160) || `Shop ${product.name} at LiviPoint`,
    keywords: [product.name, categoryName, 'furniture', product.brand, 'LiviPoint'].filter(Boolean),
    openGraph: {
      title: `${product.name} | LiviPoint`,
      description: product.shortDescription || product.description?.substring(0, 160),
      type: 'website',
      url: `https://livipoint.com/products/${slug}`,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: product.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} | LiviPoint`,
      description: product.shortDescription || product.description?.substring(0, 160),
      images: [imageUrl],
    },
  };
}

// JSON-LD Structured Data for Product
function ProductJsonLd({ product }) {
  const imageUrl = product.images?.[0]?.imageUrl || '';
  const category = typeof product.category === 'object' ? product.category : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || product.shortDescription,
    image: product.images?.map(img => img.imageUrl) || [],
    sku: product.sku,
    brand: product.brand ? {
      '@type': 'Brand',
      name: product.brand,
    } : undefined,
    category: category?.name,
    offers: {
      '@type': 'Offer',
      url: `https://livipoint.com/products/${product.slug}`,
      priceCurrency: 'USD',
      price: product.price,
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      availability: product.stockQuantity > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: 'LiviPoint',
      },
    },
  };

  // Add sale price if on sale
  if (product.compareAtPrice && product.compareAtPrice > product.price) {
    jsonLd.offers.priceSpecification = {
      '@type': 'PriceSpecification',
      price: product.price,
      priceCurrency: 'USD',
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// Breadcrumb JSON-LD
function BreadcrumbJsonLd({ product }) {
  const category = typeof product.category === 'object' ? product.category : null;
  const parentCategory = category?.parentId ? getCategoryById(category.parentId) : null;

  const items = [
    { name: 'Home', url: 'https://livipoint.com' },
  ];

  if (parentCategory) {
    items.push({
      name: parentCategory.name,
      url: `https://livipoint.com/categories/${parentCategory.slug}`,
    });
  }

  if (category) {
    items.push({
      name: category.name,
      url: parentCategory
        ? `https://livipoint.com/categories/${parentCategory.slug}/${category.slug}`
        : `https://livipoint.com/categories/${category.slug}`,
    });
  }

  items.push({
    name: product.name,
    url: `https://livipoint.com/products/${product.slug}`,
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default async function ProductDetailPage({ params }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  return (
    <>
      {/* Structured Data */}
      {product && (
        <>
          <ProductJsonLd product={product} />
          <BreadcrumbJsonLd product={product} />
        </>
      )}

      {/* Client Component with all interactive UI */}
      <ProductDetailContent slug={slug} />
    </>
  );
}

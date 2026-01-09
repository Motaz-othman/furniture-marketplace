'use client';

import { use } from 'react';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import { getCategoryBySlug, getProductsByCategorySlug, getSubcategories } from '@/lib/fake-data';
import { formatPrice } from '@/lib/utils';

export default function CategoryPage({ params }) {
  // Next.js 15: params is a Promise, unwrap it with use()
  const { slug } = use(params);
  
  // Get category data
  const category = getCategoryBySlug(slug);
  
  // If category not found, show 404
  if (!category) {
    return (
      <MainLayout>
        <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}>
          <h1>Category Not Found</h1>
          <p>The category you're looking for doesn't exist.</p>
          <Link href="/" style={{ color: 'var(--accent-color)', textDecoration: 'underline' }}>
            Go back home
          </Link>
        </div>
      </MainLayout>
    );
  }

  // Get products for this category
  const products = getProductsByCategorySlug(slug);
  
  // Get subcategories if this is a parent category
  const subcategories = category.parentId === null ? getSubcategories(category.id) : [];

  return (
    <MainLayout>
      <div className="category-page">
        
        {/* Category Header */}
        <div className="category-header">
          <div className="container">
            <h1 className="category-title">{category.name}</h1>
            {category.description && (
              <p className="category-description">{category.description}</p>
            )}
          </div>
        </div>

        {/* Subcategories (if parent category) */}
        {subcategories.length > 0 && (
          <div className="subcategories-section">
            <div className="container">
              <h2 className="section-title">Shop by Category</h2>
              <div className="subcategories-grid">
                {subcategories.map((subcat) => (
                  <Link 
                    key={subcat.id} 
                    href={`/categories/${subcat.slug}`}
                    className="subcategory-card"
                  >
                    <div className="subcategory-image">
                      <img src={subcat.imageUrl} alt={subcat.name} />
                    </div>
                    <h3 className="subcategory-name">{subcat.name}</h3>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Products */}
        <div className="category-products">
          <div className="container">
            <h2 className="section-title">
              {products.length} {products.length === 1 ? 'Product' : 'Products'}
            </h2>
            
            {products.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <p>No products found in this category.</p>
              </div>
            ) : (
              <div className="products-grid">
                {products.map((product) => (
                  <Link 
                    key={product.id} 
                    href={`/products/${product.slug}`}
                    className="product-card"
                  >
                    <div className="product-image">
                      <img src={product.images[0]?.imageUrl} alt={product.name} />
                      {product.isNew && <span className="badge new">New</span>}
                      {product.isOnSale && <span className="badge sale">Sale</span>}
                    </div>
                    <div className="product-info">
                      <h3>{product.name}</h3>
                      <div className="product-price">
                        {product.compareAtPrice && (
                          <span className="old-price">{formatPrice(product.compareAtPrice)}</span>
                        )}
                        {formatPrice(product.price)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </MainLayout>
  );
}
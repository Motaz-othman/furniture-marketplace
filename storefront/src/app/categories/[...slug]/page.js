'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import { getCategoryBySlug, getProductsByCategorySlug, getSubcategories, getProductsByCategory, getCategoryById } from '@/lib/fake-data';
import { formatPrice } from '@/lib/utils';

// Breadcrumb Component
function Breadcrumbs({ category, subcategory }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumbs-list">
        <li className="breadcrumb-item">
          <Link href="/" className="breadcrumb-link">Home</Link>
          <span className="breadcrumb-separator">/</span>
        </li>
        {subcategory ? (
          <>
            <li className="breadcrumb-item">
              <Link href={`/categories/${category.slug}`} className="breadcrumb-link">
                {category.name}
              </Link>
              <span className="breadcrumb-separator">/</span>
            </li>
            <li className="breadcrumb-item current">
              <span className="breadcrumb-current">{subcategory.name}</span>
            </li>
          </>
        ) : (
          <li className="breadcrumb-item current">
            <span className="breadcrumb-current">{category.name}</span>
          </li>
        )}
      </ol>
    </nav>
  );
}

// Helper function to extract color hex from variant
function getColorFromVariant(variant) {
  if (!variant.attributes) return null;
  const colorAttr = variant.attributes.find(attr => attr.attribute === 'color');
  return colorAttr?.normalizedValues?.[0]?.hexValue || null;
}

// Product Card Component
function ProductCard({ product, index }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);

  // Get images for the selected variant
  const getVariantImages = (variantIndex) => {
    if (!product.variants || !product.variants[variantIndex]) return product.images;

    const variant = product.variants[variantIndex];
    const variantImages = product.images.filter(img =>
      img.variantProductIds && img.variantProductIds.includes(variant.id)
    );

    return variantImages.length > 0 ? variantImages : product.images;
  };

  const currentImages = getVariantImages(selectedVariantIndex);

  const handleAddToCart = (e) => {
    e.preventDefault();
    alert(`Added ${product.name} to cart!`);
  };

  return (
    <Link href={`/products/${product.slug}`} className="product-card">
      <div className="product-image">
        {(product.isNew || product.isOnSale) && (
          <span
            className="badge"
            style={product.isOnSale ? { background: 'var(--sale-color)', color: '#fff' } : {}}
          >
            {product.isNew ? 'New' : 'Sale'}
          </span>
        )}

        {/* Action Buttons */}
        <div className="product-actions">
          <button
            className={`action-btn wishlist-btn ${isWishlisted ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              setIsWishlisted(!isWishlisted);
            }}
            aria-label="Add to wishlist"
            title="Add to Wishlist"
          >
            <span className="action-icon">{isWishlisted ? '❤' : '♡'}</span>
          </button>

          <button
            className="action-btn add-to-cart-btn"
            onClick={handleAddToCart}
            aria-label="Add to cart"
            title="Add to Cart"
          >
            <span className="action-icon">🛒</span>
          </button>
        </div>

        <div className="product-image-wrapper">
          <img
            src={currentImages[currentImageIndex]?.imageUrl || currentImages[0]?.imageUrl}
            alt={product.name}
            className="product-img"
            loading="lazy"
          />
        </div>

        {currentImages && currentImages.length > 1 && (
          <div className="image-dots">
            {currentImages.map((_, idx) => (
              <button
                key={idx}
                className={`image-dot ${idx === currentImageIndex ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentImageIndex(idx);
                }}
                onMouseEnter={() => setCurrentImageIndex(idx)}
                aria-label={`View image ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="product-info">
        <h3>{product.name}</h3>

        {product.variants && product.variants.length > 0 && (
          <div className="color-swatches">
            {product.variants.slice(0, 3).map((variant, idx) => {
              const colorHex = getColorFromVariant(variant);

              return colorHex ? (
                <div
                  key={variant.id}
                  className={`color-swatch ${idx === selectedVariantIndex ? 'active' : ''}`}
                  style={{ background: colorHex }}
                  title={variant.variantName || variant.name}
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedVariantIndex(idx);
                    setCurrentImageIndex(0);
                  }}
                  onMouseEnter={(e) => {
                    e.preventDefault();
                    setSelectedVariantIndex(idx);
                    setCurrentImageIndex(0);
                  }}
                />
              ) : null;
            })}
          </div>
        )}

        {product.stockQuantity === 0 ? (
          <p className="stock-indicator out-of-stock">Out of Stock</p>
        ) : product.stockQuantity <= 5 ? (
          <p className="stock-indicator low-stock">Low Stock</p>
        ) : (
          <p className="stock-indicator in-stock">In Stock</p>
        )}

        <div className={`product-price ${product.compareAtPrice ? 'sale' : ''}`}>
          {product.compareAtPrice && (
            <span className="old-price">{formatPrice(product.compareAtPrice)}</span>
          )}
          {formatPrice(product.price)}
        </div>
      </div>
    </Link>
  );
}

export default function CategoryPage({ params }) {
  // Next.js 15: params is a Promise, unwrap it with use()
  const { slug } = use(params);

  // Parse the slug array to determine if we're viewing a parent or subcategory
  const slugArray = Array.isArray(slug) ? slug : [slug];
  const parentSlug = slugArray[0];
  const subcategorySlug = slugArray[1] || null;

  // Get parent category
  const parentCategory = getCategoryBySlug(parentSlug);

  // Get subcategory if we have a subcategory slug
  const subcategory = subcategorySlug ? getCategoryBySlug(subcategorySlug) : null;

  // Get the active category (either parent or subcategory)
  const activeCategory = subcategory || parentCategory;

  // Get ALL products for the parent category (including subcategories)
  const allProducts = getProductsByCategorySlug(parentSlug);

  // Get subcategories for the parent category
  const subcategories = parentCategory?.parentId === null ? getSubcategories(parentCategory.id) : [];

  // Filter products based on whether we're viewing a subcategory
  const products = subcategory
    ? allProducts.filter(product => product.categoryId === subcategory.id)
    : allProducts;

  // Get product counts for each subcategory
  const getSubcategoryProductCount = (subcatId) => {
    return allProducts.filter(product => product.categoryId === subcatId).length;
  };

  // Display title
  const displayTitle = subcategory ? subcategory.name : parentCategory?.name;

  // If category not found, show 404
  if (!parentCategory) {
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

  // If subcategory slug provided but not found, show 404
  if (subcategorySlug && !subcategory) {
    return (
      <MainLayout>
        <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}>
          <h1>Subcategory Not Found</h1>
          <p>The subcategory you're looking for doesn't exist.</p>
          <Link href={`/categories/${parentSlug}`} style={{ color: 'var(--accent-color)', textDecoration: 'underline' }}>
            View all {parentCategory.name}
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="category-page">
        {/* Breadcrumbs */}
        <div className="container">
          <Breadcrumbs
            category={parentCategory}
            subcategory={subcategory}
          />
        </div>

        {/* Subcategories (if parent category and not viewing a specific subcategory) */}
        {subcategories.length > 0 && (
          <div className="subcategories-section">
            <div className="container">
              <div className="subcategories-grid">
                {/* "All" filter card */}
                <Link
                  href={`/categories/${parentCategory.slug}`}
                  className={`subcategory-card ${!subcategory ? 'active' : ''}`}
                >
                  <div className="subcategory-image">
                    <img src={parentCategory.imageUrl} alt={parentCategory.name} loading="lazy" />
                  </div>
                  <h3 className="subcategory-name">All {parentCategory.name}</h3>
                  <span className="subcategory-count">{allProducts.length} items</span>
                </Link>

                {/* Subcategory cards */}
                {subcategories.map((subcat) => {
                  const productCount = getSubcategoryProductCount(subcat.id);
                  return (
                    <Link
                      key={subcat.id}
                      href={`/categories/${parentCategory.slug}/${subcat.slug}`}
                      className={`subcategory-card ${subcategory?.id === subcat.id ? 'active' : ''}`}
                    >
                      <div className="subcategory-image">
                        <img src={subcat.imageUrl} alt={subcat.name} loading="lazy" />
                      </div>
                      <h3 className="subcategory-name">{subcat.name}</h3>
                      <span className="subcategory-count">{productCount} items</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Products */}
        <div className="category-products">
          <div className="container">
            {products.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <p>No products found in this category.</p>
              </div>
            ) : (
              <div className="products-grid">
                {products.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </MainLayout>
  );
}

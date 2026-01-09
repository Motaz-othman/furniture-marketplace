'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import { useProducts } from '@/lib/hooks';
import { formatPrice } from '@/lib/utils';

export default function ProductDetailPage({ params }) {
  // Next.js 15: params is a Promise, must unwrap with React.use()
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  
  // Fetch all products and find the current one
  const { data: productsData, isLoading } = useProducts({ limit: 100 });
  const allProducts = productsData?.data || [];
  const product = allProducts.find(p => p.slug === slug);

  // State
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);

  // Get related products (same category, exclude current)
  const relatedProducts = allProducts
    .filter(p => {
      const productCategoryId = typeof product?.category === 'object' 
        ? product.category.id 
        : product?.categoryId;
      const pCategoryId = typeof p.category === 'object'
        ? p.category.id
        : p.categoryId;
      return pCategoryId === productCategoryId && p.id !== product?.id;
    })
    .slice(0, 4);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="product-detail-loading">
          <p>Loading product...</p>
        </div>
      </MainLayout>
    );
  }

  if (!product) {
    return (
      <MainLayout>
        <div className="product-not-found">
          <h1>Product Not Found</h1>
          <p>The product you're looking for doesn't exist.</p>
          <Link href="/products" className="back-to-products-btn">
            Back to Products
          </Link>
        </div>
      </MainLayout>
    );
  }

  const categoryName = typeof product.category === 'string' 
    ? product.category 
    : product.category?.name || '';

  const handleQuantityChange = (delta) => {
    setQuantity(Math.max(1, quantity + delta));
  };

  const handleAddToCart = () => {
    // TODO: Add to cart functionality in next phase
    alert(`Added ${quantity} x ${product.name} to cart!`);
  };

  return (
    <MainLayout>
      <div className="product-detail-page">
        <div className="product-detail-container">
          
          {/* Breadcrumbs */}
          <nav className="breadcrumbs">
            <Link href="/" className="breadcrumb-link">Home</Link>
            <span className="breadcrumb-separator">›</span>
            <Link href="/products" className="breadcrumb-link">Products</Link>
            <span className="breadcrumb-separator">›</span>
            <Link href={`/categories/${product.category?.slug}`} className="breadcrumb-link">
              {categoryName}
            </Link>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-current">{product.name}</span>
          </nav>

          {/* Main Product Section */}
          <div className="product-detail-main">
            
            {/* Image Gallery */}
            <div className="product-gallery">
              {/* Main Image */}
              <div className="gallery-main">
                <img 
                  src={product.images[selectedImage]?.imageUrl || product.images[0]?.imageUrl}
                  alt={product.name}
                  className="gallery-main-image"
                />
                
                {/* Badges */}
                <div className="gallery-badges">
                  {product.isNew && <span className="badge-detail new">New</span>}
                  {product.isOnSale && <span className="badge-detail sale">Sale</span>}
                  {product.isFeatured && <span className="badge-detail featured">Featured</span>}
                </div>
              </div>

              {/* Thumbnails */}
              {product.images.length > 1 && (
                <div className="gallery-thumbnails">
                  {product.images.map((image, index) => (
                    <button
                      key={image.id}
                      className={`gallery-thumb ${selectedImage === index ? 'active' : ''}`}
                      onClick={() => setSelectedImage(index)}
                    >
                      <img src={image.imageUrl} alt={`${product.name} view ${index + 1}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="product-info-detail">
              
              {/* Category */}
              <p className="product-category-detail">{categoryName}</p>

              {/* Title */}
              <h1 className="product-title-detail">{product.name}</h1>

              {/* Price */}
              <div className="product-price-detail">
                {product.compareAtPrice && (
                  <span className="price-compare">{formatPrice(product.compareAtPrice)}</span>
                )}
                <span className="price-main">{formatPrice(product.price)}</span>
                {product.compareAtPrice && (
                  <span className="price-savings">
                    Save {Math.round((1 - product.price / product.compareAtPrice) * 100)}%
                  </span>
                )}
              </div>

              {/* Short Description */}
              {product.shortDescription && (
                <p className="product-short-description">{product.shortDescription}</p>
              )}

              {/* Variants */}
              {product.variants && product.variants.length > 0 && (
                <div className="product-variants">
                  <label className="variant-label">Options:</label>
                  <div className="variant-options">
                    {product.variants.map((variant) => (
                      <button
                        key={variant.id}
                        className={`variant-btn ${selectedVariant?.id === variant.id ? 'active' : ''}`}
                        onClick={() => setSelectedVariant(variant)}
                      >
                        {variant.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity Selector */}
              <div className="quantity-section">
                <label className="quantity-label">Quantity:</label>
                <div className="quantity-selector">
                  <button 
                    className="quantity-btn"
                    onClick={() => handleQuantityChange(-1)}
                  >
                    −
                  </button>
                  <input 
                    type="number" 
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="quantity-input"
                    min="1"
                  />
                  <button 
                    className="quantity-btn"
                    onClick={() => handleQuantityChange(1)}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Add to Cart Button */}
              <button 
                className="add-to-cart-btn-detail"
                onClick={handleAddToCart}
              >
                Add to Cart — {formatPrice(product.price * quantity)}
              </button>

              {/* Additional Info */}
              <div className="product-meta">
                <div className="meta-item">
                  <span className="meta-label">SKU:</span>
                  <span className="meta-value">{product.sku}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Stock:</span>
                  <span className={`meta-value ${product.stockQuantity > 0 ? 'in-stock' : 'out-of-stock'}`}>
                    {product.stockQuantity > 0 ? `${product.stockQuantity} in stock` : 'Out of stock'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="product-description-section">
            <h2 className="section-title-detail">Description</h2>
            <div className="product-description-content">
              {product.description || product.shortDescription || 'No description available.'}
            </div>
          </div>

          {/* Specifications Section */}
          {product.specifications && (
            <div className="product-specifications-section">
              <h2 className="section-title-detail">Specifications</h2>
              <div className="specifications-grid">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="spec-item">
                    <span className="spec-label">{key}:</span>
                    <span className="spec-value">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="related-products-section">
              <h2 className="section-title-detail">You May Also Like</h2>
              <div className="related-products-grid">
                {relatedProducts.map((relatedProduct) => (
                  <Link 
                    key={relatedProduct.id}
                    href={`/products/${relatedProduct.slug}`}
                    className="related-product-card"
                  >
                    <div className="related-product-image">
                      <img 
                        src={relatedProduct.images[0]?.imageUrl} 
                        alt={relatedProduct.name}
                      />
                    </div>
                    <div className="related-product-info">
                      <h3 className="related-product-name">{relatedProduct.name}</h3>
                      <p className="related-product-price">{formatPrice(relatedProduct.price)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </MainLayout>
  );
}
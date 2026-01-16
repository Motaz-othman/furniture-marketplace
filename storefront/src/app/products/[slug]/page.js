'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import { useProducts } from '@/lib/hooks';
import { formatPrice } from '@/lib/utils';
import '../../../styles/product-detail.css';

export default function ProductDetailPage({ params }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const { data: productsData, isLoading } = useProducts({ limit: 100 });
  const allProducts = productsData?.data || [];
  const product = allProducts.find(p => p.slug === slug);

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [openAccordion, setOpenAccordion] = useState('overview');

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
          <div className="loading-spinner"></div>
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
    alert(`Added ${quantity} x ${product.name} to cart!`);
  };

  const discountPercentage = product.compareAtPrice
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : 0;

  return (
    <MainLayout>
      <div className="product-detail-page">

        {/* Breadcrumbs */}
        <nav className="breadcrumbs">
          <Link href="/">Home</Link>
          <span>/</span>
          <Link href="/products">Products</Link>
          <span>/</span>
          <Link href={`/categories/${product.category?.slug || 'all'}`}>
            {categoryName}
          </Link>
          <span>/</span>
          <span>{product.name}</span>
        </nav>

        <div className="product-detail-container">

          {/* Left: Image Gallery */}
          <div className="product-gallery-section">
            <div className="gallery-main-image">
              <img
                src={product.images[selectedImage]?.imageUrl || product.images[0]?.imageUrl}
                alt={product.name}
              />

              {/* Badges */}
              {(product.isNew || product.isOnSale || product.isFeatured) && (
                <div className="product-badges">
                  {product.isNew && <span className="badge badge-new">NEW ARRIVAL</span>}
                  {product.isOnSale && discountPercentage > 0 && (
                    <span className="badge badge-sale">{discountPercentage}% OFF SALE</span>
                  )}
                  {product.isFeatured && <span className="badge badge-featured">FEATURED</span>}
                </div>
              )}
            </div>

            {product.images.length > 1 && (
              <div className="gallery-thumbnails">
                {product.images.map((image, index) => (
                  <button
                    key={image.id}
                    className={`thumbnail ${selectedImage === index ? 'active' : ''}`}
                    onClick={() => setSelectedImage(index)}
                  >
                    <img src={image.imageUrl} alt={`View ${index + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Info */}
          <div className="product-info-section">

            {/* Brand & Collection */}
            {(product.brand || product.collection) && (
              <div className="product-brand">
                {product.brand && <span>{product.brand}</span>}
                {product.collection && <span className="collection"> • {product.collection}</span>}
              </div>
            )}

            {/* Title */}
            <h1 className="product-title">{product.name}</h1>

            {/* SKU & Stock */}
            <div className="product-meta-top">
              <span className="sku">SKU: {product.sku}</span>
              <span className="stock-status">
                {product.inStock ? (
                  <>
                    <span className="status-icon">✓</span>
                    In stock & ready to ship
                  </>
                ) : (
                  <>
                    <span className="status-icon">○</span>
                    Sold out
                  </>
                )}
              </span>
            </div>

            {/* Price */}
            <div className="product-pricing">
              {product.compareAtPrice && (
                <span className="price-original">${product.compareAtPrice.toFixed(2)}</span>
              )}
              <span className="price-current">${product.price.toFixed(2)}</span>
              {product.compareAtPrice && (
                <span className="price-save">Save {discountPercentage}%</span>
              )}
            </div>

            {/* Short Description */}
            {product.shortDescription && (
              <p className="product-description">{product.shortDescription}</p>
            )}

            {/* Variants/Options */}
            {product.variants && product.variants.length > 1 && (
              <div className="product-variants">
                <label>Options:</label>
                <div className="variant-options">
                  {product.variants.map((variant) => (
                    <button
                      key={variant.id}
                      className={`variant-btn ${selectedVariant?.id === variant.id ? 'selected' : ''}`}
                      onClick={() => setSelectedVariant(variant)}
                    >
                      {variant.name || variant.variantName}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="quantity-section">
              <label>Quantity:</label>
              <div className="quantity-selector">
                <button
                  className="qty-btn"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                >
                  −
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                />
                <button
                  className="qty-btn"
                  onClick={() => handleQuantityChange(1)}
                >
                  +
                </button>
              </div>
            </div>

            {/* Add to Cart */}
            <button
              className="btn-add-to-cart"
              onClick={handleAddToCart}
              disabled={!product.inStock}
            >
              {product.inStock ? 'Add to Cart' : 'Sold Out'}
            </button>

            {/* Overview - Fixed Text */}
            <div className="product-overview">
              <p>{product.description || product.shortDescription || 'No description available.'}</p>
            </div>

            {/* Accordion Section */}
            <div className="product-accordions">

          {/* Details Accordion */}
          <div className="accordion-item">
            <button
              className={`accordion-header ${openAccordion === 'details' ? 'active' : ''}`}
              onClick={() => setOpenAccordion(openAccordion === 'details' ? '' : 'details')}
            >
              <h3>Details</h3>
              <span className="accordion-icon">+</span>
            </button>
            <div className={`accordion-content ${openAccordion === 'details' ? 'open' : ''}`}>
              <div className="accordion-body">
                <div className="details-grid">
                  <div className="detail-row">
                    <span className="detail-label">SKU:</span>
                    <span className="detail-value">{product.sku}</span>
                  </div>
                  {product.brand && (
                    <div className="detail-row">
                      <span className="detail-label">Brand:</span>
                      <span className="detail-value">{product.brand}</span>
                    </div>
                  )}
                  {product.collection && (
                    <div className="detail-row">
                      <span className="detail-label">Collection:</span>
                      <span className="detail-value">{product.collection}</span>
                    </div>
                  )}
                  {product.provider && (
                    <div className="detail-row">
                      <span className="detail-label">Provider:</span>
                      <span className="detail-value">{product.provider}</span>
                    </div>
                  )}
                  {product.stockQuantity !== undefined && (
                    <div className="detail-row">
                      <span className="detail-label">Stock:</span>
                      <span className="detail-value">{product.stockQuantity} units</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Dimensions Accordion */}
          <div className="accordion-item">
            <button
              className={`accordion-header ${openAccordion === 'dimensions' ? 'active' : ''}`}
              onClick={() => setOpenAccordion(openAccordion === 'dimensions' ? '' : 'dimensions')}
            >
              <h3>Dimensions</h3>
              <span className="accordion-icon">+</span>
            </button>
            <div className={`accordion-content ${openAccordion === 'dimensions' ? 'open' : ''}`}>
              <div className="accordion-body">
                {product.dimensions ? (
                  <div className="dimensions-table">
                    <div className="dimension-row">
                      <span>Height:</span>
                      <span>{product.dimensions.height} {product.dimensions.unit || 'cm'}</span>
                    </div>
                    <div className="dimension-row">
                      <span>Width:</span>
                      <span>{product.dimensions.width} {product.dimensions.unit || 'cm'}</span>
                    </div>
                    <div className="dimension-row">
                      <span>Length/Depth:</span>
                      <span>{product.dimensions.length} {product.dimensions.unit || 'cm'}</span>
                    </div>
                    <div className="dimension-row">
                      <span>Weight:</span>
                      <span>{product.dimensions.weight} {product.dimensions.weightUnit || 'kg'}</span>
                    </div>
                  </div>
                ) : (
                  <p>Dimensions not available</p>
                )}
              </div>
            </div>
          </div>

            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="related-products-section">
            <h2>You May Also Like</h2>
            <div className="related-products-grid">
              {relatedProducts.map((relatedProduct) => (
                <Link
                  key={relatedProduct.id}
                  href={`/products/${relatedProduct.slug}`}
                  className="related-product-card"
                >
                  <div className="related-image">
                    <img
                      src={relatedProduct.images[0]?.imageUrl}
                      alt={relatedProduct.name}
                    />
                  </div>
                  <div className="related-info">
                    <h3>{relatedProduct.name}</h3>
                    <p className="related-price">{formatPrice(relatedProduct.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </MainLayout>
  );
}

'use client';

import { use, useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { useProducts } from '@/lib/hooks';
import { formatPrice, getVariantColor } from '@/lib/utils';
import { getCategoryById } from '@/lib/fake-data';
import '../../../styles/product-detail.css';

// Helper function to extract color hex from variant
function getColorFromVariant(variant) {
  if (!variant.attributes) return null;
  const colorAttr = variant.attributes.find(attr => attr.attribute === 'color');
  return colorAttr?.normalizedValues?.[0]?.hexValue || null;
}

// Generate thumbnail URL for blur-up effect
function getThumbnailUrl(src) {
  if (!src) return null;
  if (src.includes('unsplash.com')) {
    return src.replace(/w=\d+/, 'w=40').replace(/q=\d+/, 'q=20');
  }
  return null;
}

// Related Product Card with progressive image loading
function RelatedProductCard({ product }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const cardRef = useRef(null);

  const imageUrl = product.images[0]?.imageUrl;
  const thumbnailUrl = getThumbnailUrl(imageUrl);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px', threshold: 0.01 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Handle cached images that are already loaded
  const handleImageRef = (img) => {
    if (img && img.complete && img.naturalHeight > 0) {
      setImageLoaded(true);
    }
  };

  return (
    <Link
      ref={cardRef}
      href={`/products/${product.slug}`}
      className="related-product-card"
    >
      <div className="related-image progressive-image-wrapper">
        <div className={`progressive-image-shimmer ${imageLoaded ? 'loaded' : ''}`} />
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, 200px"
            className={`progressive-image-main ${imageLoaded ? 'loaded' : ''}`}
            onLoad={() => setImageLoaded(true)}
            placeholder={thumbnailUrl ? 'blur' : 'empty'}
            blurDataURL={thumbnailUrl || undefined}
          />
        )}
      </div>
      <div className="related-info">
        <h3>{product.name}</h3>
        <p className="related-price">{formatPrice(product.price)}</p>
      </div>
    </Link>
  );
}

// Helper function to get clean variant label (just the variant value, not full name)
function getVariantLabel(variant, productName) {
  // First try to get from attributes
  if (variant.attributes && variant.attributes.length > 0) {
    const mainAttribute = variant.attributes[0];
    if (mainAttribute.values && mainAttribute.values.length > 0) {
      return mainAttribute.values[0];
    }
    if (mainAttribute.normalizedValues && mainAttribute.normalizedValues.length > 0) {
      return mainAttribute.normalizedValues[0].commonName || mainAttribute.normalizedValues[0].value;
    }
  }

  // Fallback: extract variant value from variant name by removing product name
  const variantName = variant.name || variant.variantName || '';
  if (productName && variantName.includes(productName)) {
    // Remove product name and separator (- or :)
    return variantName.replace(productName, '').replace(/^\s*[-:]\s*/, '').trim();
  }

  return variantName;
}

export default function ProductDetailPage({ params }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const router = useRouter();

  const { data: productsData, isLoading } = useProducts({ limit: 100 });
  const allProducts = productsData?.data || [];
  const product = allProducts.find(p => p.slug === slug);

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [openAccordion, setOpenAccordion] = useState('overview');
  const [mainImageLoaded, setMainImageLoaded] = useState(false);

  // Swipe back navigation for mobile
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const pageRef = useRef(null);

  // Handle back navigation
  const handleBack = useCallback(() => {
    // Check if there's browser history to go back to
    if (window.history.length > 1) {
      router.back();
    } else {
      // Fallback to products page if no history
      router.push('/products');
    }
  }, [router]);

  // Swipe gesture handlers for back navigation
  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const deltaX = touchEndX - touchStartX.current;
    const deltaY = Math.abs(touchEndY - touchStartY.current);

    // Swipe right to go back (only if started from left edge and horizontal swipe)
    const swipeThreshold = 100;
    const edgeThreshold = 50; // Must start within 50px of left edge

    if (
      touchStartX.current < edgeThreshold && // Started from left edge
      deltaX > swipeThreshold && // Swiped right enough
      deltaY < 100 // Not too much vertical movement
    ) {
      handleBack();
    }
  }, [handleBack]);

  // Set first variant as default when product loads
  useEffect(() => {
    if (product && !selectedVariant && product.variants && product.variants.length > 0) {
      setSelectedVariant(product.variants[0]);
    }
  }, [product, selectedVariant]);

  // Get current display values based on selected variant or product
  const currentPrice = selectedVariant?.price || product?.price || 0;
  const currentCompareAtPrice = selectedVariant?.compareAtPrice || product?.compareAtPrice || null;
  const currentSku = selectedVariant?.sku || product?.sku || '';
  const currentStock = selectedVariant?.stockQuantity ?? product?.stockQuantity ?? 0;
  const currentInStock = currentStock > 0;

  // Filter images for selected variant based on variantProductIds
  const currentImages = (() => {
    if (!product?.images || product.images.length === 0) return [];
    if (!selectedVariant) return product.images;

    // Filter images that include the selected variant's product ID
    const variantImages = product.images.filter(img =>
      img.variantProductIds && img.variantProductIds.includes(selectedVariant.id)
    );

    // Return variant-specific images if found, otherwise all images
    return variantImages.length > 0 ? variantImages : product.images;
  })();

  // Handle variant selection
  const handleVariantSelect = (variant) => {
    setSelectedVariant(variant);
    setSelectedImage(0); // Reset to first image when variant changes
    setMainImageLoaded(false); // Reset image loaded state
  };

  // Reset image loaded state when selected image changes
  useEffect(() => {
    setMainImageLoaded(false);
  }, [selectedImage]);

  // Handle cached images that are already loaded
  const handleMainImageRef = (img) => {
    if (img && img.complete && img.naturalHeight > 0) {
      setMainImageLoaded(true);
    }
  };

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

  // Get category info for breadcrumbs
  const subcategory = typeof product.category === 'object' ? product.category : null;
  const categoryName = subcategory?.name || (typeof product.category === 'string' ? product.category : '');

  // Get parent category if this is a subcategory
  const parentCategory = subcategory?.parentId ? getCategoryById(subcategory.parentId) : null;

  // Build the category URL - if we have parent, use semantic URL
  const categoryUrl = parentCategory
    ? `/categories/${parentCategory.slug}/${subcategory.slug}`
    : `/categories/${subcategory?.slug || 'all'}`;

  const handleQuantityChange = (delta) => {
    setQuantity(Math.max(1, quantity + delta));
  };

  const handleAddToCart = () => {
    const variantInfo = selectedVariant ? ` (${selectedVariant.name || selectedVariant.variantName})` : '';
    alert(`Added ${quantity} x ${product.name}${variantInfo} to cart!`);
  };

  const discountPercentage = currentCompareAtPrice
    ? Math.round((1 - currentPrice / currentCompareAtPrice) * 100)
    : 0;

  return (
    <MainLayout>
      <div
        className="product-detail-page"
        ref={pageRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Breadcrumbs */}
        <nav className="breadcrumbs">
          <Link href="/">Home</Link>
          <span>/</span>
          {parentCategory ? (
            <>
              <Link href={`/categories/${parentCategory.slug}`}>
                {parentCategory.name}
              </Link>
              <span>/</span>
              <Link href={categoryUrl}>
                {categoryName}
              </Link>
            </>
          ) : (
            <Link href={categoryUrl}>
              {categoryName}
            </Link>
          )}
          <span>/</span>
          <span>{product.name}</span>
        </nav>

        <div className="product-detail-container">

          {/* Left: Image Gallery */}
          <div className="product-gallery-section">
            <div className="gallery-main-image progressive-image-wrapper">
              {/* Shimmer placeholder */}
              <div className={`progressive-image-shimmer ${mainImageLoaded ? 'loaded' : ''}`} />

              {/* Main image with Next.js Image optimization */}
              {(currentImages[selectedImage]?.imageUrl || currentImages[0]?.imageUrl) && (
                <Image
                  src={currentImages[selectedImage]?.imageUrl || currentImages[0]?.imageUrl}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className={`progressive-image-main ${mainImageLoaded ? 'loaded' : ''}`}
                  onLoad={() => setMainImageLoaded(true)}
                  placeholder={getThumbnailUrl(currentImages[selectedImage]?.imageUrl || currentImages[0]?.imageUrl) ? 'blur' : 'empty'}
                  blurDataURL={getThumbnailUrl(currentImages[selectedImage]?.imageUrl || currentImages[0]?.imageUrl) || undefined}
                  priority
                />
              )}

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

            {currentImages.length > 1 && (
              <div className="gallery-thumbnails">
                {currentImages.map((image, index) => (
                  <button
                    key={image.id || index}
                    className={`thumbnail ${selectedImage === index ? 'active' : ''}`}
                    onClick={() => setSelectedImage(index)}
                  >
                    <Image
                      src={image.imageUrl}
                      alt={`View ${index + 1}`}
                      fill
                      sizes="80px"
                    />
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
              <span className="sku">SKU: {currentSku}</span>
              <span className={`stock-status ${currentStock === 0 ? 'out-of-stock' : currentStock <= 5 ? 'low-stock' : 'in-stock'}`}>
                {currentStock === 0 ? (
                  <>
                    <span className="status-icon">○</span>
                    Sold Out
                  </>
                ) : currentStock <= 5 ? (
                  <>
                    <span className="status-icon">!</span>
                    Low Stock
                  </>
                ) : (
                  <>
                    <span className="status-icon">✓</span>
                    In Stock
                  </>
                )}
              </span>
            </div>

            {/* Price */}
            <div className="product-pricing">
              {currentCompareAtPrice && (
                <span className="price-original">${currentCompareAtPrice.toFixed(2)}</span>
              )}
              <span className="price-current">${currentPrice.toFixed(2)}</span>
              {currentCompareAtPrice && discountPercentage > 0 && (
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
                  {product.variants.map((variant) => {
                    const colorHex = getColorFromVariant(variant);

                    if (colorHex) {
                      // Render as color swatch
                      return (
                        <button
                          key={variant.id}
                          className={`variant-color-swatch ${selectedVariant?.id === variant.id ? 'selected' : ''}`}
                          onClick={() => handleVariantSelect(variant)}
                          title={variant.name || variant.variantName}
                          style={{ backgroundColor: colorHex }}
                        >
                          <span className="color-checkmark">✓</span>
                        </button>
                      );
                    } else {
                      // Render as text button for non-color variants
                      return (
                        <button
                          key={variant.id}
                          className={`variant-btn ${selectedVariant?.id === variant.id ? 'selected' : ''}`}
                          onClick={() => handleVariantSelect(variant)}
                        >
                          {getVariantLabel(variant, product.name)}
                        </button>
                      );
                    }
                  })}
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
              disabled={!currentInStock}
            >
              {currentInStock ? 'Add to Cart' : 'Sold Out'}
            </button>

            {/* Overview - Fixed Text */}
            <div className="product-overview">
              <p>{product.description || product.shortDescription || 'No description available.'}</p>
            </div>

            {/* Accordion Section */}
            <div className="product-accordions">

          {/* Measurements Accordion */}
          {product.measurements && product.measurements.length > 0 && (
            <div className="accordion-item">
              <button
                className={`accordion-header ${openAccordion === 'measurements' ? 'active' : ''}`}
                onClick={() => setOpenAccordion(openAccordion === 'measurements' ? '' : 'measurements')}
              >
                <h3>Measurements</h3>
                <span className="accordion-icon">+</span>
              </button>
              <div className={`accordion-content ${openAccordion === 'measurements' ? 'open' : ''}`}>
                <div className="accordion-body">
                  <div className="measurements-grid">
                    {product.measurements.map((piece, index) => (
                      <div key={index} className="measurement-row">
                        <span className="measurement-label">
                          {piece.name || 'Dimensions'}:
                        </span>
                        <span className="measurement-value">
                          {piece.dimensions && (
                            <>
                              {piece.dimensions.height}" H × {piece.dimensions.width}" W × {piece.dimensions.depth}" D
                            </>
                          )}
                          {piece.weight && (
                            <span className="measurement-weight"> | {piece.weight} {piece.weightUnit}</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

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
                </div>
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
                <RelatedProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          </div>
        )}

      </div>
    </MainLayout>
  );
}

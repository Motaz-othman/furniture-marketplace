'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { useProductBySlug, useProducts, useCart, useCategory } from '@/lib/hooks';
import { formatPrice, getColorFromVariant, getThumbnailUrl } from '@/lib/utils';
import toast from 'react-hot-toast';

// Related Product Card with progressive image loading
function RelatedProductCard({ product }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const cardRef = useRef(null);

  const imageUrl = product.images[0]?.imageUrl;
  const thumbnailUrl = getThumbnailUrl(imageUrl);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
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

// Attribute keys that represent SIZE-type variation
const SIZE_ATTR_KEYS = ['size', 'actual_size', 'dimensions', 'rug_size'];
// Attribute keys that represent COLOR-type variation
const COLOR_ATTR_KEYS = ['color', 'finish', 'fabric_color', 'fabric'];

// Inspect all variants to find which attributes actually differ (more than 1 unique value).
// Returns { sectionLabel, hasColor, hasSize } to drive the section header and button labels.
function analyzeVariants(variants) {
  const attrValues = {};

  for (const v of variants) {
    for (const a of (v.attributes || [])) {
      const key = a.attribute?.toLowerCase();
      const val = a.values?.[0] ?? a.normalizedValues?.[0]?.commonName;
      if (key && val) {
        if (!attrValues[key]) attrValues[key] = new Set();
        attrValues[key].add(val);
      }
    }
    for (const o of (v.options || [])) {
      const key = o.option?.toLowerCase();
      if (key && o.value) {
        if (!attrValues[key]) attrValues[key] = new Set();
        attrValues[key].add(o.value);
      }
    }
  }

  const distinguishing = Object.entries(attrValues)
    .filter(([, s]) => s.size > 1)
    .map(([k]) => k);

  const hasColor = distinguishing.some(k => COLOR_ATTR_KEYS.includes(k));
  const hasSize  = distinguishing.some(k => SIZE_ATTR_KEYS.includes(k));

  let sectionLabel;
  if (hasColor && hasSize)    sectionLabel = 'Color / Size';
  else if (hasColor)          sectionLabel = 'Color';
  else if (hasSize)           sectionLabel = 'Size';
  else if (distinguishing.length) {
    sectionLabel = distinguishing[0].charAt(0).toUpperCase() + distinguishing[0].slice(1);
  } else {
    sectionLabel = 'Options';
  }

  return { distinguishing, hasColor, hasSize, sectionLabel };
}

// Build the button label for a single variant based on which attributes vary.
function getVariantOptionLabel(variant, hasColor, hasSize) {
  const getVal = (keys) => {
    for (const key of keys) {
      const attr = (variant.attributes || []).find(a => a.attribute?.toLowerCase() === key);
      if (attr) return attr.values?.[0] ?? attr.normalizedValues?.[0]?.commonName;
      const opt = (variant.options || []).find(o => o.option?.toLowerCase() === key);
      if (opt?.value) return opt.value;
    }
    return null;
  };

  const parts = [];
  if (hasColor) { const v = getVal(COLOR_ATTR_KEYS); if (v) parts.push(v); }
  if (hasSize)  { const v = getVal(SIZE_ATTR_KEYS);  if (v) parts.push(v); }
  if (parts.length) return parts.join(' / ');

  // Fallback: first attribute or option value
  const firstAttr = variant.attributes?.[0];
  if (firstAttr) return firstAttr.values?.[0] ?? firstAttr.normalizedValues?.[0]?.commonName ?? '—';
  return variant.options?.[0]?.value ?? variant.sku ?? '—';
}

export default function ProductDetailContent({ slug }) {
  const router = useRouter();
  const { addItem } = useCart();

  // Fetch single product by slug - much more efficient than fetching all products
  const { data: productData, isLoading, error } = useProductBySlug(slug);
  const product = productData?.data || null;

  // Fetch products for related products section (only when we have product category)
  const categoryId = product?.categoryId || product?.category?.id;
  const { data: relatedData } = useProducts(
    { categoryId, limit: 5 },
    { enabled: !!categoryId }
  );
  const relatedProducts = (relatedData?.data || [])
    .filter(p => p.id !== product?.id)
    .slice(0, 4);

  // Fetch parent category for breadcrumb URL
  const parentCategoryId = product?.category?.parentId;
  const { data: parentCatData } = useCategory(parentCategoryId, { enabled: !!parentCategoryId });

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [openAccordion, setOpenAccordion] = useState('overview');
  const [mainImageLoaded, setMainImageLoaded] = useState(false);

  // Zoom modal state
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const pageRef = useRef(null);
  const galleryTouchStart = useRef({ x: 0, y: 0 });

  // Zoom gesture refs
  const lastTapTime = useRef(0);
  const initialPinchDistance = useRef(0);
  const initialScale = useRef(1);
  const lastPanPosition = useRef({ x: 0, y: 0 });
  const zoomImageRef = useRef(null);

  // Calculate current images based on selected variant - must be before callbacks that use it
  const currentImages = (() => {
    if (!product?.images || product.images.length === 0) return [];
    if (!selectedVariant) return product.images;
    const variantImages = product.images.filter(img =>
      img.variantProductIds && img.variantProductIds.includes(selectedVariant.id)
    );
    return variantImages.length > 0 ? variantImages : product.images;
  })();

  // Derived: the URL that is actually displayed in the main image slot.
  // Only reset the loading shimmer when this URL changes — not on every variant click —
  // so same-color size variants (which share the same gallery) don't get stuck loading.
  const mainImageUrl = currentImages[selectedImage]?.imageUrl ?? currentImages[0]?.imageUrl;

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/products');
    }
  }, [router]);

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = Math.abs(touchEndY - touchStartY.current);
    const swipeThreshold = 100;
    const edgeThreshold = 50;

    if (
      touchStartX.current < edgeThreshold &&
      deltaX > swipeThreshold &&
      deltaY < 100
    ) {
      handleBack();
    }
  }, [handleBack]);

  // Gallery swipe handlers for image navigation
  const handleGalleryTouchStart = useCallback((e) => {
    galleryTouchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  }, []);

  const handleGalleryTouchEnd = useCallback((e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - galleryTouchStart.current.x;
    const deltaY = Math.abs(touchEndY - galleryTouchStart.current.y);
    const swipeThreshold = 50;

    // Only trigger if horizontal swipe is dominant
    if (Math.abs(deltaX) > swipeThreshold && deltaY < 100) {
      if (deltaX < 0) {
        // Swipe left - next image
        setSelectedImage(prev =>
          prev < currentImages.length - 1 ? prev + 1 : 0
        );
      } else {
        // Swipe right - previous image
        setSelectedImage(prev =>
          prev > 0 ? prev - 1 : currentImages.length - 1
        );
      }
    }
  }, [currentImages.length]);

  // Open zoom modal on tap (mobile) - double tap to close
  const handleImageTap = useCallback((e) => {
    const now = Date.now();
    const doubleTapDelay = 300;

    if (now - lastTapTime.current < doubleTapDelay) {
      // Double tap detected - toggle zoom
      if (isZoomOpen) {
        setIsZoomOpen(false);
        setZoomScale(1);
        setZoomPosition({ x: 0, y: 0 });
      } else {
        setIsZoomOpen(true);
      }
    }
    lastTapTime.current = now;
  }, [isZoomOpen]);

  // Calculate distance between two touch points
  const getTouchDistance = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Handle pinch zoom start
  const handleZoomTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      initialPinchDistance.current = getTouchDistance(e.touches);
      initialScale.current = zoomScale;
    } else if (e.touches.length === 1 && zoomScale > 1) {
      lastPanPosition.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    }
  }, [zoomScale]);

  // Handle pinch zoom move
  const handleZoomTouchMove = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const currentDistance = getTouchDistance(e.touches);
      const scale = (currentDistance / initialPinchDistance.current) * initialScale.current;
      setZoomScale(Math.min(Math.max(scale, 1), 4));
    } else if (e.touches.length === 1 && zoomScale > 1) {
      e.preventDefault();
      const deltaX = e.touches[0].clientX - lastPanPosition.current.x;
      const deltaY = e.touches[0].clientY - lastPanPosition.current.y;

      setZoomPosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));

      lastPanPosition.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    }
  }, [zoomScale]);

  // Handle zoom touch end - reset if scale is close to 1
  const handleZoomTouchEnd = useCallback(() => {
    if (zoomScale < 1.1) {
      setZoomScale(1);
      setZoomPosition({ x: 0, y: 0 });
    }
  }, [zoomScale]);

  // Close zoom modal
  const closeZoom = useCallback(() => {
    setIsZoomOpen(false);
    setZoomScale(1);
    setZoomPosition({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (product && !selectedVariant && product.variants && product.variants.length > 0) {
      setSelectedVariant(product.variants[0]);
    }
  }, [product, selectedVariant]);

  // Use product-level pricing (includes admin's Original Price / Discounted Price overrides)
  const currentPrice = product?.price || 0;
  const currentCompareAtPrice = product?.compareAtPrice || null;
  const currentSku = selectedVariant?.sku || product?.sku || '';
  const currentStock = selectedVariant?.stockQuantity ?? product?.stockQuantity ?? 0;
  const currentInStock = currentStock > 0;

  // Reset loading shimmer whenever the displayed image URL actually changes.
  // Using the URL (not variant or selectedImage) prevents the shimmer from getting stuck
  // when switching between variants that share the same gallery (e.g. same-color size variants).
  useEffect(() => {
    setMainImageLoaded(false);
  }, [mainImageUrl]);

  const handleVariantSelect = (variant) => {
    setSelectedVariant(variant);
    setSelectedImage(0);
  };

  // Error state
  if (error) {
    return (
      <MainLayout>
        <div className="product-error">
          <h1>Unable to Load Product</h1>
          <p>We encountered an error while loading this product. Please try again.</p>
          <div className="error-actions">
            <button
              onClick={() => window.location.reload()}
              className="error-retry-btn"
            >
              Try Again
            </button>
            <Link href="/products" className="back-to-products-btn">
              Back to Products
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

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

  const subcategory = typeof product.category === 'object' ? product.category : null;
  const categoryName = subcategory?.name || (typeof product.category === 'string' ? product.category : '');
  const parentCategory = parentCatData?.data || null;
  const categoryUrl = parentCategory
    ? `/categories/${parentCategory.slug}/${subcategory.slug}`
    : `/categories/${subcategory?.slug || 'all'}`;

  const handleQuantityChange = (delta) => {
    setQuantity(Math.max(1, quantity + delta));
  };

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      variantId: selectedVariant?.id || null,
      quantity,
      product,
      variant: selectedVariant,
    });
    const variantInfo = selectedVariant ? ` (${selectedVariant.name || selectedVariant.variantName})` : '';
    toast.success(`Added ${quantity} x ${product.name}${variantInfo} to cart`);
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
            <div
              className="gallery-main-image progressive-image-wrapper"
              onTouchStart={handleGalleryTouchStart}
              onTouchEnd={(e) => {
                handleGalleryTouchEnd(e);
                handleImageTap(e);
              }}
              onClick={() => setIsZoomOpen(true)}
            >
              <div className={`progressive-image-shimmer ${mainImageLoaded ? 'loaded' : ''}`} />
              {(currentImages[selectedImage]?.imageUrl || currentImages[0]?.imageUrl) && (
                <Image
                  src={currentImages[selectedImage]?.imageUrl || currentImages[0]?.imageUrl}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className={`progressive-image-main ${mainImageLoaded ? 'loaded' : ''}`}
                  onLoad={() => setMainImageLoaded(true)}
                  onError={() => setMainImageLoaded(true)}
                  placeholder={getThumbnailUrl(currentImages[selectedImage]?.imageUrl || currentImages[0]?.imageUrl) ? 'blur' : 'empty'}
                  blurDataURL={getThumbnailUrl(currentImages[selectedImage]?.imageUrl || currentImages[0]?.imageUrl) || undefined}
                  priority
                />
              )}
              {(product.isNew || product.isOnSale || product.isFeatured) && (
                <div className="product-badges">
                  {product.isNew && <span className="badge badge-new">NEW ARRIVAL</span>}
                  {product.isOnSale && discountPercentage > 0 && (
                    <span className="badge badge-sale">{discountPercentage}% OFF SALE</span>
                  )}
                  {product.isFeatured && <span className="badge badge-featured">FEATURED</span>}
                </div>
              )}
              {/* Mobile image dots indicator */}
              {currentImages.length > 1 && (
                <div className="gallery-mobile-dots">
                  {currentImages.map((_, idx) => (
                    <button
                      key={idx}
                      className={`gallery-dot ${idx === selectedImage ? 'active' : ''}`}
                      onClick={() => setSelectedImage(idx)}
                      aria-label={`View image ${idx + 1}`}
                    />
                  ))}
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
            {(product.brand || product.collection) && (
              <div className="product-brand">
                {product.brand && <span>{product.brand}</span>}
                {product.collection && <span className="collection"> • {product.collection}</span>}
              </div>
            )}

            <h1 className="product-title">{product.name}</h1>

            {product.totalReviews > 0 && (
              <div className="product-detail-rating">
                <div className="product-detail-stars">
                  {[1,2,3,4,5].map((star) => {
                    const filled = star <= Math.floor(product.rating);
                    const half = !filled && star === Math.ceil(product.rating) && product.rating % 1 >= 0.5;
                    return (
                      <span key={star} className={`detail-star ${filled ? 'filled' : half ? 'half' : ''}`}>★</span>
                    );
                  })}
                </div>
                <span className="product-detail-rating-score">{product.rating.toFixed(1)}</span>
                <span className="product-detail-review-count">({product.totalReviews} {product.totalReviews === 1 ? 'review' : 'reviews'})</span>
              </div>
            )}

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

            <div className="product-pricing">
              {currentCompareAtPrice && (
                <span className="price-original">${currentCompareAtPrice.toFixed(2)}</span>
              )}
              <span className="price-current">${currentPrice.toFixed(2)}</span>
              {currentCompareAtPrice && discountPercentage > 0 && (
                <span className="price-save">Save {discountPercentage}%</span>
              )}
            </div>

            {product.shortDescription && (
              <p className="product-description">{product.shortDescription}</p>
            )}

            {product.variants && product.variants.length > 1 && (() => {
              const { hasColor, hasSize, sectionLabel } = analyzeVariants(product.variants);
              return (
                <div className="product-variants">
                  <label>{sectionLabel}:</label>
                  <div className="variant-options">
                    {product.variants.map((variant) => {
                      // Show color swatches only when color is the sole differentiator
                      const colorHex = (hasColor && !hasSize) ? getColorFromVariant(variant) : null;
                      if (colorHex) {
                        return (
                          <button
                            key={variant.id}
                            className={`variant-color-swatch ${selectedVariant?.id === variant.id ? 'selected' : ''}`}
                            onClick={() => handleVariantSelect(variant)}
                            title={getVariantOptionLabel(variant, hasColor, hasSize)}
                            style={{ backgroundColor: colorHex }}
                          >
                            <span className="color-checkmark">✓</span>
                          </button>
                        );
                      }
                      return (
                        <button
                          key={variant.id}
                          className={`variant-btn ${selectedVariant?.id === variant.id ? 'selected' : ''}`}
                          onClick={() => handleVariantSelect(variant)}
                        >
                          {getVariantOptionLabel(variant, hasColor, hasSize)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

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

            <button
              className="btn-add-to-cart"
              onClick={handleAddToCart}
              disabled={!currentInStock}
            >
              {currentInStock ? 'Add to Cart' : 'Sold Out'}
            </button>

            <div className="product-overview">
              <p>{product.description || product.shortDescription || 'No description available.'}</p>
            </div>

            <div className="product-accordions">
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

      {/* Sticky Add to Cart - Mobile only */}
      <div className="sticky-add-to-cart">
        <div className="sticky-content">
          <span className="sticky-price">${currentPrice.toFixed(2)}</span>
          <button
            className="sticky-btn"
            onClick={handleAddToCart}
            disabled={!currentInStock}
          >
            {currentInStock ? 'Add to Cart' : 'Sold Out'}
          </button>
        </div>
      </div>

      {/* Image Zoom Modal */}
      {isZoomOpen && (
        <div
          className="zoom-modal-overlay"
          onClick={closeZoom}
        >
          <button
            className="zoom-close-btn"
            onClick={closeZoom}
            aria-label="Close zoom view"
          >
            ✕
          </button>
          <div className="zoom-hint">Pinch to zoom • Double-tap to close</div>
          <div
            className="zoom-image-container"
            ref={zoomImageRef}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleZoomTouchStart}
            onTouchMove={handleZoomTouchMove}
            onTouchEnd={handleZoomTouchEnd}
          >
            {(currentImages[selectedImage]?.imageUrl || currentImages[0]?.imageUrl) && (
              <Image
                src={currentImages[selectedImage]?.imageUrl || currentImages[0]?.imageUrl}
                alt={product.name}
                fill
                sizes="100vw"
                className="zoom-image"
                style={{
                  transform: `scale(${zoomScale}) translate(${zoomPosition.x / zoomScale}px, ${zoomPosition.y / zoomScale}px)`,
                  transition: zoomScale === 1 ? 'transform 0.2s ease-out' : 'none'
                }}
                priority
              />
            )}
          </div>
          {/* Navigation arrows in zoom modal */}
          {currentImages.length > 1 && (
            <div className="zoom-nav-buttons">
              <button
                className="zoom-nav-btn prev"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImage(prev => prev > 0 ? prev - 1 : currentImages.length - 1);
                  setZoomScale(1);
                  setZoomPosition({ x: 0, y: 0 });
                }}
                aria-label="Previous image"
              >
                ‹
              </button>
              <span className="zoom-image-counter">
                {selectedImage + 1} / {currentImages.length}
              </span>
              <button
                className="zoom-nav-btn next"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImage(prev => prev < currentImages.length - 1 ? prev + 1 : 0);
                  setZoomScale(1);
                  setZoomPosition({ x: 0, y: 0 });
                }}
                aria-label="Next image"
              >
                ›
              </button>
            </div>
          )}
        </div>
      )}
    </MainLayout>
  );
}

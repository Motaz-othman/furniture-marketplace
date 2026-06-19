'use client';

import { useState, useEffect, memo, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatPrice, getColorFromVariant, getThumbnailUrl } from '@/lib/utils';
import { useWishlist } from '@/lib/hooks';
import { Heart } from 'lucide-react';
import toast from 'react-hot-toast';

const ProductCard = memo(function ProductCard({ product, index }) {
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Memoize variant images calculation
  const currentImages = useMemo(() => {
    if (!product.variants || !product.variants[selectedVariantIndex]) return product.images;

    const variant = product.variants[selectedVariantIndex];
    const variantImages = product.images.filter(img =>
      img.variantProductIds && img.variantProductIds.includes(variant.id)
    );

    return variantImages.length > 0 ? variantImages : product.images;
  }, [product.variants, product.images, selectedVariantIndex]);

  const currentImageUrl = currentImages?.[currentImageIndex]?.imageUrl || currentImages?.[0]?.imageUrl || null;
  const thumbnailUrl = useMemo(() => getThumbnailUrl(currentImageUrl), [currentImageUrl]);

  // Price range memoized
  const priceDisplay = useMemo(() => {
    const prices = product.variants
      ?.map(v => v.price)
      .filter(p => p != null && p > 0) || [];
    const min = prices.length ? Math.min(...prices) : product.price;
    const max = prices.length ? Math.max(...prices) : product.price;
    return min !== max
      ? `${formatPrice(min)} – ${formatPrice(max)}`
      : formatPrice(product.price);
  }, [product.variants, product.price]);

  // Reset image loaded state when image changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [currentImageUrl]);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const handleWishlistToggle = useCallback(async (e) => {
    e.preventDefault();
    const wasWishlisted = isWishlisted(product.id);
    try {
      await toggleWishlist(product);
      toast.success(wasWishlisted ? 'Removed from wishlist' : 'Added to wishlist');
    } catch {
      toast.error('Failed to update wishlist');
    }
  }, [product, isWishlisted, toggleWishlist]);

  const handleImageDotClick = useCallback((e, idx) => {
    e.preventDefault();
    setCurrentImageIndex(idx);
  }, []);

  const handleVariantSelect = useCallback((e, idx) => {
    e.preventDefault();
    setSelectedVariantIndex(idx);
    setCurrentImageIndex(0);
  }, []);

  return (
    <Link href={`/products/${product.slug}`} className="product-card">
      <div className="product-image">
        {(product.isOnSale || product.isNew) && (
          <div className="badges">
            {product.isOnSale && product.compareAtPrice > product.price && (
              <span className="badge badge-sale">
                -{Math.round((1 - product.price / product.compareAtPrice) * 100)}%
              </span>
            )}
            {product.isOnSale && !product.compareAtPrice && (
              <span className="badge badge-sale">Sale</span>
            )}
            {product.isNew && (
              <span className="badge badge-new">New</span>
            )}
          </div>
        )}

        {/* Wishlist button — top right */}
        <button
          className={`action-btn wishlist-btn ${isWishlisted(product.id) ? 'active' : ''}`}
          onClick={handleWishlistToggle}
          aria-label="Add to wishlist"
          title="Add to Wishlist"
        >
          <Heart size={18} strokeWidth={1.8} fill={isWishlisted(product.id) ? 'currentColor' : 'none'} />
        </button>


        <div className="product-image-wrapper progressive-image-wrapper">
          {/* Shimmer placeholder - shown until image loads */}
          <div className={`progressive-image-shimmer ${imageLoaded ? 'loaded' : ''}`} />

          {/* Main image using Next.js Image for optimization */}
          {currentImageUrl && !imageError ? (
            <Image
              src={currentImageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className={`product-img progressive-image-main ${imageLoaded ? 'loaded' : ''}`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              placeholder={thumbnailUrl ? 'blur' : 'empty'}
              blurDataURL={thumbnailUrl || undefined}
              priority={index < 4}
            />
          ) : (
            <div className="product-img-placeholder">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
          )}
        </div>

        {currentImages && currentImages.length > 1 && (
          <div className="image-dots">
            {currentImages.map((_, idx) => (
              <button
                key={idx}
                className={`image-dot ${idx === currentImageIndex ? 'active' : ''}`}
                onClick={(e) => handleImageDotClick(e, idx)}
                aria-label={`View image ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="product-info">
        <h3>{product.name}</h3>

        {product.totalReviews > 0 && (
          <div className="product-card-rating">
            <div className="product-card-stars">
              {[1,2,3,4,5].map((star) => (
                <span
                  key={star}
                  className={`card-star ${star <= Math.round(product.rating) ? 'filled' : ''}`}
                >★</span>
              ))}
            </div>
            <span className="product-card-review-count">({product.totalReviews})</span>
          </div>
        )}

        {product.variants && product.variants.length > 0 && (() => {
          const firstVariant = product.variants[0];
          const isColorType = !!getColorFromVariant(firstVariant);
          const optionLabel = firstVariant?.options?.[0]?.option || null;
          const MAX = 3;

          return (
            <div className="color-swatches">
              {product.variants.slice(0, MAX).map((variant, idx) => {
                const colorHex = getColorFromVariant(variant);
                const isOutOfStock = variant.stockQuantity === 0;
                const label = variant.options?.[0]?.value || variant.variantName || variant.name;

                if (colorHex) {
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      className={`color-swatch ${idx === selectedVariantIndex ? 'active' : ''} ${isOutOfStock ? 'out-of-stock' : ''}`}
                      style={{ background: colorHex }}
                      title={`${label}${isOutOfStock ? ' — Out of Stock' : ''}`}
                      aria-label={`Select ${label}${isOutOfStock ? ', out of stock' : ''}`}
                      onClick={(e) => handleVariantSelect(e, idx)}
                    />
                  );
                }
                if (!isColorType && label) {
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      className={`variant-option-pill ${idx === selectedVariantIndex ? 'active' : ''} ${isOutOfStock ? 'out-of-stock' : ''}`}
                      title={`${label}${isOutOfStock ? ' — Out of Stock' : ''}`}
                      aria-label={`Select ${label}${isOutOfStock ? ', out of stock' : ''}`}
                      onClick={(e) => handleVariantSelect(e, idx)}
                    >
                      {label}
                    </button>
                  );
                }
                return null;
              })}
              {product.variants.length > MAX && (
                <span className="swatch-more">+{product.variants.length - MAX}</span>
              )}
            </div>
          );
        })()}

        <div className={`product-price ${product.compareAtPrice ? 'sale' : ''}`}>
          {product.compareAtPrice && (
            <span className="old-price">{formatPrice(product.compareAtPrice)}</span>
          )}
          {priceDisplay}
        </div>
      </div>
    </Link>
  );
});

export default ProductCard;

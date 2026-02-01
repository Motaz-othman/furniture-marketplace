'use client';

import { useState, useEffect, memo, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils';

function getColorFromVariant(variant) {
  if (!variant.attributes) return null;
  const colorAttr = variant.attributes.find(attr => attr.attribute === 'color');
  return colorAttr?.normalizedValues?.[0]?.hexValue || null;
}

// Generate thumbnail URL for blur-up effect
function getThumbnailUrl(src) {
  if (!src) return null;
  // For Unsplash URLs, request a tiny version
  if (src.includes('unsplash.com')) {
    return src.replace(/w=\d+/, 'w=20').replace(/q=\d+/, 'q=10');
  }
  return null;
}

const ProductCard = memo(function ProductCard({ product, index }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Memoize variant images calculation
  const currentImages = useMemo(() => {
    if (!product.variants || !product.variants[selectedVariantIndex]) return product.images;

    const variant = product.variants[selectedVariantIndex];
    const variantImages = product.images.filter(img =>
      img.variantProductIds && img.variantProductIds.includes(variant.id)
    );

    return variantImages.length > 0 ? variantImages : product.images;
  }, [product.variants, product.images, selectedVariantIndex]);

  const currentImageUrl = currentImages[currentImageIndex]?.imageUrl || currentImages[0]?.imageUrl;
  const thumbnailUrl = useMemo(() => getThumbnailUrl(currentImageUrl), [currentImageUrl]);

  // Reset image loaded state when image changes
  useEffect(() => {
    setImageLoaded(false);
  }, [currentImageUrl]);

  const handleAddToCart = useCallback((e) => {
    e.preventDefault();
    alert(`Added ${product.name} to cart!`);
  }, [product.name]);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleWishlistToggle = useCallback((e) => {
    e.preventDefault();
    setIsWishlisted(prev => !prev);
  }, []);

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
            onClick={handleWishlistToggle}
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

        <div className="product-image-wrapper progressive-image-wrapper">
          {/* Shimmer placeholder - shown until image loads */}
          <div className={`progressive-image-shimmer ${imageLoaded ? 'loaded' : ''}`} />

          {/* Main image using Next.js Image for optimization */}
          {currentImageUrl && (
            <Image
              src={currentImageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className={`product-img progressive-image-main ${imageLoaded ? 'loaded' : ''}`}
              onLoad={handleImageLoad}
              placeholder={thumbnailUrl ? 'blur' : 'empty'}
              blurDataURL={thumbnailUrl || undefined}
              priority={index < 4}
            />
          )}
        </div>

        {currentImages && currentImages.length > 1 && (
          <div className="image-dots">
            {currentImages.map((_, idx) => (
              <button
                key={idx}
                className={`image-dot ${idx === currentImageIndex ? 'active' : ''}`}
                onClick={(e) => handleImageDotClick(e, idx)}
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
                  onClick={(e) => handleVariantSelect(e, idx)}
                  onMouseEnter={(e) => handleVariantSelect(e, idx)}
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
});

export default ProductCard;

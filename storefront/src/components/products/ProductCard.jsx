'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';

function getColorFromVariant(variant) {
  if (!variant.attributes) return null;
  const colorAttr = variant.attributes.find(attr => attr.attribute === 'color');
  return colorAttr?.normalizedValues?.[0]?.hexValue || null;
}

export default function ProductCard({ product, index }) {
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
                    setCurrentImageIndex(0); // Reset to first image when changing variant
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

'use client';

import Link from 'next/link';
import Image from 'next/image';
import MainLayout from '@/components/layout/MainLayout';
import { useWishlist } from '@/lib/hooks';
import { useAuth } from '@/lib/hooks';
import { formatPrice } from '@/lib/utils';
import { Heart, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WishlistPage() {
  const { items, isLoading, toggle } = useWishlist();
  const { isAuthenticated } = useAuth();

  async function handleRemove(item) {
    try {
      await toggle(item.product || { id: item.productId });
      toast.success('Removed from wishlist');
    } catch {
      toast.error('Failed to remove item');
    }
  }

  return (
    <MainLayout>
      <div className="wishlist-page">
        <div className="container">
          <div className="wishlist-header">
            <h1>My Wishlist</h1>
            {items.length > 0 && (
              <p className="wishlist-count">{items.length} {items.length === 1 ? 'item' : 'items'}</p>
            )}
          </div>

          {!isAuthenticated && (
            <div className="wishlist-guest-notice">
              <p>
                <Link href="/auth/login?redirect=/wishlist">Sign in</Link> to save your wishlist across devices.
              </p>
            </div>
          )}

          {isLoading ? (
            <div className="wishlist-grid">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="wishlist-skeleton">
                  <div className="wishlist-skeleton-img" />
                  <div className="wishlist-skeleton-text" />
                  <div className="wishlist-skeleton-text short" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="wishlist-empty">
              <Heart size={64} strokeWidth={1} className="wishlist-empty-icon" />
              <h2>Your wishlist is empty</h2>
              <p>Save items you love and come back to them anytime.</p>
              <Link href="/products" className="btn">Browse Products</Link>
            </div>
          ) : (
            <div className="wishlist-grid">
              {items.map((item) => {
                const product = item.product || {};
                const imageUrl = product.mainImage || product.images?.[0]?.imageUrl || null;
                const price = product.minPrice || product.price || 0;
                const maxPrice = product.maxPrice;

                return (
                  <div key={item.id} className="wishlist-card">
                    <Link href={`/products/${product.slug}`} className="wishlist-card-image">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={product.name || 'Product'}
                          fill
                          sizes="(max-width: 640px) 50vw, 25vw"
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="wishlist-no-image">
                          <Heart size={32} strokeWidth={1} />
                        </div>
                      )}
                    </Link>

                    <div className="wishlist-card-info">
                      <Link href={`/products/${product.slug}`} className="wishlist-card-name">
                        {product.name || 'Product'}
                      </Link>
                      <div className="wishlist-card-price">
                        {maxPrice && maxPrice !== price
                          ? `${formatPrice(price)} – ${formatPrice(maxPrice)}`
                          : formatPrice(price)}
                      </div>
                    </div>

                    <button
                      className="wishlist-card-remove"
                      onClick={() => handleRemove(item)}
                      title="Remove from wishlist"
                      aria-label="Remove from wishlist"
                    >
                      <Trash2 size={16} strokeWidth={1.8} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

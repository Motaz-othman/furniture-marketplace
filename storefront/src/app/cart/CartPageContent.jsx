'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import MainLayout from '@/components/layout/MainLayout';
import { useCart } from '@/lib/hooks';
import { formatPrice } from '@/lib/utils';

export default function CartPageContent() {
  const { items, itemCount, total, isLoading, updateItem, removeItem, clearAll } = useCart();
  const [updatingId, setUpdatingId] = useState(null);

  const handleQuantityChange = async (item, newQuantity) => {
    if (newQuantity < 1) return;
    setUpdatingId(item.id);
    try {
      await updateItem(item.id, newQuantity);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update quantity');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (item) => {
    try {
      await removeItem(item.id);
      toast.success('Item removed');
    } catch {
      toast.error('Failed to remove item');
    }
  };

  const handleClearCart = async () => {
    try {
      await clearAll();
      toast.success('Cart cleared');
    } catch {
      toast.error('Failed to clear cart');
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="cart-page">
          <div className="cart-loading">
            <p>Loading cart...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (itemCount === 0) {
    return (
      <MainLayout>
        <div className="cart-page">
          <div className="cart-empty">
            <span className="cart-empty-icon">🛒</span>
            <h1>Your Cart is Empty</h1>
            <p>Looks like you haven&apos;t added anything yet.</p>
            <Link href="/products" className="cart-continue-btn">
              Continue Shopping
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  const shipping = total >= 500 ? 0 : 49.99;
  const grandTotal = total + shipping;

  return (
    <MainLayout>
      <div className="cart-page">
        <div className="cart-header">
          <h1>Shopping Cart</h1>
          <span className="cart-header-count">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
        </div>

        <div className="cart-layout">
          {/* Items List */}
          <div className="cart-items">
            {items.map((item) => {
              const product = item.product;
              const variant = item.variant;
              const imageUrl = product?.mainImage;
              const price =
                variant?.price?.retailPrice ??
                (typeof variant?.price === 'number' ? variant.price : null) ??
                product?.minPrice ??
                product?.price ??
                0;
              const variantName = variant?.name || variant?.variantName || null;

              return (
                <div key={item.id} className="cart-item">
                  <Link href={`/products/${product?.slug || ''}`} className="cart-item-image">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={product?.name || 'Product'}
                        fill
                        sizes="100px"
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="cart-item-no-image">No Image</div>
                    )}
                  </Link>

                  <div className="cart-item-details">
                    <Link href={`/products/${product?.slug || ''}`} className="cart-item-name">
                      {product?.name || 'Product'}
                    </Link>
                    {variantName && (
                      <p className="cart-item-variant">{variantName}</p>
                    )}
                    <p className="cart-item-price">{formatPrice(price)}</p>
                  </div>

                  <div className="cart-item-quantity">
                    <button
                      className="qty-btn"
                      onClick={() => handleQuantityChange(item, item.quantity - 1)}
                      disabled={item.quantity <= 1 || updatingId === item.id}
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      className="qty-btn"
                      onClick={() => handleQuantityChange(item, item.quantity + 1)}
                      disabled={updatingId === item.id}
                    >
                      +
                    </button>
                  </div>

                  <div className="cart-item-subtotal">
                    {formatPrice(price * item.quantity)}
                  </div>

                  <button
                    className="cart-item-remove"
                    onClick={() => handleRemove(item)}
                    aria-label="Remove item"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>

          {/* Summary Sidebar */}
          <div className="cart-summary">
            <h2>Order Summary</h2>
            <div className="cart-summary-row">
              <span>Subtotal</span>
              <span>{formatPrice(total)}</span>
            </div>
            <div className="cart-summary-row">
              <span>Shipping</span>
              <span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
            </div>
            <div className="cart-summary-divider" />
            <div className="cart-summary-row cart-summary-total">
              <span>Total</span>
              <span>{formatPrice(grandTotal)}</span>
            </div>
            {total < 500 && (
              <p className="cart-free-shipping-note">
                Add {formatPrice(500 - total)} more for free shipping
              </p>
            )}
            <Link href="/checkout" className="cart-checkout-btn">
              Proceed to Checkout
            </Link>
            <Link href="/products" className="cart-continue-link">
              Continue Shopping
            </Link>
            <button className="cart-clear-btn" onClick={handleClearCart}>
              Clear Cart
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

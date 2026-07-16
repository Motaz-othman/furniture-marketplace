'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCustomerOrders } from '@/lib/api/orders';
import { Package } from '@/components/ui/Icons';
import { getItemStatus, ITEM_STATUS_LABEL, ITEM_STATUS_STYLE } from '@/lib/itemStatus';
import Link from 'next/link';
import toast from 'react-hot-toast';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatPrice(amount) {
  return `$${Number(amount).toFixed(2)}`;
}

function ItemStatusBadge({ item }) {
  const status = getItemStatus(item);
  const { bg, color } = ITEM_STATUS_STYLE[status] || ITEM_STATUS_STYLE.PENDING;
  return (
    <span style={{ background: bg, color, borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {ITEM_STATUS_LABEL[status] || status}
    </span>
  );
}

export default function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1 });
  const [expandedId, setExpandedId] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCustomerOrders({ page, limit: 10 });
      setOrders(data.orders || []);
      setPagination(data.pagination || { totalPages: 1 });
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  if (loading && orders.length === 0) {
    return <div className="account-loading">Loading orders...</div>;
  }

  return (
    <div className="account-section">
      <h2>Orders</h2>

      {orders.length === 0 && !loading && (
        <div className="account-empty-state">
          <Package size={48} />
          <p>No orders yet</p>
          <Link href="/products" className="profile-edit-btn">Start Shopping</Link>
        </div>
      )}

      {orders.length > 0 && (
        <div className="order-list">
          {orders.map((order) => {
            const isExpanded = expandedId === order.id;
            const items = order.items || [];
            const visibleItems = isExpanded ? items : items.slice(0, 2);

            return (
              <div key={order.id} className="order-card">
                <div className="order-card-header">
                  <div className="order-meta">
                    <Link href={`/account/orders/${order.id}`} className="order-number order-number-link">
                      {order.orderNumber}
                    </Link>
                    <span className="order-date">{formatDate(order.createdAt)}</span>
                  </div>
                </div>

                <div className="order-items">
                  {visibleItems.map((item) => (
                    <div key={item.id} className="order-item-row">
                      <span className="order-item-name">{item.product?.name || 'Product'}</span>
                      <span className="order-item-qty">×{item.quantity}</span>
                      <span className="order-item-price">{formatPrice(item.price)}</span>
                      <ItemStatusBadge item={item} />
                    </div>
                  ))}
                  {items.length > 2 && !isExpanded && (
                    <button className="order-more-items" onClick={() => setExpandedId(order.id)}>
                      +{items.length - 2} more item{items.length - 2 > 1 ? 's' : ''}
                    </button>
                  )}
                  {isExpanded && items.length > 2 && (
                    <button className="order-more-items" onClick={() => setExpandedId(null)}>
                      Show less
                    </button>
                  )}
                </div>

                {order.address && (
                  <div className="order-address">
                    <span className="order-address-label">Ship to:</span>
                    <span>
                      {order.address.street}, {order.address.city},{' '}
                      {order.address.state} {order.address.zipCode}
                    </span>
                  </div>
                )}

                <div className="order-card-footer">
                  {order.discountAmount > 0 && (
                    <span className="order-discount">
                      Discount{order.couponCode ? ` (${order.couponCode})` : ''}: −{formatPrice(order.discountAmount)}
                    </span>
                  )}
                  <span className="order-total">Total: {formatPrice(order.total)}</span>
                  <div className="order-footer-actions">
                    <Link href={`/account/orders/${order.id}`} className="order-view-btn">
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="orders-pagination">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span>Page {page} of {pagination.totalPages}</span>
          <button disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCustomerOrders, cancelOrder } from '@/lib/api/orders';
import { Package } from '@/components/ui/Icons';
import { getAuthError } from '@/lib/api/auth';
import ConfirmDialog from './ConfirmDialog';
import Link from 'next/link';
import toast from 'react-hot-toast';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatPrice(amount) {
  return `$${Number(amount).toFixed(2)}`;
}

export default function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1 });
  const [cancelConfirmId, setCancelConfirmId] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      const data = await getCustomerOrders(params);
      setOrders(data.orders || []);
      setPagination(data.pagination || { totalPages: 1 });
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelOrder(cancelConfirmId);
      toast.success('Order cancelled');
      await fetchOrders();
    } catch (err) {
      toast.error(getAuthError(err, 'Failed to cancel order'));
    } finally {
      setCancelling(false);
      setCancelConfirmId(null);
    }
  };

  if (loading && orders.length === 0) {
    return <div className="account-loading">Loading orders...</div>;
  }

  return (
    <>
      <div className="account-section">
        <h2>Orders</h2>

        {orders.length === 0 && !loading && (
          <div className="account-empty-state">
            <Package size={48} />
            <p>No orders yet</p>
            <Link href="/products" className="profile-edit-btn">
              Start Shopping
            </Link>
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
                      <span className="order-number">{order.orderNumber}</span>
                      <span className="order-date">{formatDate(order.createdAt)}</span>
                    </div>
                    <span className={`order-status status-${order.status.toLowerCase()}`}>
                      {order.status}
                    </span>
                  </div>

                  <div className="order-items">
                    {visibleItems.map((item) => (
                      <div key={item.id} className="order-item-row">
                        <span className="order-item-name">
                          {item.product?.name || 'Product'}
                        </span>
                        <span className="order-item-qty">x{item.quantity}</span>
                        <span className="order-item-price">{formatPrice(item.price)}</span>
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
                      <span>{order.address.street}, {order.address.city}, {order.address.state} {order.address.zipCode}</span>
                    </div>
                  )}

                  <div className="order-card-footer">
                    <span className="order-total">Total: {formatPrice(order.total)}</span>
                    <div className="order-footer-actions">
                      {order.trackingNumber && (
                        <span className="order-tracking">Tracking: {order.trackingNumber}</span>
                      )}
                      {order.status === 'PENDING' && (
                        <button className="order-cancel-btn" onClick={() => setCancelConfirmId(order.id)}>
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="orders-pagination">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span>Page {page} of {pagination.totalPages}</span>
            <button disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        )}
      </div>

      {cancelConfirmId && (
        <ConfirmDialog
          title="Cancel Order"
          message="Are you sure you want to cancel this order? This cannot be undone."
          confirmLabel="Cancel Order"
          variant="danger"
          isLoading={cancelling}
          onConfirm={handleCancel}
          onCancel={() => setCancelConfirmId(null)}
        />
      )}
    </>
  );
}

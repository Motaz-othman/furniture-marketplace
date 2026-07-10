'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCustomerOrders, cancelOrder, requestReturn } from '@/lib/api/orders';
import { Package } from '@/components/ui/Icons';
import { getAuthError } from '@/lib/api/auth';
import ConfirmDialog from './ConfirmDialog';
import Link from 'next/link';
import toast from 'react-hot-toast';

const RETURN_REASONS = [
  'Item arrived damaged or defective',
  'Wrong item received',
  'Item not as described or pictured',
  'Changed my mind / No longer needed',
  'Missing parts or accessories',
  'Other',
];

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

function initReturnItems(order) {
  const map = {};
  (order.items || []).forEach((item) => {
    map[item.id] = { selected: true, quantity: item.quantity };
  });
  return map;
}

export default function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1 });
  const [cancelConfirmId, setCancelConfirmId] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  // Return request state
  const [returnOrder, setReturnOrder] = useState(null);
  const [returnItems, setReturnItems] = useState({});
  const [returnReason, setReturnReason] = useState('');
  const [returnOther, setReturnOther] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);

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

  const openReturnModal = (order) => {
    setReturnOrder(order);
    setReturnItems(initReturnItems(order));
    setReturnReason('');
    setReturnOther('');
  };

  const closeReturnModal = () => {
    setReturnOrder(null);
    setReturnItems({});
    setReturnReason('');
    setReturnOther('');
  };

  const toggleItem = (itemId) => {
    setReturnItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], selected: !prev[itemId].selected },
    }));
  };

  const setItemQty = (itemId, qty) => {
    setReturnItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], quantity: qty },
    }));
  };

  const handleReturnSubmit = async () => {
    const selectedItems = (returnOrder.items || [])
      .filter((item) => returnItems[item.id]?.selected)
      .map((item) => ({
        itemId: item.id,
        name: item.product?.name || 'Product',
        quantity: returnItems[item.id]?.quantity || item.quantity,
        price: item.price,
      }));

    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to return');
      return;
    }
    if (!returnReason) {
      toast.error('Please select a reason');
      return;
    }

    const finalReason = returnReason === 'Other' ? (returnOther.trim() || 'Other') : returnReason;

    setSubmittingReturn(true);
    try {
      const res = await requestReturn(returnOrder.id, finalReason, selectedItems);
      toast.success(res.message || 'Return request submitted');
      closeReturnModal();
    } catch (err) {
      toast.error(getAuthError(err, 'Failed to submit return request'));
    } finally {
      setSubmittingReturn(false);
    }
  };

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
                        <span className="order-item-name">{item.product?.name || 'Product'}</span>
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
                    {order.discountAmount > 0 && (
                      <span className="order-discount">
                        Discount{order.couponCode ? ` (${order.couponCode})` : ''}: −{formatPrice(order.discountAmount)}
                      </span>
                    )}
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
                      {order.status === 'DELIVERED' && order.paymentStatus !== 'REFUNDED' && (
                        <button className="order-return-btn" onClick={() => openReturnModal(order)}>
                          Request Return
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
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <span>Page {page} of {pagination.totalPages}</span>
            <button disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
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

      {returnOrder && (
        <div className="confirm-dialog-overlay" onClick={closeReturnModal}>
          <div className="return-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Request Return</h3>
            <p>Select the items you want to return and tell us why.</p>

            {/* Item selection */}
            <div className="return-items-list">
              {(returnOrder.items || []).map((item) => {
                const state = returnItems[item.id] || { selected: false, quantity: item.quantity };
                return (
                  <div key={item.id} className={`return-item-row ${state.selected ? 'selected' : ''}`}>
                    <label className="return-item-check">
                      <input
                        type="checkbox"
                        checked={state.selected}
                        onChange={() => toggleItem(item.id)}
                      />
                      <span className="return-item-name">
                        {item.product?.name || 'Product'}
                        {item.variant?.name ? <em> — {item.variant.name}</em> : null}
                      </span>
                    </label>
                    {state.selected && item.quantity > 1 && (
                      <div className="return-item-qty">
                        <span>Qty:</span>
                        <select
                          value={state.quantity}
                          onChange={(e) => setItemQty(item.id, parseInt(e.target.value))}
                        >
                          {Array.from({ length: item.quantity }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Reason */}
            <div className="return-reason-section">
              <p className="return-reason-label">Reason for return</p>
              <div className="return-reason-options">
                {RETURN_REASONS.map((r) => (
                  <label key={r} className="return-reason-option">
                    <input
                      type="radio"
                      name="returnReason"
                      value={r}
                      checked={returnReason === r}
                      onChange={() => setReturnReason(r)}
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
              {returnReason === 'Other' && (
                <input
                  type="text"
                  className="return-other-input"
                  placeholder="Please describe your reason…"
                  value={returnOther}
                  onChange={(e) => setReturnOther(e.target.value)}
                  autoFocus
                />
              )}
            </div>

            <div className="confirm-dialog-actions">
              <button className="account-cancel-btn" onClick={closeReturnModal}>
                Cancel
              </button>
              <button
                className="danger-btn"
                disabled={submittingReturn}
                onClick={handleReturnSubmit}
              >
                {submittingReturn ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

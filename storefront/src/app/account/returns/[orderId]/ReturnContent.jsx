'use client';

import '@/styles/return-page.css';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks';
import MainLayout from '@/components/layout/MainLayout';
import { getOrderById, requestReturn } from '@/lib/api/orders';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';

const RETURN_REASONS = [
  'Item arrived damaged or defective',
  'Wrong item was sent',
  'Item not as described or pictured',
  'Changed my mind / No longer needed',
  'Missing parts or accessories',
  'Item arrived too late',
  'Other — please describe',
];

function formatDate(str) {
  return new Date(str).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function ReturnContent({ orderId }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [order, setOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [itemStates, setItemStates] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/auth/login?redirect=/account/returns/${orderId}`);
    }
  }, [isLoading, isAuthenticated, router, orderId]);

  // Fetch order
  useEffect(() => {
    if (!isAuthenticated) return;
    getOrderById(orderId)
      .then((data) => {
        setOrder(data);
        const init = {};
        (data.items || []).forEach((item) => {
          init[item.id] = { selected: false, returnQty: 1, reason: '', otherText: '' };
        });
        setItemStates(init);
      })
      .catch(() => {
        toast.error('Order not found');
        router.push('/account#orders');
      })
      .finally(() => setLoadingOrder(false));
  }, [isAuthenticated, orderId, router]);

  const toggleItem = (itemId) => {
    setItemStates((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], selected: !prev[itemId].selected },
    }));
  };

  const updateItem = (itemId, field, value) => {
    setItemStates((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }));
  };

  const handleSubmit = async () => {
    const selectedItems = (order.items || [])
      .filter((item) => itemStates[item.id]?.selected)
      .map((item) => {
        const s = itemStates[item.id];
        const resolvedReason =
          s.reason === 'Other — please describe'
            ? s.otherText.trim() || 'Other'
            : s.reason;
        return {
          itemId: item.id,
          name: item.product?.name || 'Product',
          quantity: s.returnQty,
          price: item.price,
          reason: resolvedReason,
        };
      });

    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to return');
      return;
    }

    const missingReason = selectedItems.find((i) => !i.reason);
    if (missingReason) {
      toast.error(`Please select a reason for: ${missingReason.name}`);
      return;
    }

    // Build a combined reason string for the email subject/summary
    const combinedReason = selectedItems
      .map((i) => `${i.name} ×${i.quantity}: ${i.reason}`)
      .join('\n');

    setSubmitting(true);
    try {
      const res = await requestReturn(order.id, combinedReason, selectedItems);
      toast.success(res.message || 'Return request submitted');
      router.push('/account#orders');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to submit return request');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading states ──
  if (isLoading || loadingOrder) {
    return (
      <MainLayout>
        <div className="return-page-loading">Loading order…</div>
      </MainLayout>
    );
  }

  if (!order) return null;

  if (order.status !== 'DELIVERED') {
    return (
      <MainLayout>
        <div className="return-page-error">
          <p>This order is not eligible for a return.</p>
          <Link href="/account#orders">← Back to Orders</Link>
        </div>
      </MainLayout>
    );
  }

  const selectedCount = Object.values(itemStates).filter((s) => s.selected).length;

  return (
    <MainLayout>
      <div className="return-page-container">

        {/* Breadcrumb */}
        <nav className="return-breadcrumb">
          <Link href="/account#orders">← Back to Orders</Link>
        </nav>

        {/* Header */}
        <div className="return-page-header">
          <h1>Return Items</h1>
          <div className="return-order-meta">
            <span>Order <strong>{order.orderNumber}</strong></span>
            <span>·</span>
            <span>{formatDate(order.createdAt)}</span>
          </div>
          <p className="return-instructions">
            Select the items you'd like to return and provide a reason for each one.
          </p>
        </div>

        {/* Items */}
        <div className="return-items-section">
          {(order.items || []).map((item) => {
            const s = itemStates[item.id] || {};
            const name = item.product?.name || 'Product';
            const img = item.product?.mainImage || null;
            const variant = item.variant?.name || null;

            return (
              <div
                key={item.id}
                className={`return-item-card${s.selected ? ' selected' : ''}`}
                onClick={() => toggleItem(item.id)}
              >
                {/* Top row: checkbox + image + info */}
                <div className="return-item-top">
                  <div
                    className="return-item-checkbox"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      id={`ret-${item.id}`}
                      checked={s.selected || false}
                      onChange={() => toggleItem(item.id)}
                    />
                  </div>

                  <div className="return-item-image">
                    {img ? (
                      <Image
                        src={img}
                        alt={name}
                        width={80}
                        height={80}
                        style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                      />
                    ) : (
                      <div className="return-item-image-placeholder">
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="return-item-info">
                    <div className="return-item-name">{name}</div>
                    {variant && <div className="return-item-variant">{variant}</div>}
                    <div className="return-item-meta">
                      <span className="return-item-price">
                        ${Number(item.price).toFixed(2)}
                      </span>
                      <span>Qty ordered: {item.quantity}</span>
                    </div>
                  </div>
                </div>

                {/* Controls — only when selected */}
                {s.selected && (
                  <div
                    className="return-item-controls"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="return-controls-divider" />

                    {/* Quantity — only if ordered more than 1 */}
                    {item.quantity > 1 && (
                      <div className="return-control-row">
                        <span className="return-control-label">Return quantity</span>
                        <select
                          className="return-control-select"
                          value={s.returnQty || 1}
                          onChange={(e) =>
                            updateItem(item.id, 'returnQty', parseInt(e.target.value))
                          }
                        >
                          {Array.from({ length: item.quantity }, (_, i) => i + 1).map(
                            (n) => (
                              <option key={n} value={n}>
                                {n} of {item.quantity}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    )}

                    {/* Reason */}
                    <div className="return-control-row">
                      <span className="return-control-label">Reason for return</span>
                      <select
                        className="return-control-select"
                        value={s.reason || ''}
                        onChange={(e) => updateItem(item.id, 'reason', e.target.value)}
                      >
                        <option value="" disabled>
                          Select a reason…
                        </option>
                        {RETURN_REASONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Other — free text */}
                    {s.reason === 'Other — please describe' && (
                      <div className="return-control-row">
                        <span className="return-control-label">Tell us more</span>
                        <textarea
                          className="return-other-textarea"
                          placeholder="Please describe your reason…"
                          value={s.otherText || ''}
                          onChange={(e) =>
                            updateItem(item.id, 'otherText', e.target.value)
                          }
                          autoFocus
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky submit bar */}
      <div className="return-submit-bar">
        <div className="return-submit-info">
          {selectedCount > 0 ? (
            <>
              <strong>{selectedCount}</strong> item
              {selectedCount > 1 ? 's' : ''} selected for return
            </>
          ) : (
            'No items selected'
          )}
        </div>
        <button
          className="return-submit-btn"
          disabled={submitting || selectedCount === 0}
          onClick={handleSubmit}
        >
          {submitting ? 'Submitting…' : 'Submit Return Request'}
        </button>
      </div>
    </MainLayout>
  );
}

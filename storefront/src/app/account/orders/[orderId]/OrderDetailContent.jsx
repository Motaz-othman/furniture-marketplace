'use client';

import '@/styles/order-detail.css';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks';
import MainLayout from '@/components/layout/MainLayout';
import { getOrderById, getOrderReturnRequests } from '@/lib/api/orders';
import { getItemStatus, ITEM_STATUS_LABEL, ITEM_STATUS_STYLE } from '@/lib/itemStatus';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';

function fmt(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function StatusBadge({ status, className = '' }) {
  const MAP = {
    PENDING:    'badge-pending',
    CONFIRMED:  'badge-confirmed',
    PROCESSING: 'badge-processing',
    SHIPPED:    'badge-shipped',
    DELIVERED:  'badge-delivered',
    CANCELLED:  'badge-cancelled',
    REFUNDED:   'badge-refunded',
    // Shipment
    IN_TRANSIT: 'badge-shipped',
    ARRANGED:   'badge-processing',
    QUOTED:     'badge-confirmed',
    FAILED:     'badge-cancelled',
    // Return
    APPROVED:   'badge-delivered',
    REJECTED:   'badge-cancelled',
  };
  return (
    <span className={`od-badge ${MAP[status] || 'badge-pending'} ${className}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function ReturnStatusBadge({ status }) {
  const MAP = {
    PENDING:  'rr-badge-pending',
    APPROVED: 'rr-badge-approved',
    REJECTED: 'rr-badge-rejected',
    REFUNDED: 'rr-badge-refunded',
  };
  return <span className={`rr-badge ${MAP[status] || 'rr-badge-pending'}`}>{status}</span>;
}

export default function OrderDetailContent({ orderId }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [order, setOrder] = useState(null);
  const [returnRequests, setReturnRequests] = useState([]);
  const [loadingOrder, setLoadingOrder] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/auth/login?redirect=/account/orders/${orderId}`);
    }
  }, [isLoading, isAuthenticated, router, orderId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.all([
      getOrderById(orderId),
      getOrderReturnRequests(orderId).catch(() => ({ returnRequests: [] })),
    ])
      .then(([orderData, rrData]) => {
        setOrder(orderData);
        setReturnRequests(rrData.returnRequests || []);
      })
      .catch(() => {
        toast.error('Order not found');
        router.push('/account#orders');
      })
      .finally(() => setLoadingOrder(false));
  }, [isAuthenticated, orderId, router]);

  if (isLoading || loadingOrder) {
    return (
      <MainLayout>
        <div className="od-loading">Loading order…</div>
      </MainLayout>
    );
  }

  if (!order) return null;

  const address = order.address;

  // Item can be returned if its shipment is DELIVERED and no active return exists
  const itemCanReturn = (item) => {
    if (order.paymentStatus === 'REFUNDED') return false;
    if (!item.shipment || item.shipment.status !== 'DELIVERED') return false;
    const rri = item.returnRequestItems?.[0];
    if (!rri) return true;
    const s = rri.returnRequest?.status;
    return s !== 'PENDING' && s !== 'APPROVED';
  };

  return (
    <MainLayout>
      <div className="od-container">

        {/* Breadcrumb */}
        <nav className="od-breadcrumb">
          <Link href="/account#orders">← Back to Orders</Link>
        </nav>

        {/* Header */}
        <div className="od-header">
          <div className="od-header-left">
            <h1>{order.orderNumber}</h1>
            <p className="od-header-date">Placed {fmtDate(order.createdAt)}</p>
          </div>
          <StatusBadge status={order.status} className="od-header-status" />
        </div>

        <div className="od-layout">
          {/* ── Main column ── */}
          <div className="od-main">

            {/* Items */}
            <section className="od-card">
              <h2 className="od-card-title">Items ({order.items?.length ?? 0})</h2>
              <div className="od-items-list">
                {(order.items || []).map((item) => {
                  const name = item.product?.name || 'Product';
                  const img = item.product?.mainImage || null;
                  const variant = item.variant?.name || null;
                  const itemStatus = getItemStatus(item);
                  const { bg, color } = ITEM_STATUS_STYLE[itemStatus] || ITEM_STATUS_STYLE.PENDING;

                  return (
                    <div key={item.id} className="od-item">
                      {/* Image */}
                      <div className="od-item-image">
                        {img ? (
                          <Image src={img} alt={name} width={80} height={80}
                            style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                        ) : (
                          <div className="od-item-image-placeholder">{name.charAt(0)}</div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="od-item-info">
                        <div className="od-item-name">{name}</div>
                        {variant && <div className="od-item-variant">{variant}</div>}
                        <div className="od-item-meta">
                          <span>{fmt(item.price)} each · Qty {item.quantity}</span>
                        </div>

                        {/* Unified item status */}
                        <div className="od-item-shipment">
                          <span style={{ background: bg, color, borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                            {ITEM_STATUS_LABEL[itemStatus] || itemStatus}
                          </span>
                          {item.shipment?.trackingNumber && (
                            <span className="od-item-tracking">
                              {item.shipment.trackingUrl ? (
                                <a href={item.shipment.trackingUrl} target="_blank" rel="noopener noreferrer">
                                  Track: {item.shipment.trackingNumber}
                                </a>
                              ) : (
                                `Tracking: ${item.shipment.trackingNumber}`
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Price + return button */}
                      <div className="od-item-right">
                        <div className="od-item-total">{fmt(item.price * item.quantity)}</div>
                        {itemCanReturn(item) && (
                          <Link
                            href={`/account/returns/${orderId}?item=${item.id}`}
                            className="od-return-btn"
                          >
                            Return
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Return Requests */}
            {returnRequests.length > 0 && (
              <section className="od-card">
                <h2 className="od-card-title">Return Requests</h2>
                <div className="od-rr-list">
                  {returnRequests.map((rr) => (
                    <div key={rr.id} className="od-rr-item">
                      <div className="od-rr-header">
                        <span className="od-rr-date">Submitted {fmtDate(rr.createdAt)}</span>
                        <ReturnStatusBadge status={rr.status} />
                      </div>
                      {(rr.items || []).map((ri) => (
                        <div key={ri.id} className="od-rr-line">
                          <span className="od-rr-item-name">
                            {ri.orderItem?.product?.name || 'Product'}
                            {ri.orderItem?.variant?.name ? ` — ${ri.orderItem.variant.name}` : ''}
                            {' '}×{ri.quantity}
                          </span>
                          <span className="od-rr-reason">{ri.reason}</span>
                        </div>
                      ))}
                      {rr.adminNotes && (
                        <p className="od-rr-notes">Note: {rr.adminNotes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Order Summary */}
            <section className="od-card">
              <h2 className="od-card-title">Order Summary</h2>
              <div className="od-summary">
                <div className="od-summary-row"><span>Subtotal</span><span>{fmt(order.subtotal)}</span></div>
                <div className="od-summary-row"><span>Shipping</span><span>{order.shippingCost > 0 ? fmt(order.shippingCost) : 'Free'}</span></div>
                <div className="od-summary-row"><span>Tax</span><span>{fmt(order.tax)}</span></div>
                {order.discountAmount > 0 && (
                  <div className="od-summary-row od-summary-discount">
                    <span>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</span>
                    <span>−{fmt(order.discountAmount)}</span>
                  </div>
                )}
                <div className="od-summary-divider" />
                <div className="od-summary-row od-summary-total">
                  <span>Total</span><span>{fmt(order.total)}</span>
                </div>
              </div>
            </section>
          </div>

          {/* ── Sidebar ── */}
          <div className="od-sidebar">

            {/* Shipping address */}
            {address && (
              <section className="od-card">
                <h2 className="od-card-title">Shipping Address</h2>
                <div className="od-address">
                  {address.label && <p className="od-address-label">{address.label}</p>}
                  <p>{address.street}{address.apartment ? `, ${address.apartment}` : ''}</p>
                  <p>{address.city}, {address.state} {address.zipCode}</p>
                  {address.country && <p>{address.country}</p>}
                </div>
              </section>
            )}

            {/* Payment */}
            <section className="od-card">
              <h2 className="od-card-title">Payment</h2>
              <div className="od-payment">
                <div className="od-payment-row">
                  <span>Status</span>
                  <StatusBadge status={order.paymentStatus || 'PENDING'} />
                </div>
              </div>
            </section>

            {/* Notes */}
            {order.notes && (
              <section className="od-card">
                <h2 className="od-card-title">Notes</h2>
                <p className="od-notes">{order.notes}</p>
              </section>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

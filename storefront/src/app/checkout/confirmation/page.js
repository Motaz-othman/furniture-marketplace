'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const ordersParam = searchParams.get('orders') || '';
  const email = searchParams.get('email') || '';
  const orderNumbers = ordersParam.split(',').filter(Boolean);

  return (
    <MainLayout>
      <div className="checkout-page">
        <div className="confirmation">
          <div className="confirmation-icon">&#10003;</div>
          <h1>Thank You for Your Order!</h1>
          <p className="confirmation-subtitle">
            Your order has been placed successfully.
          </p>

          {orderNumbers.length > 0 && (
            <div className="confirmation-orders">
              <h2>{orderNumbers.length === 1 ? 'Order Number' : 'Order Numbers'}</h2>
              {orderNumbers.map((num) => (
                <div key={num} className="confirmation-order-number">{num}</div>
              ))}
            </div>
          )}

          {email && (
            <p className="confirmation-email">
              A confirmation email will be sent to <strong>{email}</strong>
            </p>
          )}

          <div className="confirmation-actions">
            <Link href="/products" className="confirmation-btn primary">
              Continue Shopping
            </Link>
            <Link href="/" className="confirmation-btn secondary">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<MainLayout><div className="checkout-page"><div className="checkout-loading">Loading...</div></div></MainLayout>}>
      <ConfirmationContent />
    </Suspense>
  );
}

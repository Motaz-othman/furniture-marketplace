'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <MainLayout>
      <div className="coming-soon-container">
        <div className="coming-soon-content">
          <Link href="/" className="coming-soon-logo">
            LiviPoint
          </Link>
          <span className="coming-soon-badge">Error</span>
          <span className="coming-soon-icon">⚠️</span>
          <h1 className="coming-soon-title">Something went wrong</h1>
          <p className="coming-soon-text">
            We encountered an unexpected error. Please try again or return to the homepage.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={reset} className="coming-soon-btn">
              Try Again
            </button>
            <Link href="/" className="coming-soon-btn" style={{ background: 'transparent', border: '1px solid currentColor' }}>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

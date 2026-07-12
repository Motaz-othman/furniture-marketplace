'use client';

import { useEffect, useState, useContext, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import { verifyEmail } from '@/lib/api/auth';
import { AuthContext } from '@/context/AuthContext';
import { getMe } from '@/lib/api/auth';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, login } = useContext(AuthContext);
  const [status, setStatus] = useState('verifying'); // verifying | success | error

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      return;
    }

    verifyEmail(token)
      .then(async () => {
        setStatus('success');
        // Refresh the user object in context so the banner disappears
        if (user) {
          try {
            const data = await getMe();
            // Update localStorage so the banner stays gone on refresh
            localStorage.setItem('user', JSON.stringify(data.user));
            // Force context re-read by dispatching a custom event
            window.dispatchEvent(new Event('auth:refresh'));
          } catch {
            // non-critical
          }
        }
      })
      .catch(() => setStatus('error'));
  }, []);

  return (
    <MainLayout>
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 20px' }}>
        <div style={{ textAlign: 'center', maxWidth: '420px' }}>
          {status === 'verifying' && (
            <>
              <p style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</p>
              <h1 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '8px' }}>Verifying your email…</h1>
            </>
          )}
          {status === 'success' && (
            <>
              <p style={{ fontSize: '48px', marginBottom: '16px' }}>✓</p>
              <h1 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '8px' }}>Email verified!</h1>
              <p style={{ color: '#555', marginBottom: '28px' }}>Your email address has been confirmed. You're all set.</p>
              <Link href="/" style={{ display: 'inline-block', background: '#1a1a1a', color: '#fff', padding: '12px 28px', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 }}>
                Continue Shopping
              </Link>
            </>
          )}
          {status === 'error' && (
            <>
              <p style={{ fontSize: '48px', marginBottom: '16px' }}>✕</p>
              <h1 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '8px' }}>Link expired or invalid</h1>
              <p style={{ color: '#555', marginBottom: '28px' }}>This verification link has expired or already been used. Log in and request a new one.</p>
              <Link href="/account" style={{ display: 'inline-block', background: '#1a1a1a', color: '#fff', padding: '12px 28px', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 }}>
                Go to Account
              </Link>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<MainLayout><div style={{ minHeight: '60vh' }} /></MainLayout>}>
      <VerifyEmailContent />
    </Suspense>
  );
}

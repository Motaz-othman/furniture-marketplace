'use client';

import { useState } from 'react';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import { forgotPassword } from '@/lib/api/auth';

export default function ForgotPasswordContent() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email');
      return;
    }

    setIsSubmitting(true);
    try {
      await forgotPassword({ email });
      setIsSubmitted(true);
    } catch (err) {
      // Show success even on error to not reveal if email exists
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="auth-container">
        <div className="auth-card">
          {isSubmitted ? (
            <div className="auth-success">
              <div className="auth-success-icon">✓</div>
              <h1 className="auth-title">Check Your Email</h1>
              <p className="auth-success-text">
                If an account exists with that email, we&apos;ve sent a password reset link. Please check your inbox.
              </p>
              <Link href="/auth/login" className="auth-submit-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <h1 className="auth-title">Forgot Password</h1>
              <p className="auth-subtitle">Enter your email and we&apos;ll send you a reset link</p>

              {error && <div className="auth-error">{error}</div>}

              <form onSubmit={handleSubmit} className="auth-form">
                <div className="auth-field">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </div>
                <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              <p className="auth-switch">
                Remember your password? <Link href="/auth/login">Sign In</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import { resetPassword, getAuthError } from '@/lib/api/auth';
import toast from 'react-hot-toast';

export default function ResetPasswordContent() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const passwordChecks = {
    length: newPassword.length >= 8,
    lowercase: /[a-z]/.test(newPassword),
    uppercase: /[A-Z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
  };

  const isPasswordValid = Object.values(passwordChecks).every(Boolean);

  if (!token) {
    return (
      <MainLayout>
        <div className="auth-container">
          <div className="auth-card">
            <h1 className="auth-title">Invalid Link</h1>
            <p className="auth-subtitle">This password reset link is invalid or has expired.</p>
            <Link href="/auth/forgot-password" className="auth-submit-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: '24px' }}>
              Request a New Link
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid) {
      setError('Password does not meet requirements');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword({ token, newPassword });
      toast.success('Password reset successfully!');
      router.push('/auth/login');
    } catch (err) {
      setError(getAuthError(err, 'Reset failed. The link may have expired.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">Reset Password</h1>
          <p className="auth-subtitle">Enter your new password</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="newPassword">New Password</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                autoComplete="new-password"
                required
              />
            </div>

            {newPassword.length > 0 && (
              <div className="auth-password-requirements">
                <p className="auth-requirements-title">Password must contain:</p>
                <ul>
                  <li className={passwordChecks.length ? 'met' : ''}>At least 8 characters</li>
                  <li className={passwordChecks.lowercase ? 'met' : ''}>One lowercase letter</li>
                  <li className={passwordChecks.uppercase ? 'met' : ''}>One uppercase letter</li>
                  <li className={passwordChecks.number ? 'met' : ''}>One number</li>
                </ul>
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
                required
              />
            </div>

            <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}

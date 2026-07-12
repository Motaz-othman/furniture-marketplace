'use client';

import { useState, useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { resendVerification } from '@/lib/api/auth';

export default function EmailVerificationBanner() {
  const { user } = useContext(AuthContext);
  const [dismissed, setDismissed] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  if (!user || user.emailVerified || dismissed) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      await resendVerification();
      setSent(true);
    } catch {
      // silently fail — user can try again
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{
      background: '#fefce8',
      borderBottom: '1px solid #fde047',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      flexWrap: 'wrap',
      fontSize: '14px',
      color: '#713f12',
    }}>
      <span>
        {sent
          ? 'Verification email sent — check your inbox.'
          : 'Please verify your email address to ensure you receive order updates.'}
      </span>
      {!sent && (
        <button
          onClick={handleResend}
          disabled={sending}
          style={{
            background: 'none',
            border: '1px solid #713f12',
            color: '#713f12',
            padding: '3px 12px',
            borderRadius: '4px',
            fontSize: '13px',
            cursor: sending ? 'not-allowed' : 'pointer',
            opacity: sending ? 0.6 : 1,
            fontFamily: 'inherit',
          }}
        >
          {sending ? 'Sending...' : 'Resend email'}
        </button>
      )}
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{
          background: 'none',
          border: 'none',
          color: '#713f12',
          cursor: 'pointer',
          fontSize: '18px',
          lineHeight: 1,
          padding: '0 4px',
        }}
      >
        ×
      </button>
    </div>
  );
}

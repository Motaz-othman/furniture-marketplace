'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks';
import { changePassword, deleteAccount, getAuthError } from '@/lib/api/auth';
import toast from 'react-hot-toast';

export default function SettingsTab() {
  const { logout } = useAuth();
  const router = useRouter();

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const passwordChecks = {
    length: newPassword.length >= 8,
    lowercase: /[a-z]/.test(newPassword),
    uppercase: /[A-Z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
  };

  const isPasswordValid = Object.values(passwordChecks).every(Boolean);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (!isPasswordValid) {
      setPasswordError('Password does not meet requirements');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setPasswordSubmitting(true);
    try {
      await changePassword({ currentPassword, newPassword });
      toast.success('Password changed');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(getAuthError(err, 'Failed to change password'));
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      await deleteAccount();
      logout();
      toast.success('Account deleted');
      router.push('/');
    } catch (err) {
      toast.error(getAuthError(err, 'Failed to delete account'));
    } finally {
      setDeleting(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Signed out');
    router.push('/');
  };

  return (
    <>
      {/* Change Password */}
      <div className="account-section">
        <h2>Change Password</h2>
        {passwordError && <div className="auth-error">{passwordError}</div>}
        <form onSubmit={handlePasswordChange} className="account-form">
          <div className="auth-field">
            <label htmlFor="currentPassword">Current Password</label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              autoComplete="current-password"
              required
            />
          </div>
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
            <label htmlFor="confirmNewPassword">Confirm New Password</label>
            <input
              id="confirmNewPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              autoComplete="new-password"
              required
            />
          </div>
          <div className="account-actions">
            <button type="submit" className="account-save-btn" disabled={passwordSubmitting}>
              {passwordSubmitting ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="account-section danger-zone">
        <h2>Danger Zone</h2>
        <p className="danger-zone-text">
          Once you delete your account, all your data will be permanently removed. This action cannot be undone.
        </p>
        {!showDeleteConfirm ? (
          <button className="danger-btn" onClick={() => setShowDeleteConfirm(true)}>
            Delete Account
          </button>
        ) : (
          <div className="delete-confirm">
            <p>Type <strong>DELETE</strong> to confirm:</p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
            />
            <div className="account-actions">
              <button
                className="danger-btn"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || deleting}
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
              <button
                className="account-cancel-btn"
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Logout */}
      <div className="account-section">
        <button className="auth-logout-btn" onClick={handleLogout}>
          Log Out
        </button>
      </div>
    </>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks';
import { getAuthError } from '@/lib/api/auth';
import toast from 'react-hot-toast';

export default function ProfileTab() {
  const { user, updateProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateProfile({ firstName, lastName, email, phone: phone || null });
      toast.success('Profile updated');
      setIsEditing(false);
    } catch (err) {
      toast.error(getAuthError(err, 'Failed to update profile'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName || '');
    setEmail(user?.email || '');
    setPhone(user?.phone || '');
  };

  return (
    <div className="account-section">
      <h2>Personal Information</h2>
      {isEditing ? (
        <form onSubmit={handleSave} className="account-form">
          <div className="auth-name-row">
            <div className="auth-field">
              <label htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="auth-field">
              <label htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="auth-field">
            <label htmlFor="phone">Mobile Number</label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +1 555 123 4567"
            />
          </div>
          <div className="account-actions">
            <button type="submit" className="account-save-btn" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" className="account-cancel-btn" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="profile-info">
          <div className="profile-row">
            <span className="profile-label">Name</span>
            <span className="profile-value">{user?.firstName} {user?.lastName}</span>
          </div>
          <div className="profile-row">
            <span className="profile-label">Email</span>
            <span className="profile-value">{user?.email}</span>
          </div>
          <div className="profile-row">
            <span className="profile-label">Mobile</span>
            <span className="profile-value">{user?.phone || '—'}</span>
          </div>
          <button className="profile-edit-btn" onClick={() => setIsEditing(true)}>
            Edit Profile
          </button>
        </div>
      )}
    </div>
  );
}

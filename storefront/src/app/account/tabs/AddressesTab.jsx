'use client';

import { useState, useEffect } from 'react';
import { getAddresses, createAddress, updateAddress, deleteAddress } from '@/lib/api/addresses';
import { MapPin } from '@/components/ui/Icons';
import { getAuthError } from '@/lib/api/auth';
import ConfirmDialog from './ConfirmDialog';
import toast from 'react-hot-toast';

const ADDRESS_LABELS = ['Home', 'Work', 'Office', 'Other'];
const emptyForm = { label: '', customLabel: '', street: '', city: '', state: '', zipCode: '', country: 'US', isDefault: false };

export default function AddressesTab() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAddresses = async () => {
    try {
      const data = await getAddresses();
      setAddresses(Array.isArray(data) ? data : data.addresses || []);
    } catch {
      toast.error('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const openAddForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (addr) => {
    setEditingId(addr.id);
    const savedLabel = addr.label || '';
    const isPreset = ADDRESS_LABELS.includes(savedLabel) && savedLabel !== 'Other';
    setForm({
      label: isPreset ? savedLabel : savedLabel ? 'Other' : '',
      customLabel: isPreset ? '' : savedLabel,
      street: addr.street,
      city: addr.city,
      state: addr.state,
      zipCode: addr.zipCode,
      country: addr.country || 'US',
      isDefault: addr.isDefault,
    });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const finalLabel = form.label === 'Other' ? (form.customLabel || '') : form.label;
    const { customLabel, ...rest } = form;
    const payload = { ...rest, label: finalLabel || null };
    try {
      if (editingId) {
        await updateAddress(editingId, payload);
        toast.success('Address updated');
      } else {
        await createAddress(payload);
        toast.success('Address added');
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await fetchAddresses();
    } catch (err) {
      toast.error(getAuthError(err, 'Failed to save address'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteAddress(deleteConfirmId);
      setAddresses((prev) => prev.filter((a) => a.id !== deleteConfirmId));
      toast.success('Address deleted');
    } catch (err) {
      toast.error(getAuthError(err, 'Failed to delete address'));
    } finally {
      setDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return <div className="account-loading">Loading addresses...</div>;
  }

  return (
    <>
      <div className="account-section">
        <div className="addresses-header">
          <h2>Shipping Addresses</h2>
          {!showForm && (
            <button className="add-address-btn" onClick={openAddForm}>
              + Add Address
            </button>
          )}
        </div>

        {showForm && (
          <div className="address-form">
            <p className="address-form-title">{editingId ? 'Edit Address' : 'New Address'}</p>
            <form onSubmit={handleSave} className="account-form">
              <div className="auth-field">
                <label>Address Name</label>
                <div className="address-label-chips">
                  {ADDRESS_LABELS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      className={`address-label-chip ${form.label === l ? 'selected' : ''}`}
                      onClick={() => updateField('label', form.label === l ? '' : l)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                {form.label === 'Other' && (
                  <input
                    type="text"
                    value={form.customLabel || ''}
                    onChange={(e) => updateField('customLabel', e.target.value)}
                    placeholder="Enter custom name"
                    style={{ marginTop: '0.5rem' }}
                  />
                )}
              </div>
              <div className="auth-field">
                <label htmlFor="street">Street Address</label>
                <input
                  id="street"
                  type="text"
                  value={form.street}
                  onChange={(e) => updateField('street', e.target.value)}
                  placeholder="123 Main St"
                  required
                />
              </div>
              <div className="auth-name-row">
                <div className="auth-field">
                  <label htmlFor="city">City</label>
                  <input
                    id="city"
                    type="text"
                    value={form.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder="New York"
                    required
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="state">State</label>
                  <input
                    id="state"
                    type="text"
                    value={form.state}
                    onChange={(e) => updateField('state', e.target.value)}
                    placeholder="NY"
                    required
                  />
                </div>
              </div>
              <div className="auth-field">
                <label htmlFor="zipCode">Zip Code</label>
                <input
                  id="zipCode"
                  type="text"
                  value={form.zipCode}
                  onChange={(e) => updateField('zipCode', e.target.value)}
                  placeholder="10001"
                  required
                />
              </div>
              <label className="address-default-checkbox">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => updateField('isDefault', e.target.checked)}
                />
                Set as default address
              </label>
              <div className="account-actions">
                <button type="submit" className="account-save-btn" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Address'}
                </button>
                <button
                  type="button"
                  className="account-cancel-btn"
                  onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {!showForm && addresses.length === 0 && (
          <div className="account-empty-state">
            <MapPin size={48} />
            <p>No addresses saved yet</p>
            <button className="profile-edit-btn" onClick={openAddForm}>
              Add Your First Address
            </button>
          </div>
        )}

        {!showForm && addresses.length > 0 && (
          <div className="address-list">
            {addresses.map((addr) => (
              <div key={addr.id} className={`address-card${addr.isDefault ? ' default' : ''}`}>
                <div className="address-card-header">
                  <div className="address-card-labels">
                    {addr.label && <span className="address-label">{addr.label}</span>}
                    {addr.isDefault && <span className="address-default-badge">Default</span>}
                  </div>
                  <div className="address-card-actions">
                    <button onClick={() => openEditForm(addr)}>Edit</button>
                    <button className="delete-btn" onClick={() => setDeleteConfirmId(addr.id)}>Delete</button>
                  </div>
                </div>
                <div className="address-text">
                  <span>{addr.street}</span>
                  <span>{addr.city}, {addr.state} {addr.zipCode}</span>
                  {addr.country && addr.country !== 'US' && <span>{addr.country}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteConfirmId && (
        <ConfirmDialog
          title="Delete Address"
          message="Are you sure you want to delete this address? This cannot be undone."
          confirmLabel="Delete"
          variant="danger"
          isLoading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </>
  );
}

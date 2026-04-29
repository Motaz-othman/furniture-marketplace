'use client';

export default function ConfirmDialog({ title, message, confirmLabel = 'Confirm', onConfirm, onCancel, isLoading, variant = 'default' }) {
  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="confirm-dialog-actions">
          <button className="account-cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={variant === 'danger' ? 'danger-btn' : 'account-save-btn'}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

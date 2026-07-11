export function getItemStatus(item) {
  return item.status || 'PENDING';
}

export const ITEM_STATUS_LABEL = {
  PENDING:          'Pending',
  IN_TRANSIT:       'In Transit',
  DELIVERED:        'Delivered',
  RETURN_REQUESTED: 'Return Requested',
  RETURN_APPROVED:  'Return Approved',
  RETURN_REJECTED:  'Return Rejected',
  REFUNDED:         'Refunded',
};

export const ITEM_STATUS_STYLE = {
  PENDING:          { bg: '#fef3c7', color: '#92400e' },
  IN_TRANSIT:       { bg: '#cffafe', color: '#0e7490' },
  DELIVERED:        { bg: '#dcfce7', color: '#166534' },
  RETURN_REQUESTED: { bg: '#fef9c3', color: '#854d0e' },
  RETURN_APPROVED:  { bg: '#d1fae5', color: '#065f46' },
  RETURN_REJECTED:  { bg: '#fee2e2', color: '#991b1b' },
  REFUNDED:         { bg: '#e0e7ff', color: '#3730a3' },
};

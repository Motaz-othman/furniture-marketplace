// Derives a single display status for an order item based on
// shipment status and return request status (return takes priority).
export function getItemStatus(item) {
  const rri = item.returnRequestItems?.[0];
  if (rri) {
    const s = rri.returnRequest?.status;
    if (s === 'REFUNDED')  return 'REFUNDED';
    if (s === 'REJECTED')  return 'RETURN_REJECTED';
    if (s === 'APPROVED')  return 'RETURN_APPROVED';
    if (s === 'PENDING')   return 'RETURN_REQUESTED';
  }
  const s = item.shipment?.status;
  if (!s) return 'PENDING';
  return s; // PENDING | QUOTED | ARRANGED | IN_TRANSIT | DELIVERED | FAILED
}

export const ITEM_STATUS_LABEL = {
  PENDING:          'Pending',
  QUOTED:           'Quoted',
  ARRANGED:         'Arranged',
  IN_TRANSIT:       'In Transit',
  DELIVERED:        'Delivered',
  FAILED:           'Shipment Failed',
  RETURN_REQUESTED: 'Return Requested',
  RETURN_APPROVED:  'Return Approved',
  RETURN_REJECTED:  'Return Rejected',
  REFUNDED:         'Refunded',
};

export const ITEM_STATUS_STYLE = {
  PENDING:          { bg: '#fef3c7', color: '#92400e' },
  QUOTED:           { bg: '#dbeafe', color: '#1e40af' },
  ARRANGED:         { bg: '#ede9fe', color: '#5b21b6' },
  IN_TRANSIT:       { bg: '#cffafe', color: '#0e7490' },
  DELIVERED:        { bg: '#dcfce7', color: '#166534' },
  FAILED:           { bg: '#fee2e2', color: '#991b1b' },
  RETURN_REQUESTED: { bg: '#fef9c3', color: '#854d0e' },
  RETURN_APPROVED:  { bg: '#d1fae5', color: '#065f46' },
  RETURN_REJECTED:  { bg: '#fee2e2', color: '#991b1b' },
  REFUNDED:         { bg: '#e0e7ff', color: '#3730a3' },
};

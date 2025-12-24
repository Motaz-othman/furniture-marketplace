import {
    Clock,
    CheckCircle,
    Package,
    Truck,
    CheckCircle2,
    XCircle,
    RefreshCw,
  } from 'lucide-react';
  
  // Order status configuration - MUST MATCH BACKEND PRISMA ENUM
  // Backend enum: PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED, REFUNDED
  export const ORDER_STATUS = {
    PENDING: {
      key: 'PENDING',
      label: 'Pending',
      icon: Clock,
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-800',
      borderColor: 'border-amber-200',
      dotColor: 'bg-amber-500',
    },
    CONFIRMED: {
      key: 'CONFIRMED',
      label: 'Confirmed',
      icon: CheckCircle,
      badgeBg: 'bg-blue-100',
      badgeText: 'text-blue-800',
      borderColor: 'border-blue-200',
      dotColor: 'bg-blue-500',
    },
    PROCESSING: {
      key: 'PROCESSING',
      label: 'Processing',
      icon: Package,
      badgeBg: 'bg-purple-100',
      badgeText: 'text-purple-800',
      borderColor: 'border-purple-200',
      dotColor: 'bg-purple-500',
    },
    SHIPPED: {
      key: 'SHIPPED',
      label: 'Shipped',
      icon: Truck,
      badgeBg: 'bg-indigo-100',
      badgeText: 'text-indigo-800',
      borderColor: 'border-indigo-200',
      dotColor: 'bg-indigo-500',
    },
    DELIVERED: {
      key: 'DELIVERED',
      label: 'Delivered',
      icon: CheckCircle2,
      badgeBg: 'bg-green-100',
      badgeText: 'text-green-800',
      borderColor: 'border-green-200',
      dotColor: 'bg-green-500',
    },
    CANCELLED: {
      key: 'CANCELLED',
      label: 'Cancelled',
      icon: XCircle,
      badgeBg: 'bg-red-100',
      badgeText: 'text-red-800',
      borderColor: 'border-red-200',
      dotColor: 'bg-red-500',
    },
    REFUNDED: {
      key: 'REFUNDED',
      label: 'Refunded',
      icon: RefreshCw,
      badgeBg: 'bg-gray-100',
      badgeText: 'text-gray-800',
      borderColor: 'border-gray-200',
      dotColor: 'bg-gray-500',
    },
  };
  
  // Status flow - what status can transition to what
  // Backend flow: PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED
  // Vendors can only cancel PENDING orders
  export const STATUS_FLOW = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PROCESSING'],      // No cancel after confirmed
    PROCESSING: ['SHIPPED'],        // No cancel after processing
    SHIPPED: ['DELIVERED'],
    DELIVERED: [], // Terminal state - refund handled separately
    CANCELLED: [], // Terminal state
    REFUNDED: [], // Terminal state
  };
  
  // Check if vendor can cancel the order (only PENDING)
  export const canVendorCancel = (currentStatus) => {
    return currentStatus === 'PENDING';
  };
  
  // Get next available statuses for a given status
  export const getNextStatuses = (currentStatus) => {
    return STATUS_FLOW[currentStatus] || [];
  };
  
  // Check if status can be updated
  export const canUpdateStatus = (currentStatus) => {
    const nextStatuses = getNextStatuses(currentStatus);
    return nextStatuses.length > 0;
  };
  
  // Status filter tabs for the orders page
  export const STATUS_TABS = [
    { key: 'all', label: 'All Orders' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'CONFIRMED', label: 'Confirmed' },
    { key: 'PROCESSING', label: 'Processing' },
    { key: 'SHIPPED', label: 'Shipped' },
    { key: 'DELIVERED', label: 'Delivered' },
    { key: 'CANCELLED', label: 'Cancelled' },
  ];
  
  export default ORDER_STATUS;
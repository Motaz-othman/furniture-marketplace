import prisma from '../config/db.js';

// Notification types
export const NOTIFICATION_TYPES = {
  ORDER_PLACED: 'ORDER_PLACED',
  ORDER_STATUS_CHANGED: 'ORDER_STATUS_CHANGED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
  PRODUCT_REVIEWED: 'PRODUCT_REVIEWED'
};

// Create notification
export const createNotification = async ({ userId, type, title, message, data = null }) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data
      }
    });
    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
  }
};

// Notification templates
export const notifyOrderPlaced = async (customerUserId, order) => {
  return createNotification({
    userId: customerUserId,
    type: NOTIFICATION_TYPES.ORDER_PLACED,
    title: 'Order Placed Successfully!',
    message: `Your order #${order.orderNumber} for $${order.total.toFixed(2)} has been placed.`,
    data: { orderId: order.id, orderNumber: order.orderNumber }
  });
};

export const notifyOrderStatusChanged = async (customerUserId, order, newStatus) => {
  const statusMessages = {
    CONFIRMED: 'Your order has been confirmed',
    PROCESSING: 'Your order is being processed',
    SHIPPED: 'Your order has been shipped',
    DELIVERED: 'Your order has been delivered',
    CANCELLED: 'Your order has been cancelled',
    REFUNDED: 'Your order has been refunded'
  };

  return createNotification({
    userId: customerUserId,
    type: NOTIFICATION_TYPES.ORDER_STATUS_CHANGED,
    title: `Order #${order.orderNumber} - ${newStatus}`,
    message: statusMessages[newStatus] || `Order status updated to ${newStatus}`,
    data: { orderId: order.id, orderNumber: order.orderNumber, status: newStatus }
  });
};

export const notifyOrderCancelled = async (customerUserId, order) => {
  return createNotification({
    userId: customerUserId,
    type: NOTIFICATION_TYPES.ORDER_CANCELLED,
    title: 'Order Cancelled',
    message: `Your order #${order.orderNumber} has been cancelled successfully`,
    data: { orderId: order.id, orderNumber: order.orderNumber }
  });
};

export const notifyReturnUpdated = async (customerUserId, order, returnStatus) => {
  const TITLES = {
    APPROVED: 'Return Approved',
    REJECTED: 'Return Not Approved',
    REFUNDED: 'Refund Processed',
  };
  const MESSAGES = {
    APPROVED: `Your return request for order #${order.orderNumber} has been approved. We will arrange collection shortly.`,
    REJECTED: `Your return request for order #${order.orderNumber} could not be approved. Please contact support for more information.`,
    REFUNDED: `Your refund for order #${order.orderNumber} has been processed and will appear within 5–10 business days.`,
  };
  return createNotification({
    userId: customerUserId,
    type: 'RETURN_STATUS_CHANGED',
    title: TITLES[returnStatus] || `Return Update — Order #${order.orderNumber}`,
    message: MESSAGES[returnStatus] || `Return status updated to ${returnStatus}`,
    data: { orderId: order.id, orderNumber: order.orderNumber, returnStatus },
  });
};


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
export const notifyOrderPlaced = async (vendorUserId, order) => {
  return createNotification({
    userId: vendorUserId,
    type: NOTIFICATION_TYPES.ORDER_PLACED,
    title: 'New Order Received! 🎉',
    message: `You have a new order #${order.orderNumber} for $${order.total.toFixed(2)}`,
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

export const notifyProductReviewed = async (vendorUserId, product, rating) => {
  const stars = '⭐'.repeat(rating);
  return createNotification({
    userId: vendorUserId,
    type: NOTIFICATION_TYPES.PRODUCT_REVIEWED,
    title: 'New Product Review',
    message: `${product.name} received a ${rating}-star review ${stars}`,
    data: { productId: product.id, rating }
  });
};
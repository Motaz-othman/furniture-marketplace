// backend/src/modules/orders/orders.controller.js
import prisma from '../../shared/config/db.js';
import { notifyOrderPlaced, notifyOrderStatusChanged, notifyOrderCancelled } from '../../shared/services/notification.service.js';
import { createPaymentIntent, createPaymentIntentWithTransfer } from '../../shared/services/stripe.service.js';

// Generate unique order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `ORD-${timestamp}-${random}`.toUpperCase();
};

// ✅ NEW: Generate unique tracking number (auto-generated, no duplicates)
const generateTrackingNumber = (vendorId, orderId) => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const vendorPrefix = vendorId.substring(0, 4).toUpperCase();
  const orderSuffix = orderId.substring(0, 4).toUpperCase();
  return `TRK-${vendorPrefix}-${timestamp}${random}-${orderSuffix}`;
};

// Create order from cart (checkout)
export const createOrder = async (req, res) => {
  try {
    const customerId = req.user.customer.id;
    const { addressId, notes } = req.body;

    // Get cart items with variants
    const cartItems = await prisma.cartItem.findMany({
      where: { customerId },
      include: {
        product: {
          include: { vendor: true }
        },
        variant: true
      }
    });

    if (cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Validate all items
    const invalidItems = [];
    for (const item of cartItems) {
      if (!item.product) {
        invalidItems.push({ 
          reason: 'Product no longer exists', 
          cartItemId: item.id 
        });
        continue;
      }
      
      if (!item.product.isActive) {
        invalidItems.push({ 
          reason: 'Product is no longer available', 
          name: item.product.name 
        });
        continue;
      }

      // Variant validation
      if (item.variantId) {
        if (!item.variant) {
          invalidItems.push({ 
            reason: 'Product variant no longer exists', 
            name: item.product.name 
          });
          continue;
        }

        if (!item.variant.isActive) {
          invalidItems.push({ 
            reason: 'Product variant is no longer available', 
            name: item.product.name,
            variant: `${item.variant.color || ''} ${item.variant.size || ''}`.trim()
          });
          continue;
        }

        if (item.variant.stockQuantity < item.quantity) {
          invalidItems.push({ 
            reason: 'Insufficient stock',
            name: item.product.name,
            variant: `${item.variant.color || ''} ${item.variant.size || ''}`.trim(),
            available: item.variant.stockQuantity,
            requested: item.quantity
          });
        }
      } else {
        if (item.product.stockQuantity < item.quantity) {
          invalidItems.push({ 
            reason: 'Insufficient stock',
            name: item.product.name,
            available: item.product.stockQuantity,
            requested: item.quantity
          });
        }
      }
    }

    if (invalidItems.length > 0) {
      return res.status(400).json({ 
        error: 'Some items in your cart are no longer available. Please remove them and try again.',
        invalidItems
      });
    }

    // Verify address belongs to customer
    const address = await prisma.address.findUnique({
      where: { id: addressId }
    });

    if (!address || address.customerId !== customerId) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // Group items by vendor
    const itemsByVendor = {};
    for (const item of cartItems) {
      const vendorId = item.product.vendorId;
      if (!itemsByVendor[vendorId]) {
        itemsByVendor[vendorId] = [];
      }
      itemsByVendor[vendorId].push(item);
    }

    // Create orders in transaction
    const orders = await prisma.$transaction(async (tx) => {
      const createdOrders = [];

      for (const [vendorId, items] of Object.entries(itemsByVendor)) {
        // Calculate subtotal using variant price if available
        const subtotal = items.reduce((sum, item) => {
          const price = item.variant ? item.variant.price : item.product.price;
          return sum + (price * item.quantity);
        }, 0);

        const tax = subtotal * 0.08;
        const shippingCost = 50;
        const total = subtotal + tax + shippingCost;
        const commission = subtotal * items[0].product.vendor.commissionRate;

        const order = await tx.order.create({
          data: {
            customerId,
            vendorId,
            addressId,
            orderNumber: generateOrderNumber(),
            subtotal,
            tax,
            shippingCost,
            total,
            commission,
            notes,
            items: {
              create: items.map(item => ({
                productId: item.productId,
                variantId: item.variantId || undefined,
                quantity: item.quantity,
                price: item.variant ? item.variant.price : item.product.price
              }))
            }
          },
          include: {
            items: {
              include: { 
                product: true,
                variant: true
              }
            },
            vendor: {
              select: { businessName: true }
            },
            address: true
          }
        });

        createdOrders.push(order);

        // Update stock
        for (const item of items) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: {
                stockQuantity: {
                  decrement: item.quantity
                }
              }
            });
          } else {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stockQuantity: {
                  decrement: item.quantity
                }
              }
            });
          }
        }
      }

      // Clear cart
      await tx.cartItem.deleteMany({
        where: { customerId }
      });

      return createdOrders;
    });

    // Notify vendors
    for (const order of orders) {
      try {
        const vendor = await prisma.vendor.findUnique({
          where: { id: order.vendorId },
          select: { userId: true }
        });
        if (vendor) {
          await notifyOrderPlaced(vendor.userId, order);
        }
      } catch (notifError) {
        console.error('Notification error:', notifError);
      }
    }

    // Create payment intents
    const ordersWithPayment = await Promise.all(
      orders.map(async (order) => {
        try {
          const vendor = await prisma.vendor.findUnique({
            where: { id: order.vendorId },
            select: { 
              stripeAccountId: true, 
              onboardingComplete: true,
              payoutsEnabled: true 
            }
          });

          let paymentIntent;

          if (vendor.stripeAccountId && vendor.onboardingComplete && vendor.payoutsEnabled) {
            paymentIntent = await createPaymentIntentWithTransfer(
              order.total,
              vendor.stripeAccountId,
              order.commission,
              {
                orderId: order.id,
                orderNumber: order.orderNumber,
                customerId: order.customerId,
                vendorId: order.vendorId
              },
              {}
            );
          } else {
            paymentIntent = await createPaymentIntent(
              order.total,
              {
                orderId: order.id,
                orderNumber: order.orderNumber,
                customerId: order.customerId,
                vendorId: order.vendorId
              },
              {}
            );
            
            console.log(`Warning: Vendor ${order.vendorId} doesn't have Stripe connected. Using regular payment.`);
          }

          await prisma.order.update({
            where: { id: order.id },
            data: {
              stripePaymentIntentId: paymentIntent.id,
              paymentStatus: 'PROCESSING'
            }
          });

          return {
            ...order,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
          };
        } catch (paymentError) {
          console.error('Payment intent creation failed:', paymentError);
          return order;
        }
      })
    );

    res.status(201).json({
      message: 'Orders created successfully',
      orders: ordersWithPayment
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

// Get customer's orders
export const getCustomerOrders = async (req, res) => {
  try {
    const customerId = req.user.customer.id;
    const { page = 1, limit = 10, status } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { customerId };
    if (status) {
      where.status = status;
    }

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: { 
              product: true,
              variant: true
            }
          },
          vendor: {
            select: { businessName: true }
          },
          address: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.order.count({ where })
    ]);

    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({ error: 'Failed to get orders' });
  }
};

// Get vendor's orders
export const getVendorOrders = async (req, res) => {
  try {
    const vendorId = req.user.vendor.id;
    const { page = 1, limit = 10, status } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { vendorId };
    if (status) {
      where.status = status;
    }

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: { 
              product: true,
              variant: true
            }
          },
          customer: {
            include: {
              user: {
                select: { firstName: true, lastName: true, email: true, phone: true }
              }
            }
          },
          address: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.order.count({ where })
    ]);

    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get vendor orders error:', error);
    res.status(500).json({ error: 'Failed to get orders' });
  }
};

// Get single order
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { 
            product: true,
            variant: true
          }
        },
        vendor: {
          select: { businessName: true, userId: true }
        },
        customer: {
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true, phone: true }
            }
          }
        },
        address: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check access
    const isCustomer = order.customer.userId === userId;
    const isVendor = order.vendor.userId === userId;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isCustomer && !isVendor && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(order);

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to get order' });
  }
};

// ✅ UPDATED: Update order status with AUTO-GENERATED tracking number
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, carrierTrackingNumber, carrierTrackingUrl } = req.body;
    const vendorId = req.user.vendor.id;

    // Valid statuses
    const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Find order
    const order = await prisma.order.findUnique({
      where: { id }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check vendor ownership
    if (order.vendorId !== vendorId) {
      return res.status(403).json({ error: 'Not your order' });
    }

    // Build update data
    const updateData = { status };

    // ✅ AUTO-GENERATE tracking number when status changes to SHIPPED
    if (status === 'SHIPPED' && !order.trackingNumber) {
      updateData.trackingNumber = generateTrackingNumber(vendorId, id);
    }

    // Optional: vendor can also provide carrier tracking (UPS, FedEx, etc.)
    if (carrierTrackingNumber) {
      updateData.carrierTrackingNumber = carrierTrackingNumber;
    }
    if (carrierTrackingUrl) {
      updateData.carrierTrackingUrl = carrierTrackingUrl;
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: { 
            product: true,
            variant: true
          }
        }
      }
    });

    // Notify customer
    try {
      const customer = await prisma.customer.findUnique({
        where: { id: updatedOrder.customerId },
        select: { userId: true }
      });
      if (customer) {
        await notifyOrderStatusChanged(customer.userId, updatedOrder, status);
      }
    } catch (notifError) {
      console.error('Notification error:', notifError);
    }

    res.json({
      message: 'Order status updated',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};

// Cancel order (customer only, before shipping)
export const cancelOrder = async (req, res) => {
  try {
    const customerId = req.user.customer.id;
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { 
        items: {
          include: {
            variant: true
          }
        }
      }
    });

    // Check ownership
    if (!order || order.customerId !== customerId) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Can only cancel if PENDING
    if (order.status !== 'PENDING') {
      return res.status(400).json({ 
        error: `Cannot cancel order with status: ${order.status}. Only PENDING orders can be cancelled.` 
      });
    }

    // Use transaction to update order AND restore stock
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const cancelledOrder = await tx.order.update({
        where: { id },
        data: { status: 'CANCELLED' }
      });

      // Restore stock
      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: {
              stockQuantity: {
                increment: item.quantity
              }
            }
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: {
                increment: item.quantity
              }
            }
          });
        }
      }

      return cancelledOrder;
    });

    // Notify customer
    try {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { userId: true }
      });
      
      if (customer) {
        await notifyOrderCancelled(customer.userId, updatedOrder);
      }
    } catch (notifError) {
      console.error('Notification error:', notifError);
    }

    res.json({
      message: 'Order cancelled successfully and stock restored',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
};
// src/components/orders/OrderDetailsModal.js
'use client';

import { ORDER_STATUS } from '@/lib/constants/orderStatus';
import { 
  X, 
  Package, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  Calendar,
  Truck,
  Hash,
  CreditCard
} from 'lucide-react';

export default function OrderDetailsModal({ order, onClose }) {
  if (!order) return null;

  const status = ORDER_STATUS[order.status] || ORDER_STATUS.PENDING;
  const StatusIcon = status.icon;

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get customer info
  const customer = order.customer?.user || {};
  const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'N/A';
  
  // Get address
  const address = order.address || {};

  // Calculate earnings
  const commissionRate = order.commissionRate || 0.06;
  const earnings = (order.total || 0) * (1 - commissionRate);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Order #{order.orderNumber || order.id?.slice(0, 8).toUpperCase()}
            </h2>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(order.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Status Badge */}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${status.badgeBg} ${status.badgeText}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {status.label}
            </span>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-6">
            
            {/* Tracking Number */}
            {order.trackingNumber && (
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Truck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900">Tracking Number</p>
                  <p className="text-sm font-mono text-blue-700">{order.trackingNumber}</p>
                </div>
              </div>
            )}

            {/* Customer & Shipping */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer Info */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  Customer
                </h3>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-900">{customerName}</p>
                  {customer.email && (
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      {customer.email}
                    </p>
                  )}
                  {customer.phone && (
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      {customer.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Shipping Address */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  Shipping Address
                </h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>{address.street || 'N/A'}</p>
                  <p>
                    {[address.city, address.state, address.zipCode]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  <p>{address.country || ''}</p>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-500" />
                Items ({order.items?.length || 0})
              </h3>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {order.items?.map((item, index) => {
                  const product = item.product || {};
                  const variant = item.variant;
                  const price = item.price || variant?.price || product.price || 0;
                  const image = variant?.image || product.images?.[0];
                  const sku = variant?.sku || product.sku || 'N/A';
                  
                  return (
                    <div 
                      key={item.id || index}
                      className={`flex items-center gap-4 p-4 ${
                        index > 0 ? 'border-t border-gray-100' : ''
                      }`}
                    >
                      {/* Product Image */}
                      <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {image ? (
                          <img 
                            src={image} 
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {product.name || 'Product'}
                        </p>
                        <p className="text-xs text-blue-600 font-mono mt-0.5">
                          SKU: {sku}
                        </p>
                        {variant && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {[variant.color, variant.size].filter(Boolean).join(' / ')}
                          </p>
                        )}
                      </div>

                      {/* Quantity & Price */}
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          ${(price * item.quantity).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.quantity} × ${price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Summary */}
            <div className="p-4 bg-gray-50 rounded-xl">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-500" />
                Order Summary
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">${(order.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span className="text-gray-900">${(order.tax || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="text-gray-900">${(order.shippingCost || 0).toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="font-bold text-gray-900">${(order.total || 0).toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-dashed border-gray-300">
                  <span className="text-green-600 font-medium">Your Earnings</span>
                  <span className="text-green-600 font-semibold">${earnings.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="p-4 bg-amber-50 rounded-xl">
                <h3 className="text-sm font-semibold text-amber-900 mb-2">Order Notes</h3>
                <p className="text-sm text-amber-800">{order.notes}</p>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
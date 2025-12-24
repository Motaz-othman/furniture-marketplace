// src/app/dashboard/earnings/page.js
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { vendorService } from '@/lib/api/vendor.service';
import { ordersService } from '@/lib/api/orders.service';
import { 
  DollarSign, 
  TrendingUp, 
  CheckCircle,
  ArrowDownRight,
  RefreshCw,
  Filter
} from 'lucide-react';

export default function EarningsPage() {
  const [dateFilter, setDateFilter] = useState('all'); // all, month, week

  // Fetch vendor stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['vendor-stats'],
    queryFn: async () => {
      const response = await vendorService.getStats();
      return response?.data || response;
    },
  });

  // Fetch delivered orders for transaction history
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['delivered-orders'],
    queryFn: async () => {
      const response = await ordersService.getVendorOrders({ 
        status: 'DELIVERED',
        limit: 50 
      });
      return response?.data || response;
    },
  });

  // Calculate stats
  const totalRevenue = stats?.revenue?.total || 0;
  const totalCommission = stats?.revenue?.commission || 0;
  const netEarnings = stats?.revenue?.net || 0;
  const totalOrders = stats?.orders?.total || 0;
  
  // Get delivered orders count
  const deliveredCount = stats?.orders?.byStatus?.find(s => s.status === 'DELIVERED')?._count?.id || 0;

  // Commission rate (6%)
  const commissionRate = 0.06;

  // Orders list
  const deliveredOrders = ordersData?.orders || [];

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isLoading = statsLoading || ordersLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>
          <p className="text-gray-500 mt-1">
            Track your revenue and earnings
          </p>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Time</option>
            <option value="month">This Month</option>
            <option value="week">This Week</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-gray-500">Total Revenue</span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-gray-900">
              {isLoading ? '...' : formatCurrency(totalRevenue)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              From {totalOrders} orders
            </p>
          </div>
        </div>

        {/* Net Earnings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-xs font-medium text-gray-500">Net Earnings</span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-green-600">
              {isLoading ? '...' : formatCurrency(netEarnings)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              After {(commissionRate * 100)}% commission
            </p>
          </div>
        </div>

        {/* Commission Paid */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-amber-100 rounded-lg">
              <ArrowDownRight className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-xs font-medium text-gray-500">Commission Paid</span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-amber-600">
              {isLoading ? '...' : formatCurrency(totalCommission)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Platform fee
            </p>
          </div>
        </div>

        {/* Delivered Orders */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-xs font-medium text-gray-500">Delivered</span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-gray-900">
              {isLoading ? '...' : deliveredCount}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Completed orders
            </p>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Completed Orders</h2>
          <p className="text-sm text-gray-500">Orders that have been delivered</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : deliveredOrders.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No delivered orders yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Items</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Commission</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deliveredOrders.map((order) => {
                  const orderTotal = order.total || 0;
                  const orderCommission = order.commission || (orderTotal * commissionRate);
                  const orderEarnings = orderTotal - orderCommission;

                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">
                          #{order.orderNumber || order.id?.slice(0, 8).toUpperCase()}
                        </p>
                        {order.trackingNumber && (
                          <p className="text-xs text-blue-600 font-mono">
                            {order.trackingNumber}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {order.items?.length || 0} items
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">
                        {formatCurrency(orderTotal)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-red-600">
                        - {formatCurrency(orderCommission)}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-green-600">
                        {formatCurrency(orderEarnings)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
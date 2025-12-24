// src/app/dashboard/page.js
'use client';

import { useQuery } from '@tanstack/react-query';
import { vendorService } from '@/lib/api/vendor.service';
import { ordersService } from '@/lib/api/orders.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Package, 
  ShoppingCart, 
  DollarSign, 
  TrendingUp,
  Clock,
  CheckCircle,
  Truck,
  ArrowRight,
  Plus
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  // Fetch statistics using the detailed stats endpoint
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['vendor-stats'],
    queryFn: async () => {
      const response = await vendorService.getStats();
      return response?.data || response;
    },
  });

  // Fetch recent orders
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['recent-orders'],
    queryFn: async () => {
      const response = await ordersService.getVendorOrders({ page: 1, limit: 5 });
      return response?.data || response;
    },
  });

  // Extract stats with fallbacks
  const totalProducts = stats?.products?.total || 0;
  const activeProducts = stats?.products?.active || 0;
  const totalOrders = stats?.orders?.total || 0;
  const totalRevenue = stats?.revenue?.total || 0;
  const netEarnings = stats?.revenue?.net || 0;

  // Get orders by status
  const ordersByStatus = stats?.orders?.byStatus || [];
  const pendingCount = ordersByStatus.find(s => s.status === 'PENDING')?._count?.id || 0;
  const processingCount = ordersByStatus.find(s => s.status === 'PROCESSING')?._count?.id || 0;
  const shippedCount = ordersByStatus.find(s => s.status === 'SHIPPED')?._count?.id || 0;
  const deliveredCount = ordersByStatus.find(s => s.status === 'DELIVERED')?._count?.id || 0;

  // Orders list
  const recentOrders = ordersData?.orders || [];

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Status colors
  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      PROCESSING: 'bg-purple-100 text-purple-800',
      SHIPPED: 'bg-indigo-100 text-indigo-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      REFUNDED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back! Here's your store overview.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/products/add">
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Link>
        </Button>
      </div>

      {/* Main Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Revenue</CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-8 bg-gray-200 rounded animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totalRevenue)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  From {totalOrders} orders
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Net Earnings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Net Earnings</CardTitle>
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-8 bg-gray-200 rounded animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(netEarnings)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  After 6% commission
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Orders</CardTitle>
            <div className="p-2 bg-purple-100 rounded-lg">
              <ShoppingCart className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-8 bg-gray-200 rounded animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-900">{totalOrders}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {pendingCount} pending
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total Products */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Products</CardTitle>
            <div className="p-2 bg-amber-100 rounded-lg">
              <Package className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-8 bg-gray-200 rounded animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-900">{totalProducts}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {activeProducts} active
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Order Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-xl font-bold text-gray-900">{pendingCount}</p>
                <p className="text-xs text-gray-500">Pending</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <Package className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-xl font-bold text-gray-900">{processingCount}</p>
                <p className="text-xs text-gray-500">Processing</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
              <Truck className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="text-xl font-bold text-gray-900">{shippedCount}</p>
                <p className="text-xs text-gray-500">Shipped</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xl font-bold text-gray-900">{deliveredCount}</p>
                <p className="text-xs text-gray-500">Delivered</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Recent Orders</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/orders" className="flex items-center gap-1">
                View All
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No orders yet</p>
              <p className="text-sm text-gray-400 mt-1">Orders will appear here when customers purchase</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href="/dashboard/orders"
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          #{order.orderNumber || order.id?.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(order.total)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {order.items?.length || 0} items
                      </p>
                    </div>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
              <Link href="/dashboard/products/add">
                <Plus className="w-5 h-5" />
                <span>Add Product</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
              <Link href="/dashboard/orders">
                <ShoppingCart className="w-5 h-5" />
                <span>Manage Orders</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
              <Link href="/dashboard/earnings">
                <DollarSign className="w-5 h-5" />
                <span>View Earnings</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
              <Link href="/dashboard/settings">
                <Package className="w-5 h-5" />
                <span>Settings</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
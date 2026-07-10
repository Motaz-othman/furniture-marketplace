'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats, getRevenueChart, getRecentActivity } from '@/lib/services/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  DollarSign, Clock, LayoutGrid,
  Package, AlertTriangle, TrendingUp,
} from 'lucide-react';

function formatCurrency(val) {
  if (val == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${accent || ''}`}>{value ?? '—'}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="rounded-md bg-muted p-2">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const STATUS_COLOR = {
  PENDING:    'text-yellow-600 border-yellow-300',
  CONFIRMED:  'text-blue-600 border-blue-300',
  PROCESSING: 'text-purple-600 border-purple-300',
  SHIPPED:    'text-cyan-600 border-cyan-300',
  DELIVERED:  'text-green-600 border-green-300',
  CANCELLED:  '',
  REFUNDED:   '',
};

const VENDOR_LABEL = { ACME: 'ACME', GFW: 'Global Furniture', UW: 'United Weavers' };

export default function DashboardPage() {
  const router = useRouter();

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    staleTime: 60_000,
  });

  const { data: chartData } = useQuery({
    queryKey: ['revenue-chart'],
    queryFn: getRevenueChart,
    staleTime: 300_000,
  });

  const { data: activity } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: getRecentActivity,
    staleTime: 60_000,
  });

  const recentOrders = activity?.recentOrders || [];
  const months = chartData?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Business overview</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          label="Revenue (30 days)"
          value={formatCurrency(stats?.revenue?.last30Days)}
          sub={`Today: ${formatCurrency(stats?.orders?.today?.revenue)}`}
        />
        <StatCard
          icon={TrendingUp}
          label="Orders (30 days)"
          value={stats?.orders?.newLast30Days ?? '—'}
          sub={`Today: ${stats?.orders?.today?.count ?? 0} orders`}
        />
        <StatCard
          icon={Clock}
          label="Pending Orders"
          value={stats?.orders?.pending ?? '—'}
          accent={stats?.orders?.pending > 0 ? 'text-yellow-600' : ''}
          sub="Awaiting confirmation"
        />
        <StatCard
          icon={LayoutGrid}
          label="Active Listings"
          value={stats?.listings?.active ?? '—'}
          sub={`${stats?.products?.active ?? '—'} active products`}
        />
      </div>

      {/* Revenue chart + Orders by status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenue — Last 12 Months</CardTitle>
          </CardHeader>
          <CardContent>
            {months.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={months} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    formatter={(v) => [formatCurrency(v), 'Revenue']}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'].map((status) => {
                const count = stats?.orders?.byStatus?.[status] || 0;
                if (count === 0) return null;
                return (
                  <div key={status} className="flex items-center justify-between">
                    <Badge variant="outline" className={`text-xs ${STATUS_COLOR[status] || ''}`}>
                      {status}
                    </Badge>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                );
              })}
              {!stats?.orders?.byStatus && (
                <p className="text-sm text-muted-foreground">No orders yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent orders + Vendor breakdown + Low stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No orders yet</p>
            ) : (
              <div className="space-y-2">
                {recentOrders.map((order) => {
                  const name = order.customer?.user
                    ? `${order.customer.user.firstName} ${order.customer.user.lastName}`
                    : 'Guest';
                  return (
                    <div
                      key={order.id}
                      className="flex items-center justify-between py-2 border-b last:border-0 cursor-pointer hover:bg-muted/40 px-1 rounded"
                      onClick={() => router.push(`/orders/${order.id}`)}
                    >
                      <div>
                        <p className="text-sm font-medium">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{name} · {formatDate(order.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={`text-xs ${STATUS_COLOR[order.status] || ''}`}>
                          {order.status}
                        </Badge>
                        <span className="text-sm font-medium">{formatCurrency(order.total)}</span>
                      </div>
                    </div>
                  );
                })}
                <button
                  className="text-xs text-muted-foreground hover:text-foreground mt-1"
                  onClick={() => router.push('/orders')}
                >
                  View all orders →
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Vendor breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" /> Products by Vendor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {['ACME', 'GFW', 'UW'].map((v) => {
                  const count = stats?.products?.byVendor?.[v] || 0;
                  return (
                    <div key={v} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{VENDOR_LABEL[v]}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Low stock alert */}
          <Card className={stats?.products?.lowStock > 0 ? 'border-yellow-300' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className={`h-4 w-4 ${stats?.products?.lowStock > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                Low / No Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${stats?.products?.lowStock > 0 ? 'text-yellow-600' : ''}`}>
                {stats?.products?.lowStock ?? '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Active products with ≤5 units
              </p>
              {stats?.products?.lowStock > 0 && (
                <button
                  className="text-xs text-yellow-600 hover:underline mt-2"
                  onClick={() => router.push('/products?stock=low')}
                >
                  View products →
                </button>
              )}
            </CardContent>
          </Card>

          {/* Users */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.users?.customers ?? '—'}</p>
              <p className="text-xs text-muted-foreground mt-1">
                +{stats?.users?.newLast30Days ?? 0} new in 30 days
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

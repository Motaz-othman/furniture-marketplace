'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getOrders } from '@/lib/services/orders';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, X, Package, Download } from 'lucide-react';

const STATUS_OPTIONS = ['DRAFT', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

const STATUS_VARIANT = {
  DRAFT:      'outline',
  PENDING:    'outline',
  CONFIRMED:  'secondary',
  PROCESSING: 'secondary',
  SHIPPED:    'default',
  DELIVERED:  'default',
  CANCELLED:  'destructive',
  REFUNDED:   'destructive',
};

const STATUS_COLOR = {
  DRAFT:      'text-gray-500 border-gray-300',
  PENDING:    'text-yellow-600 border-yellow-300',
  CONFIRMED:  'text-blue-600 border-blue-300',
  PROCESSING: 'text-purple-600 border-purple-300',
  SHIPPED:    'text-cyan-600 border-cyan-300',
  DELIVERED:  'text-green-600 border-green-300',
  CANCELLED:  '',
  REFUNDED:   '',
};

function StatusBadge({ status }) {
  const color = STATUS_COLOR[status] || '';
  const variant = STATUS_VARIANT[status] || 'outline';
  return (
    <Badge variant={variant} className={`text-xs ${color}`}>
      {status}
    </Badge>
  );
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatCurrency(val) {
  return val != null ? `$${Number(val).toFixed(2)}` : '—';
}

function exportOrdersCSV(orders) {
  const headers = ['Order #', 'Customer', 'Email', 'Items', 'Subtotal', 'Discount', 'Coupon', 'Tax', 'Shipping', 'Total', 'Status', 'Payment', 'Date'];
  const rows = orders.map((o) => {
    const name = o.customer?.user
      ? `${o.customer.user.firstName} ${o.customer.user.lastName}`
      : o.guestFirstName ? `${o.guestFirstName} ${o.guestLastName || ''}`.trim() : 'Guest';
    const email = o.customer?.user?.email || o.guestEmail || '';
    const itemCount = o.items?.length ?? 0;
    return [
      o.orderNumber,
      name,
      email,
      itemCount,
      o.subtotal?.toFixed(2) ?? '',
      o.discountAmount ? o.discountAmount.toFixed(2) : '0.00',
      o.couponCode || '',
      o.tax?.toFixed(2) ?? '',
      o.shippingCost?.toFixed(2) ?? '',
      o.total?.toFixed(2) ?? '',
      o.status,
      o.paymentStatus || '',
      new Date(o.createdAt).toLocaleDateString('en-US'),
    ];
  });

  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function OrdersPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const params = { page, limit: 20 };
  if (debouncedSearch) params.search = debouncedSearch;
  if (status) params.status = status;

  async function handleExport() {
    setExporting(true);
    try {
      const exportParams = { limit: 9999 };
      if (debouncedSearch) exportParams.search = debouncedSearch;
      if (status) exportParams.status = status;
      const result = await getOrders(exportParams);
      exportOrdersCSV(result.orders || []);
    } catch {
      // silently fail
    } finally {
      setExporting(false);
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', debouncedSearch, status, page],
    queryFn: () => getOrders(params),
    staleTime: 30_000,
  });

  const { data: pendingData } = useQuery({
    queryKey: ['admin-orders-pending-count'],
    queryFn: () => getOrders({ status: 'PENDING', limit: 1 }),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const orders = data?.orders || [];
  const pagination = data?.pagination || {};
  const pendingCount = pendingData?.pagination?.totalCount ?? 0;
  const hasFilters = search || status;

  function clearFilters() {
    setSearch('');
    setStatus('');
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">Orders</h1>
            {pendingCount > 0 && (
              <span className="flex h-6 items-center rounded-full bg-yellow-100 px-2.5 text-xs font-semibold text-yellow-700 border border-yellow-300">
                {pendingCount} pending
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {pagination.totalCount ?? '—'} total orders
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          <Download className="h-4 w-4 mr-1.5" />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search order #, email, or tracking #..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Tracking #</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/orders/${order.id}`)}
                >
                  <TableCell className="font-mono text-sm font-medium">
                    {order.orderNumber}
                  </TableCell>
                  <TableCell className="text-sm">
                    {order.customer?.user ? (
                      <>
                        {order.customer.user.firstName} {order.customer.user.lastName}
                        <div className="text-xs text-muted-foreground">{order.customer.user.email}</div>
                      </>
                    ) : order.guestFirstName ? (
                      <>
                        {order.guestFirstName} {order.guestLastName || ''}
                        <div className="text-xs text-muted-foreground">{order.guestEmail} · Guest</div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1.5">
                      {order.items?.[0]?.product?.mainImage ? (
                        <Image
                          src={order.items[0].product.mainImage}
                          alt=""
                          width={32}
                          height={32}
                          className="rounded object-cover border"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                          <Package className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      )}
                      <span>
                        {order.items?.[0]?.product?.name
                          ? order.items.length > 1
                            ? `${order.items[0].product.name} +${order.items.length - 1} more`
                            : order.items[0].product.name
                          : '—'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {formatCurrency(order.total)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {order.trackingNumber || '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {pagination.totalPages} ({pagination.totalCount} orders)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getCustomerDetail } from '@/lib/services/customers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Package } from 'lucide-react';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(v) {
  return v != null ? `$${Number(v).toFixed(2)}` : '—';
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

export default function CustomerDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const { data: customer, isLoading } = useQuery({
    queryKey: ['admin-customer', id],
    queryFn: () => getCustomerDetail(id),
    staleTime: 30_000,
  });

  if (isLoading) return <div className="text-muted-foreground p-8">Loading...</div>;
  if (!customer) return <div className="text-muted-foreground p-8">Customer not found</div>;

  const name = `${customer.user.firstName} ${customer.user.lastName}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/customers')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Customers
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{customer.user.email}</p>
        </div>
        {customer.user.isBlocked && <Badge variant="destructive">Blocked</Badge>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: customer.orders.length },
          { label: 'Total Spend', value: formatCurrency(customer.totalSpend) },
          { label: 'Member Since', value: formatDate(customer.user.createdAt) },
          { label: 'Phone', value: customer.user.phone || '—' },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-semibold mt-0.5">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Addresses */}
      {customer.addresses?.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Saved Addresses</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {customer.addresses.map((a) => (
                <div key={a.id} className="text-sm border rounded p-3 space-y-0.5">
                  {a.label && <p className="font-medium">{a.label}</p>}
                  <p>{a.street}</p>
                  <p>{a.city}, {a.state} {a.zipCode}</p>
                  {a.isDefault && <Badge variant="outline" className="text-xs mt-1">Default</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order history */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Order History</CardTitle></CardHeader>
        <CardContent className="p-0">
          {customer.orders.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">No orders yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.orders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/orders/${order.id}`)}
                  >
                    <TableCell className="font-mono text-sm font-medium">{order.orderNumber}</TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1.5">
                        {order.items?.[0]?.product?.mainImage ? (
                          <img src={order.items[0].product.mainImage} alt="" className="w-7 h-7 rounded object-cover border" />
                        ) : (
                          <div className="w-7 h-7 rounded bg-muted flex items-center justify-center">
                            <Package className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                        <span>{order.items?.length ?? 0} item{order.items?.length !== 1 ? 's' : ''}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{formatCurrency(order.total)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${STATUS_COLOR[order.status] || ''}`}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

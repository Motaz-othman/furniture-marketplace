'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getCustomers } from '@/lib/services/customers';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, X } from 'lucide-react';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(v) {
  return v != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v) : '—';
}

const STATUS_COLOR = {
  DELIVERED: 'text-green-600 border-green-300',
  SHIPPED:   'text-cyan-600 border-cyan-300',
  PENDING:   'text-yellow-600 border-yellow-300',
  CANCELLED: '',
  REFUNDED:  '',
};

export default function CustomersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get('search') || '');
  const [page, setPage] = useState(() => parseInt(searchParams.get('page') || '1'));
  const didMount = useRef(false);

  const updateUrl = useCallback((s, p) => {
    const params = new URLSearchParams();
    if (s) params.set('search', s);
    if (p > 1) params.set('page', p);
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [pathname, router]);

  useEffect(() => {
    if (!didMount.current) return;
    clearTimeout(window._csTimeout);
    window._csTimeout = setTimeout(() => { setDebouncedSearch(search); setPage(1); updateUrl(search, 1); }, 300);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return; }
    updateUrl(debouncedSearch, page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(val) {
    setSearch(val);
  }

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customers', debouncedSearch, page],
    queryFn: () => getCustomers({ page, limit: 20, ...(debouncedSearch ? { search: debouncedSearch } : {}) }),
    staleTime: 30_000,
  });

  const customers = data?.data || [];
  const pagination = data?.pagination || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Customers</h1>
        <p className="text-sm text-muted-foreground mt-1">{pagination.total ?? '—'} total customers</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {search && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setDebouncedSearch(''); }}>
            <X className="h-4 w-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Total Spend</TableHead>
              <TableHead>Last Order</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : customers.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No customers found</TableCell></TableRow>
            ) : customers.map((c) => (
              <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/customers/${c.id}`)}>
                <TableCell>
                  <p className="font-medium text-sm">{c.user.firstName} {c.user.lastName}</p>
                  <p className="text-xs text-muted-foreground">{c.user.email}</p>
                </TableCell>
                <TableCell className="text-right text-sm font-medium">{c.orderCount}</TableCell>
                <TableCell className="text-right text-sm font-medium">{formatCurrency(c.totalSpend)}</TableCell>
                <TableCell className="text-sm">
                  {c.lastOrderStatus && (
                    <Badge variant="outline" className={`text-xs mr-1.5 ${STATUS_COLOR[c.lastOrderStatus] || ''}`}>
                      {c.lastOrderStatus}
                    </Badge>
                  )}
                  {formatDate(c.lastOrderAt)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(c.user.createdAt)}</TableCell>
                <TableCell>
                  {c.user.isBlocked
                    ? <Badge variant="destructive" className="text-xs">Blocked</Badge>
                    : <Badge variant="outline" className="text-xs text-green-600 border-green-300">Active</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {pagination.totalPages} ({pagination.total} customers)</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(1)}>«</Button>
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(pagination.totalPages)}>»</Button>
          </div>
        </div>
      )}
    </div>
  );
}

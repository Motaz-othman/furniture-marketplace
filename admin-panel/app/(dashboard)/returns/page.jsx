'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getReturnRequests } from '@/lib/services/returns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Package, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_TABS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'REFUNDED'];

const STATUS_VARIANT = {
  PENDING:  'outline',
  APPROVED: 'default',
  REJECTED: 'destructive',
  REFUNDED: 'secondary',
};
const STATUS_COLOR = {
  PENDING:  'text-yellow-600 border-yellow-300',
  APPROVED: 'text-green-600 border-green-300',
  REJECTED: '',
  REFUNDED: '',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n) {
  return n != null ? `$${Number(n).toFixed(2)}` : '—';
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function ReturnBadge({ status }) {
  return (
    <Badge
      variant={STATUS_VARIANT[status] || 'outline'}
      className={`text-xs ${STATUS_COLOR[status] || ''}`}
    >
      {status}
    </Badge>
  );
}

function refundTotal(rr) {
  return (rr.items || []).reduce((sum, ri) => sum + (ri.orderItem?.price || 0) * ri.quantity, 0);
}

// ── Expanded row ───────────────────────────────────────────────────────────────

function ExpandedRow({ rr, colSpan, onViewOrder }) {
  return (
    <TableRow className="bg-muted/30 hover:bg-muted/30">
      <TableCell colSpan={colSpan} className="pb-4 pt-0 px-8">
        <div className="space-y-3 max-w-2xl">

          {/* Items */}
          <div className="space-y-2">
            {(rr.items || []).map((ri) => {
              const item = ri.orderItem;
              const name = item?.product?.name || '—';
              const variant = item?.variant?.name;
              return (
                <div key={ri.id} className="flex items-start gap-3 text-sm">
                  {item?.product?.mainImage ? (
                    <Image
                      src={item.product.mainImage}
                      alt=""
                      width={40}
                      height={40}
                      className="rounded object-cover border shrink-0 mt-0.5"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center border shrink-0 mt-0.5">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {name}{variant ? ` — ${variant}` : ''} ×{ri.quantity}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{ri.reason}</div>
                  </div>
                  <div className="text-sm font-medium shrink-0">
                    {fmt((item?.price || 0) * ri.quantity)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Admin notes (read-only) */}
          {rr.adminNotes && (
            <p className="text-xs text-muted-foreground italic border-l-2 pl-3">{rr.adminNotes}</p>
          )}

          {/* Link to order for actions */}
          <Button size="sm" variant="outline" onClick={onViewOrder}>
            View Order to Approve / Reject
            <ExternalLink className="h-3 w-3 ml-1.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ReturnsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('ALL');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);

  const params = { page, limit: 20 };
  if (activeTab !== 'ALL') params.status = activeTab;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-returns', activeTab, page],
    queryFn: () => getReturnRequests(params),
    staleTime: 30_000,
  });

  const returnRequests = data?.returnRequests || [];
  const pagination = data?.pagination || {};

  function handleTabChange(tab) {
    setActiveTab(tab);
    setPage(1);
    setExpandedId(null);
  }

  function toggleExpand(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Return Requests</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {pagination.total ?? '—'} total requests
        </p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={[
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Submitted</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Refund Est.</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : returnRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  No return requests
                  {activeTab !== 'ALL' ? ` with status ${activeTab}` : ''}
                </TableCell>
              </TableRow>
            ) : (
              returnRequests.flatMap((rr) => {
                const customer = rr.customer?.user;
                const isExpanded = expandedId === rr.id;
                const total = refundTotal(rr);
                const firstItem = rr.items?.[0]?.orderItem;

                const rows = [
                  <TableRow
                    key={rr.id}
                    className={`cursor-pointer hover:bg-muted/50 ${isExpanded ? 'bg-muted/30' : ''}`}
                    onClick={() => toggleExpand(rr.id)}
                  >
                    {/* Expand toggle */}
                    <TableCell className="pr-0">
                      {isExpanded
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </TableCell>

                    {/* Date */}
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {fmtDate(rr.createdAt)}
                    </TableCell>

                    {/* Order */}
                    <TableCell>
                      <button
                        className="font-mono text-sm font-medium hover:underline text-primary flex items-center gap-1"
                        onClick={(e) => { e.stopPropagation(); router.push(`/orders/${rr.orderId}`); }}
                      >
                        {rr.order?.orderNumber || rr.orderId.slice(0, 8)}
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </TableCell>

                    {/* Customer */}
                    <TableCell className="text-sm">
                      {customer ? (
                        <>
                          <div>{customer.firstName} {customer.lastName}</div>
                          <div className="text-xs text-muted-foreground">{customer.email}</div>
                        </>
                      ) : '—'}
                    </TableCell>

                    {/* Items preview */}
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-2">
                        {firstItem?.product?.mainImage ? (
                          <Image
                            src={firstItem.product.mainImage}
                            alt=""
                            width={32}
                            height={32}
                            className="rounded object-cover border shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center border shrink-0">
                            <Package className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        )}
                        <span className="truncate max-w-[160px]">
                          {firstItem?.product?.name || '—'}
                          {rr.items.length > 1 && (
                            <span className="text-muted-foreground"> +{rr.items.length - 1} more</span>
                          )}
                        </span>
                      </div>
                    </TableCell>

                    {/* Refund estimate */}
                    <TableCell className="text-sm font-medium">
                      {fmt(total)}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <ReturnBadge status={rr.status} />
                    </TableCell>
                  </TableRow>,
                ];

                if (isExpanded) {
                  rows.push(
                    <ExpandedRow
                      key={`${rr.id}-expanded`}
                      rr={rr}
                      colSpan={7}
                      onViewOrder={() => router.push(`/orders/${rr.orderId}`)}
                    />
                  );
                }

                return rows;
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {pagination.totalPages} ({pagination.total} requests)
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

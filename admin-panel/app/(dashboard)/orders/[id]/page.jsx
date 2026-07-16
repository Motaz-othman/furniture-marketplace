'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getOrder, createShipment, updateShipment, updateOrderStatus, updateItemStatus,
} from '@/lib/services/orders';
import { updateReturnRequest, refundReturnRequest } from '@/lib/services/returns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { ArrowLeft, Package, Plus, Pencil, Truck, Download, ExternalLink, Copy, Check, CreditCard, AlertCircle, RotateCcw, ArrowRight, Clock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

// ─── Constants ────────────────────────────────────────────────────────────────



const RETURN_STATUS_COLOR = {
  PENDING:  'text-yellow-600 border-yellow-300',
  APPROVED: 'text-green-600 border-green-300',
  REJECTED: '',
  REFUNDED: '',
};
const RETURN_STATUS_VARIANT = {
  PENDING:  'outline',
  APPROVED: 'default',
  REJECTED: 'destructive',
  REFUNDED: 'secondary',
};

const ALLOWED_TRANSITIONS = {
  DRAFT:      [],
  PENDING:    ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:  ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED:    ['DELIVERED'],
  DELIVERED:  ['REFUNDED'],
  CANCELLED:  [],
  REFUNDED:   [],
};

const ITEM_ALLOWED_TRANSITIONS = {
  PENDING:          ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:        ['PROCESSING', 'CANCELLED'],
  PROCESSING:       ['SHIPPED', 'CANCELLED'],
  SHIPPED:          ['DELIVERED'],
  DELIVERED:        ['RETURN_REQUESTED', 'REFUNDED'],
  CANCELLED:        ['REFUNDED'],
  REFUNDED:         [],
  RETURN_REQUESTED: ['RETURN_APPROVED', 'RETURN_REJECTED'],
  RETURN_APPROVED:  ['REFUNDED'],
  RETURN_REJECTED:  [],
};
const PROVIDERS = ['DELIVERIGHT', 'GIGIGA', 'FEDEX', 'UPS', 'OTHER'];
const TYPES = ['LTL', 'SMALL_PARCEL'];

const DELIVERY_METHOD_LABELS = {
  GROUND:           'Ground Shipping',
  TWO_DAY:          '2-Day Shipping',
  ONE_DAY:          '1-Day Shipping',
  OUTSIDE_DROP_OFF: 'Outside Drop Off',
  IN_HOME_DROP_OFF: 'In Home Drop Off',
  ROOM_OF_CHOICE:   'Room of Choice',
  WHITE_GLOVE:      'White Glove',
};

const EVENT_CONFIG = {
  ORDER_PLACED: {
    icon: ShieldCheck, color: 'text-blue-500', ring: 'border-blue-200',
    label: () => 'Order placed',
    detail: (d) => d?.itemCount != null ? `${d.itemCount} item${d.itemCount !== 1 ? 's' : ''} · Total ${formatCurrencyStatic(d.total)}` : null,
  },
  PAYMENT_RECEIVED: {
    icon: CreditCard, color: 'text-green-500', ring: 'border-green-200',
    label: () => 'Payment received',
    detail: (d) => d?.amount != null ? `${formatCurrencyStatic(d.amount)} via Stripe` : null,
  },
  PAYMENT_FAILED: {
    icon: AlertCircle, color: 'text-red-500', ring: 'border-red-200',
    label: () => 'Payment failed',
    detail: (d) => d?.lastPaymentError || null,
  },
  REFUND_PROCESSED: {
    icon: RotateCcw, color: 'text-orange-500', ring: 'border-orange-200',
    label: () => 'Refund processed',
    detail: (d) => d?.amount != null ? `${formatCurrencyStatic(d.amount)} refunded` : null,
  },
  STATUS_CHANGE: {
    icon: ArrowRight, color: 'text-violet-500', ring: 'border-violet-200',
    label: (d) => d?.from && d?.to ? `Status: ${d.from} → ${d.to}` : 'Status changed',
    detail: (d) => d?.note || null,
  },
  ITEM_STATUS_CHANGE: {
    icon: Package, color: 'text-slate-500', ring: 'border-slate-200',
    label: (d) => d?.from && d?.to ? `Item status: ${d.from} → ${d.to}` : 'Item status changed',
    detail: (d) => [d?.product, d?.variant].filter(Boolean).join(' · ') || null,
  },
  RETURN_REQUESTED: {
    icon: RotateCcw, color: 'text-amber-500', ring: 'border-amber-200',
    label: () => 'Return requested',
    detail: (d) => d?.itemCount != null ? `${d.itemCount} item${d.itemCount !== 1 ? 's' : ''}` : null,
  },
  RETURN_APPROVED: {
    icon: ShieldCheck, color: 'text-green-500', ring: 'border-green-200',
    label: () => 'Return approved',
    detail: (d) => d?.adminNotes || null,
  },
  RETURN_REJECTED: {
    icon: AlertCircle, color: 'text-red-500', ring: 'border-red-200',
    label: () => 'Return rejected',
    detail: (d) => d?.adminNotes || null,
  },
  RETURN_REFUNDED: {
    icon: CreditCard, color: 'text-orange-500', ring: 'border-orange-200',
    label: () => 'Return refund issued',
    detail: (d) => d?.amount != null ? `${formatCurrencyStatic(d.amount)} refunded` : null,
  },
  _default: {
    icon: Clock, color: 'text-muted-foreground', ring: 'border-border',
    label: (_d, type) => type || 'Event',
    detail: null,
  },
};

function formatCurrencyStatic(val) {
  return val != null ? `$${Number(val).toFixed(2)}` : '—';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatCurrency(val) {
  return val != null ? `$${Number(val).toFixed(2)}` : '—';
}

function getSuggestedShipType(item) {
  const shipType = (item.variant?.packaging?.shipType || '').trim();
  if (shipType === 'LTL' || shipType === 'GROUND - OVERSIZE') return 'LTL';
  if (shipType) return 'Small Parcel';
  return null;
}

function getPackagingDims(item) {
  const pkg = item.variant?.packaging;
  const varDims = item.variant?.dimensions;

  // Prefer carton/packaging dims; fall back to product dims if carton has none
  const pkgDims = pkg?.dimensions;
  const dims = (pkgDims?.length || pkgDims?.width || pkgDims?.height)
    ? pkgDims
    : (varDims || {});

  const L = Number(dims.length) || 0;
  const W = Number(dims.width) || 0;
  const H = Number(dims.height) || 0;
  // pkg.weight is at root; varDims.weight is inside the object
  const weight = Number(pkg?.weight) || Number(varDims?.weight) || 0;
  const uomDist = pkg?.dimensionsUnitOfMeasure || varDims?.unitOfMeasureDistance || 'in';
  const cuFt = (L && W && H) ? (L * W * H) / 1728 : 0;
  return { L, W, H, cuFt, weight, uomDist };
}

function exportToCSV(order) {
  const addr = order.address;
  const delivLoc = addr ? `${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}` : '';
  const esc = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const headers = [
    'Item', 'SKU', 'Qty',
    'Length (in)', 'Width (in)', 'Height (in)', 'Cu.Ft', 'Weight (lbs)',
    'Pickup Location', 'Delivery Location', 'Delivery Method',
  ];
  const rows = (order.items || []).map((item) => {
    const { L, W, H, cuFt, weight } = getPackagingDims(item);
    const method = DELIVERY_METHOD_LABELS[item.deliveryMethod] || item.deliveryMethod || '';
    const pickup = item.product?.brand || item.product?.provider || '';
    return [
      esc(item.product?.name || ''),
      item.variant?.sku || '',
      item.quantity,
      L > 0 ? L.toFixed(2) : '',
      W > 0 ? W.toFixed(2) : '',
      H > 0 ? H.toFixed(2) : '',
      cuFt > 0 ? cuFt.toFixed(3) : '',
      weight > 0 ? weight : '',
      esc(pickup),
      esc(delivLoc),
      esc(method),
    ].join(',');
  });
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `order-${order.orderNumber}-logistics.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Small shared UI ──────────────────────────────────────────────────────────

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value ?? '—'}</span>
    </div>
  );
}

function TH({ children, align = 'left' }) {
  return (
    <th className={`px-4 py-2.5 font-medium whitespace-nowrap text-${align}`}>
      {children}
    </th>
  );
}

function TD({ children, align = 'left', className = '' }) {
  return (
    <td className={`px-4 py-3 text-${align} ${className}`}>
      {children}
    </td>
  );
}

function ItemThumb({ item }) {
  return item.product?.mainImage ? (
    <Image
      src={item.product.mainImage}
      alt=""
      width={28}
      height={28}
      className="rounded object-cover border shrink-0"
    />
  ) : (
    <div className="w-7 h-7 rounded bg-muted flex items-center justify-center border shrink-0">
      <Package className="h-3 w-3 text-muted-foreground" />
    </div>
  );
}



// ─── Per-Item Add Shipment Dialog ──────────────────────────────────────────────

function PerItemAddShipmentDialog({ open, onClose, orderId, item }) {
  const queryClient = useQueryClient();
  const empty = { type: '', provider: '', estimatedCost: '', trackingNumber: '', notes: '' };
  const [form, setForm] = useState(empty);

  function resetAndClose() {
    setForm(empty);
    onClose();
  }

  const mutation = useMutation({
    mutationFn: (body) => createShipment(orderId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', orderId] });
      toast.success('Shipment created');
      resetAndClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create shipment'),
  });

  function set(key, val) { setForm((f) => ({ ...f, [key]: val })); }

  function handleSubmit() {
    mutation.mutate({
      ...(form.type && { type: form.type }),
      ...(form.provider && { provider: form.provider }),
      ...(form.estimatedCost !== '' && { estimatedCost: Number(form.estimatedCost) }),
      ...(form.trackingNumber && { trackingNumber: form.trackingNumber }),
      ...(form.notes && { notes: form.notes }),
      itemIds: [item.id],
    });
  }

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetAndClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Shipment</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          {item.product?.name}
          {item.variant?.name ? ` · ${item.variant.name}` : ''}
          {' '}×{item.quantity}
        </p>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => set('type', v)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Select value={form.provider} onValueChange={(v) => set('provider', v)}>
                <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              Estimated Cost ($){' '}
              <span className="text-muted-foreground font-normal text-xs">(optional)</span>
            </Label>
            <Input
              type="number" min="0" step="0.01" placeholder="0.00"
              value={form.estimatedCost}
              onChange={(e) => set('estimatedCost', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              Tracking Number{' '}
              <span className="text-muted-foreground font-normal text-xs">(optional)</span>
            </Label>
            <Input
              placeholder="e.g. 1Z999AA10123456784"
              value={form.trackingNumber}
              onChange={(e) => set('trackingNumber', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              Notes{' '}
              <span className="text-muted-foreground font-normal text-xs">(optional)</span>
            </Label>
            <Textarea
              rows={2}
              placeholder="Optional notes…"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create Shipment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Shipment Dialog ──────────────────────────────────────────────────────

function EditShipmentDialog({ open, onClose, orderId, shipment }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    provider: '', type: '', status: '',
    estimatedCost: '', actualCost: '',
    trackingNumber: '', trackingUrl: '', notes: '',
  });

  useEffect(() => {
    if (open && shipment) {
      setForm({
        provider:       shipment.provider || '',
        type:           shipment.type || '',
        estimatedCost:  shipment.estimatedCost ?? '',
        actualCost:     shipment.actualCost ?? '',
        trackingNumber: shipment.trackingNumber || '',
        trackingUrl:    shipment.trackingUrl || '',
        notes:          shipment.notes || '',
      });
    }
  }, [open, shipment]);

  const mutation = useMutation({
    mutationFn: (body) => updateShipment(orderId, shipment.id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', orderId] });
      toast.success('Shipment updated');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update shipment'),
  });

  function set(key, val) { setForm((f) => ({ ...f, [key]: val })); }

  function handleSubmit() {
    mutation.mutate({
      provider:       form.provider || null,
      type:           form.type || null,
      estimatedCost:  form.estimatedCost !== '' ? Number(form.estimatedCost) : null,
      actualCost:     form.actualCost !== '' ? Number(form.actualCost) : null,
      trackingNumber: form.trackingNumber || null,
      trackingUrl:    form.trackingUrl || null,
      notes:          form.notes || null,
    });
  }

  if (!shipment) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Shipment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Select value={form.provider || '__none__'} onValueChange={(v) => set('provider', v === '__none__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {PROVIDERS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type || '__none__'} onValueChange={(v) => set('type', v === '__none__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Estimated Cost ($)</Label>
              <Input
                type="number" min="0" step="0.01" placeholder="0.00"
                value={form.estimatedCost}
                onChange={(e) => set('estimatedCost', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Actual Cost ($)</Label>
              <Input
                type="number" min="0" step="0.01" placeholder="0.00"
                value={form.actualCost}
                onChange={(e) => set('actualCost', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tracking Number</Label>
            <Input
              placeholder="e.g. 1Z999AA10123456784"
              value={form.trackingNumber}
              onChange={(e) => set('trackingNumber', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tracking URL</Label>
            <Input
              type="url" placeholder="https://…"
              value={form.trackingUrl}
              onChange={(e) => set('trackingUrl', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              rows={2} placeholder="Optional notes…"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [addShipmentForItem, setAddShipmentForItem] = useState(null);
  const [editingShipment, setEditingShipment] = useState(null);
  const [returnNotesMap, setReturnNotesMap] = useState({});
  const [piCopied, setPiCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-order', id],
    queryFn: () => getOrder(id),
  });

  const orderStatusMutation = useMutation({
    mutationFn: (status) => updateOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
      toast.success('Order status updated');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update order status'),
  });

  const itemStatusMutation = useMutation({
    mutationFn: ({ itemId, status }) => updateItemStatus(id, itemId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-order', id] }),
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update item status'),
  });

  const returnMutation = useMutation({
    mutationFn: ({ returnId, status, adminNotes }) =>
      updateReturnRequest(returnId, status, adminNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
      toast.success('Return request updated');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update return'),
  });

  const refundMutation = useMutation({
    mutationFn: (returnId) => refundReturnRequest(returnId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
      toast.success(res.message || 'Refund processed');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to process refund'),
  });

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  const order = data?.order;
  if (!order) return <div className="p-8 text-muted-foreground">Order not found</div>;

  const customer = order.customer?.user;
  const guestName = order.guestFirstName
    ? `${order.guestFirstName} ${order.guestLastName || ''}`.trim()
    : null;
  const addr = order.address;
  const deliveryLocation = addr
    ? `${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}`
    : '—';
  const hasReturns = (order.returnRequests?.length ?? 0) > 0;
  const discountRatio = (order.subtotal > 0 && order.discountAmount > 0)
    ? order.discountAmount / order.subtotal : 0;

  function getFullShipment(item) {
    if (!item.shipment) return null;
    return order.shipments?.find((s) => s.id === item.shipment.id) || item.shipment;
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/orders')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold font-mono">{order.orderNumber}</h1>
            <Select
              value={order.status}
              onValueChange={(status) => orderStatusMutation.mutate(status)}
              disabled={orderStatusMutation.isPending}
            >
              <SelectTrigger className="h-8 w-auto text-sm font-medium border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={order.status} disabled>{order.status}</SelectItem>
                {(ALLOWED_TRANSITIONS[order.status] || []).map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Placed {formatDate(order.createdAt)}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 shrink-0"
          onClick={() => exportToCSV(order)}
        >
          <Download className="h-3.5 w-3.5" />
          Export to Excel
        </Button>
      </div>

      {/* ── Table 1: Order Items ── */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Order Items ({order.items?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '220px' }} />
                <col style={{ width: '110px' }} />
                <col style={{ width: '56px' }} />
                <col style={{ width: '96px' }} />
                <col style={{ width: '96px' }} />
                <col style={{ width: '96px' }} />
                <col style={{ width: '148px' }} />
                <col style={{ width: '72px' }} />
                <col style={{ width: '96px' }} />
              </colgroup>
              <thead>
                <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                  <TH>Product</TH>
                  <TH>SKU</TH>
                  <TH align="center">Qty</TH>
                  <TH align="right">Cost Price</TH>
                  <TH align="right">Sale Price</TH>
                  <TH align="right">Disc. Price</TH>
                  <TH align="right">Dimensions (L×W×H)</TH>
                  <TH align="right">Cu.Ft</TH>
                  <TH align="right">Weight</TH>
                </tr>
              </thead>
              <tbody className="divide-y">
                {order.items?.map((item) => {
                  const costPrice = item.variant?.price?.cost ?? null;
                  const salePrice = item.price;
                  const discountedPrice = discountRatio > 0 ? salePrice * (1 - discountRatio) : null;
                  const { L, W, H, cuFt, weight, uomDist } = getPackagingDims(item);
                  const dimUnit = uomDist === 'in' ? '"' : ' cm';

                  return (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <TD className="overflow-hidden">
                        <div className="flex items-center gap-2 overflow-hidden">
                          {item.product?.mainImage ? (
                            <Image
                              src={item.product.mainImage}
                              alt={item.product.name}
                              width={40}
                              height={40}
                              className="rounded object-cover border shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center border shrink-0">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0 overflow-hidden">
                            <div className="font-medium truncate" title={item.product?.name}>
                              {item.product?.name || '—'}
                            </div>
                            {item.variant?.name && (
                              <div className="text-xs text-muted-foreground truncate">
                                {item.variant.name}
                              </div>
                            )}
                          </div>
                        </div>
                      </TD>
                      <TD>
                        <span className="font-mono text-xs text-muted-foreground">
                          {item.variant?.sku || '—'}
                        </span>
                      </TD>
                      <TD align="center" className="font-medium">{item.quantity}</TD>
                      <TD align="right" className="tabular-nums text-muted-foreground">
                        {costPrice != null ? formatCurrency(costPrice) : '—'}
                      </TD>
                      <TD align="right" className="tabular-nums font-medium">
                        {formatCurrency(salePrice)}
                      </TD>
                      <TD align="right" className="tabular-nums">
                        {discountedPrice != null ? (
                          <span className="text-green-600 font-medium">
                            {formatCurrency(discountedPrice)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TD>
                      <TD align="right" className="tabular-nums text-muted-foreground whitespace-nowrap">
                        {L > 0 && W > 0 && H > 0
                          ? `${L.toFixed(1)}×${W.toFixed(1)}×${H.toFixed(1)}${dimUnit}`
                          : '—'}
                      </TD>
                      <TD align="right" className="tabular-nums text-muted-foreground">
                        {cuFt > 0 ? cuFt.toFixed(2) : '—'}
                      </TD>
                      <TD align="right" className="tabular-nums text-muted-foreground whitespace-nowrap">
                        {weight > 0 ? `${weight} lbs` : '—'}
                      </TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Table 2: Shipment Management ── */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Shipment Management</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '220px' }} />
                <col style={{ width: '130px' }} />
                <col style={{ width: 'auto' }} />
                <col style={{ width: '160px' }} />
              </colgroup>
              <thead>
                <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                  <TH>Item</TH>
                  <TH>Suggested Type</TH>
                  <TH>Shipment</TH>
                  <TH>Item Status</TH>
                </tr>
              </thead>
              <tbody className="divide-y">
                {order.items?.map((item) => {
                  const fullShipment = getFullShipment(item);
                  const suggestedType = getSuggestedShipType(item);
                  return (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <TD className="overflow-hidden">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <ItemThumb item={item} />
                          <span
                            className="truncate font-medium min-w-0"
                            title={item.product?.name}
                          >
                            {item.product?.name || '—'}
                          </span>
                        </div>
                      </TD>
                      <TD>
                        {suggestedType ? (
                          <Badge
                            variant="outline"
                            className={`text-xs ${suggestedType === 'LTL' ? 'text-purple-600 border-purple-300' : 'text-blue-600 border-blue-300'}`}
                          >
                            {suggestedType}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TD>
                      <TD>
                        {fullShipment ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            {fullShipment.provider && (
                              <Badge variant="outline" className="text-xs">
                                {fullShipment.provider}
                              </Badge>
                            )}
                            {fullShipment.type && (
                              <Badge variant="secondary" className="text-xs">
                                {fullShipment.type.replace('_', ' ')}
                              </Badge>
                            )}
                            {fullShipment.estimatedCost != null && (
                              <span className="text-xs text-muted-foreground">
                                Est:{' '}
                                <span className="font-medium text-foreground">
                                  {formatCurrency(fullShipment.estimatedCost)}
                                </span>
                              </span>
                            )}
                            {fullShipment.trackingNumber && (
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-xs">
                                  {fullShipment.trackingNumber}
                                </span>
                                {fullShipment.trackingUrl && (
                                  <a
                                    href={fullShipment.trackingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 gap-1"
                              onClick={() => setEditingShipment(fullShipment)}
                            >
                              <Pencil className="h-3 w-3" /> Edit
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1"
                            onClick={() => setAddShipmentForItem(item)}
                          >
                            <Plus className="h-3 w-3" /> Add Shipment
                          </Button>
                        )}
                      </TD>
                      <TD>
                        <Select
                          value={item.status || 'PENDING'}
                          onValueChange={(status) =>
                            itemStatusMutation.mutate({ itemId: item.id, status })
                          }
                          disabled={itemStatusMutation.isPending}
                        >
                          <SelectTrigger className="h-7 text-xs w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={item.status || 'PENDING'} disabled>
                              {item.status || 'PENDING'}
                            </SelectItem>
                            {(ITEM_ALLOWED_TRANSITIONS[item.status || 'PENDING'] || []).map((s) => (
                              <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Table 3: Delivery Routing ── */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Delivery Routing</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '220px' }} />
                <col style={{ width: '160px' }} />
                <col style={{ width: '200px' }} />
                <col style={{ width: '160px' }} />
                <col style={{ width: '110px' }} />
              </colgroup>
              <thead>
                <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                  <TH>Item</TH>
                  <TH>Pickup Location</TH>
                  <TH>Delivery Location</TH>
                  <TH>Delivery Method</TH>
                  <TH align="right">Delivery Fee</TH>
                </tr>
              </thead>
              <tbody className="divide-y">
                {order.items?.map((item) => {
                  const pickup = item.product?.brand || item.product?.provider;
                  return (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <TD className="overflow-hidden">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <ItemThumb item={item} />
                          <span
                            className="truncate font-medium min-w-0"
                            title={item.product?.name}
                          >
                            {item.product?.name || '—'}
                          </span>
                        </div>
                      </TD>
                      <TD>
                        {pickup ? (
                          <div className="flex items-center gap-1.5">
                            <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span>{pickup}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TD>
                      <TD className="text-muted-foreground text-xs">{deliveryLocation}</TD>
                      <TD>
                        {item.deliveryMethod ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Truck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span>
                              {DELIVERY_METHOD_LABELS[item.deliveryMethod] || item.deliveryMethod}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TD>
                      <TD align="right" className="tabular-nums">
                        {item.deliveryMethod ? (
                          item.deliveryFee > 0 ? (
                            formatCurrency(item.deliveryFee)
                          ) : (
                            <span className="text-green-600 font-medium">Free</span>
                          )
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Table 4: Returns (only shown if returns exist) ── */}
      {hasReturns && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Returns ({order.returnRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                    <TH>Date</TH>
                    <TH>Items &amp; Reason</TH>
                    <TH>Status</TH>
                    <TH align="right">Refund Amt</TH>
                    <TH>Actions</TH>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {order.returnRequests.map((rr) => {
                    const refundTotal = rr.items.reduce(
                      (sum, ri) => sum + (ri.orderItem?.price || 0) * ri.quantity,
                      0,
                    );
                    return (
                      <tr key={rr.id} className="hover:bg-muted/20 transition-colors align-top">
                        <TD className="text-xs text-muted-foreground whitespace-nowrap pt-3.5">
                          {formatDate(rr.createdAt)}
                        </TD>
                        <TD>
                          <div className="space-y-1.5">
                            {rr.items.map((ri) => (
                              <div key={ri.id}>
                                <span className="font-medium">
                                  {ri.orderItem?.product?.name || '—'}
                                  {ri.orderItem?.variant?.name
                                    ? ` · ${ri.orderItem.variant.name}` : ''}
                                </span>
                                <span className="text-muted-foreground"> ×{ri.quantity}</span>
                                {ri.reason && (
                                  <div className="text-xs text-muted-foreground">{ri.reason}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </TD>
                        <TD className="pt-3.5">
                          <Badge
                            variant={RETURN_STATUS_VARIANT[rr.status] || 'outline'}
                            className={`text-xs ${RETURN_STATUS_COLOR[rr.status] || ''}`}
                          >
                            {rr.status}
                          </Badge>
                        </TD>
                        <TD align="right" className="tabular-nums font-medium pt-3.5">
                          {formatCurrency(refundTotal)}
                        </TD>
                        <TD>
                          <div className="space-y-2 py-0.5">
                            {rr.status === 'PENDING' && (
                              <>
                                <Textarea
                                  rows={1}
                                  placeholder="Admin note (optional)…"
                                  className="h-8 text-xs resize-none py-1.5 min-h-0"
                                  value={returnNotesMap[rr.id] || ''}
                                  onChange={(e) =>
                                    setReturnNotesMap((m) => ({
                                      ...m, [rr.id]: e.target.value,
                                    }))
                                  }
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs flex-1"
                                    disabled={returnMutation.isPending}
                                    onClick={() =>
                                      returnMutation.mutate({
                                        returnId: rr.id,
                                        status: 'APPROVED',
                                        adminNotes: returnNotesMap[rr.id],
                                      })
                                    }
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-7 text-xs flex-1"
                                    disabled={returnMutation.isPending}
                                    onClick={() =>
                                      returnMutation.mutate({
                                        returnId: rr.id,
                                        status: 'REJECTED',
                                        adminNotes: returnNotesMap[rr.id],
                                      })
                                    }
                                  >
                                    Reject
                                  </Button>
                                </div>
                              </>
                            )}
                            {rr.status === 'APPROVED' && (
                              <Button
                                size="sm"
                                className="h-7 text-xs w-full"
                                disabled={refundMutation.isPending}
                                onClick={() => refundMutation.mutate(rr.id)}
                              >
                                {refundMutation.isPending
                                  ? 'Processing…'
                                  : `Refund ${formatCurrency(refundTotal)}`}
                              </Button>
                            )}
                            {rr.adminNotes && rr.status !== 'PENDING' && (
                              <p className="text-xs text-muted-foreground italic">
                                {rr.adminNotes}
                              </p>
                            )}
                          </div>
                        </TD>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Common Info Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Customer */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Customer</CardTitle>
          </CardHeader>
          <CardContent>
            {customer ? (
              <>
                <InfoRow label="Name" value={`${customer.firstName} ${customer.lastName}`} />
                <InfoRow label="Email" value={customer.email} />
                {customer.phone && <InfoRow label="Phone" value={customer.phone} />}
              </>
            ) : guestName ? (
              <>
                <Badge variant="outline" className="text-xs mb-2">Guest</Badge>
                <InfoRow label="Name" value={guestName} />
                {order.guestEmail && <InfoRow label="Email" value={order.guestEmail} />}
                {order.guestPhone && <InfoRow label="Phone" value={order.guestPhone} />}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Guest order</p>
            )}
            {addr && (
              <>
                <Separator className="my-2" />
                <p className="text-xs text-muted-foreground font-medium mb-1">Delivery Address</p>
                <p className="text-sm">{addr.street}</p>
                <p className="text-sm text-muted-foreground">
                  {addr.city}, {addr.state} {addr.zipCode}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Payment */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="Status" value={order.paymentStatus || '—'} />
            {order.stripePaymentIntentId && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">Stripe PI</p>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs break-all leading-tight flex-1">
                    {order.stripePaymentIntentId}
                  </span>
                  <button
                    className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
                    title="Copy to clipboard"
                    onClick={() => {
                      navigator.clipboard.writeText(order.stripePaymentIntentId);
                      setPiCopied(true);
                      setTimeout(() => setPiCopied(false), 2000);
                    }}
                  >
                    {piCopied
                      ? <Check className="h-3.5 w-3.5 text-green-500" />
                      : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="Subtotal" value={formatCurrency(order.subtotal)} />
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-sm py-1 text-green-600">
                <span>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</span>
                <span className="font-medium">−{formatCurrency(order.discountAmount)}</span>
              </div>
            )}
            <InfoRow label="Delivery" value={formatCurrency(order.shippingCost)} />
            <InfoRow label="Tax" value={formatCurrency(order.tax)} />
            <Separator className="my-2" />
            <div className="flex justify-between text-base font-semibold py-1">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {order.notes ? (
              <p className="text-sm text-muted-foreground">{order.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No notes</p>
            )}
          </CardContent>
        </Card>

      </div>

      {/* ── Order History Timeline ── */}
      {(order.events?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Order History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-72 overflow-y-auto pr-1">
            <ol className="relative border-l border-border ml-3 space-y-0">
              {order.events.map((ev, idx) => {
                const isLast = idx === order.events.length - 1;
                const cfg = EVENT_CONFIG[ev.type] || EVENT_CONFIG._default;
                const Icon = cfg.icon;
                return (
                  <li key={ev.id} className={`ml-6 ${isLast ? 'pb-0' : 'pb-6'}`}>
                    <span className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full border bg-background ${cfg.ring}`}>
                      <Icon className={`h-3 w-3 ${cfg.color}`} />
                    </span>
                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3">
                      <p className="text-sm font-medium leading-tight">
                        {cfg.label(ev.data, ev.type)}
                      </p>
                      <time className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(ev.createdAt)}
                      </time>
                    </div>
                    {cfg.detail && ev.data && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {cfg.detail(ev.data)}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Dialogs ── */}
      <PerItemAddShipmentDialog
        open={!!addShipmentForItem}
        onClose={() => setAddShipmentForItem(null)}
        orderId={id}
        item={addShipmentForItem}
      />
      <EditShipmentDialog
        open={!!editingShipment}
        onClose={() => setEditingShipment(null)}
        orderId={id}
        shipment={editingShipment}
      />

    </div>
  );
}

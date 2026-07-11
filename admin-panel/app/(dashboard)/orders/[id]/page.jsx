'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getOrder, updateOrderStatus,
  createShipment, updateShipment, deleteShipment,
} from '@/lib/services/orders';
import { updateReturnRequest, refundReturnRequest } from '@/lib/services/returns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ArrowLeft, Package, Plus, Pencil, Trash2, ExternalLink, Truck } from 'lucide-react';
import { toast } from 'sonner';

// ─── Constants ────────────────────────────────────────────────────────────────

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

const ORDER_STATUS_COLOR = {
  PENDING:    'text-yellow-600 border-yellow-300',
  CONFIRMED:  'text-blue-600 border-blue-300',
  PROCESSING: 'text-purple-600 border-purple-300',
  SHIPPED:    'text-cyan-600 border-cyan-300',
  DELIVERED:  'text-green-600 border-green-300',
  CANCELLED:  '',
  REFUNDED:   '',
};

const ORDER_STATUS_VARIANT = {
  PENDING:    'outline',
  CONFIRMED:  'secondary',
  PROCESSING: 'secondary',
  SHIPPED:    'default',
  DELIVERED:  'default',
  CANCELLED:  'destructive',
  REFUNDED:   'destructive',
};

const SHIPMENT_STATUSES = ['PENDING', 'QUOTED', 'ARRANGED', 'IN_TRANSIT', 'DELIVERED', 'FAILED'];


const PROVIDERS = ['DELIVERIGHT', 'GIGIGA', 'FEDEX', 'UPS', 'OTHER'];
const TYPES = ['LTL', 'SMALL_PARCEL'];

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

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value ?? '—'}</span>
    </div>
  );
}

function OrderStatusBadge({ status }) {
  return (
    <Badge variant={ORDER_STATUS_VARIANT[status] || 'outline'} className={`text-sm ${ORDER_STATUS_COLOR[status] || ''}`}>
      {status}
    </Badge>
  );
}

function itemLifecycleStatus(item) {
  const rri = item.returnRequestItems?.[0];
  if (rri) {
    const s = rri.returnRequest?.status;
    if (s === 'REFUNDED')  return { label: 'Refunded',        variant: 'secondary', cls: '' };
    if (s === 'REJECTED')  return { label: 'Return Rejected', variant: 'destructive', cls: '' };
    if (s === 'APPROVED')  return { label: 'Return Approved', variant: 'outline', cls: 'text-green-600 border-green-300' };
    if (s === 'PENDING')   return { label: 'Return Requested',variant: 'outline', cls: 'text-yellow-600 border-yellow-300' };
  }
  const s = item.shipment?.status;
  const MAP = {
    PENDING:    { label: 'Pending',     variant: 'outline', cls: 'text-yellow-600 border-yellow-300' },
    QUOTED:     { label: 'Quoted',      variant: 'secondary', cls: 'text-blue-600 border-blue-300' },
    ARRANGED:   { label: 'Arranged',    variant: 'secondary', cls: 'text-purple-600 border-purple-300' },
    IN_TRANSIT: { label: 'In Transit',  variant: 'default',  cls: 'text-cyan-600 border-cyan-300' },
    DELIVERED:  { label: 'Delivered',   variant: 'default',  cls: 'text-green-600 border-green-300' },
    FAILED:     { label: 'Failed',      variant: 'destructive', cls: '' },
  };
  return s ? (MAP[s] || { label: s, variant: 'outline', cls: '' })
           : { label: 'Pending', variant: 'outline', cls: 'text-yellow-600 border-yellow-300' };
}

// ─── Add Shipment Dialog ───────────────────────────────────────────────────────

function AddShipmentDialog({ open, onClose, orderId, unassignedItems }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ type: '', provider: '', notes: '' });
  const [selectedItems, setSelectedItems] = useState([]);

  function resetAndClose() {
    setForm({ type: '', provider: '', notes: '' });
    setSelectedItems([]);
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

  function toggleItem(itemId) {
    setSelectedItems((prev) =>
      prev.includes(itemId) ? prev.filter((i) => i !== itemId) : [...prev, itemId]
    );
  }

  function handleSubmit() {
    const body = {
      ...(form.type && { type: form.type }),
      ...(form.provider && { provider: form.provider }),
      ...(form.notes && { notes: form.notes }),
      ...(selectedItems.length > 0 && { itemIds: selectedItems }),
    };
    mutation.mutate(body);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetAndClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Shipment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Select value={form.provider} onValueChange={(v) => setForm((f) => ({ ...f, provider: v }))}>
                <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {unassignedItems.length > 0 && (
            <div className="space-y-2">
              <Label>Assign Items</Label>
              <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                {unassignedItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-3 py-2">
                    <Checkbox
                      id={`item-${item.id}`}
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={() => toggleItem(item.id)}
                    />
                    {item.product?.mainImage ? (
                      <img src={item.product.mainImage} alt="" className="w-8 h-8 rounded object-cover border shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center border shrink-0">
                        <Package className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                    <label htmlFor={`item-${item.id}`} className="text-sm flex-1 cursor-pointer truncate">
                      {item.product?.name || '—'}
                      {item.variant && (
                        <span className="text-muted-foreground"> · {[item.variant.color, item.variant.size].filter(Boolean).join('/')}</span>
                      )}
                      <span className="text-muted-foreground"> × {item.quantity}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              rows={2}
              placeholder="Optional notes..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating...' : 'Create Shipment'}
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
    provider: shipment?.provider || '',
    type: shipment?.type || '',
    status: shipment?.status || '',
    estimatedCost: shipment?.estimatedCost ?? '',
    actualCost: shipment?.actualCost ?? '',
    trackingNumber: shipment?.trackingNumber || '',
    trackingUrl: shipment?.trackingUrl || '',
    notes: shipment?.notes || '',
  });

  useEffect(() => {
    if (open && shipment) {
      setForm({
        provider: shipment.provider || '',
        type: shipment.type || '',
        status: shipment.status || '',
        estimatedCost: shipment.estimatedCost ?? '',
        actualCost: shipment.actualCost ?? '',
        trackingNumber: shipment.trackingNumber || '',
        trackingUrl: shipment.trackingUrl || '',
        notes: shipment.notes || '',
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

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function handleSubmit() {
    const body = {
      ...(form.provider ? { provider: form.provider } : { provider: null }),
      ...(form.type ? { type: form.type } : { type: null }),
      status: form.status || undefined,
      estimatedCost: form.estimatedCost !== '' ? Number(form.estimatedCost) : null,
      actualCost: form.actualCost !== '' ? Number(form.actualCost) : null,
      trackingNumber: form.trackingNumber || null,
      trackingUrl: form.trackingUrl || null,
      notes: form.notes || null,
    };
    mutation.mutate(body);
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
              <Select value={form.provider} onValueChange={(v) => set('provider', v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {PROVIDERS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => set('type', v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set('status', v)}>
              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>
                {SHIPMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Estimated Cost ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.estimatedCost}
                onChange={(e) => set('estimatedCost', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Actual Cost ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
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
              type="url"
              placeholder="https://..."
              value={form.trackingUrl}
              onChange={(e) => set('trackingUrl', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              rows={2}
              placeholder="Optional notes..."
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Shipment Card ─────────────────────────────────────────────────────────────

function ShipmentCard({ orderId, shipment, onEdit }) {
  const queryClient = useQueryClient();

  const statusMutation = useMutation({
    mutationFn: (status) => updateShipment(orderId, shipment.id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', orderId] });
      toast.success('Shipment status updated');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update status'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteShipment(orderId, shipment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', orderId] });
      toast.success('Shipment deleted');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete shipment'),
  });

  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Inline status selector */}
        <Select
          value={shipment.status}
          onValueChange={(val) => statusMutation.mutate(val)}
          disabled={statusMutation.isPending}
        >
          <SelectTrigger className="h-7 w-auto text-xs px-2 border font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SHIPMENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                {s.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {shipment.provider && (
          <Badge variant="outline" className="text-xs">{shipment.provider}</Badge>
        )}
        {shipment.type && (
          <Badge variant="secondary" className="text-xs">{shipment.type.replace('_', ' ')}</Badge>
        )}
        <div className="ml-auto flex gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(shipment)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Assigned items */}
      {shipment.items?.length > 0 && (
        <div className="space-y-1">
          {shipment.items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 text-sm">
              {item.product?.mainImage ? (
                <img src={item.product.mainImage} alt="" className="w-6 h-6 rounded object-cover border shrink-0" />
              ) : (
                <div className="w-6 h-6 rounded bg-muted flex items-center justify-center border shrink-0">
                  <Package className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
              <span className="truncate text-muted-foreground">
                {item.product?.name || '—'}
                {item.variant && <span> · {[item.variant.color, item.variant.size].filter(Boolean).join('/')}</span>}
                <span> × {item.quantity}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Costs */}
      {(shipment.estimatedCost != null || shipment.actualCost != null) && (
        <div className="flex gap-4 text-xs text-muted-foreground">
          {shipment.estimatedCost != null && (
            <span>Est: <span className="font-medium text-foreground">{formatCurrency(shipment.estimatedCost)}</span></span>
          )}
          {shipment.actualCost != null && (
            <span>Actual: <span className="font-medium text-foreground">{formatCurrency(shipment.actualCost)}</span></span>
          )}
        </div>
      )}

      {/* Tracking */}
      {shipment.trackingNumber && (
        <div className="flex items-center gap-2 text-xs">
          <Truck className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="font-mono">{shipment.trackingNumber}</span>
          {shipment.trackingUrl && (
            <a href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-primary">
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      {/* Notes */}
      {shipment.notes && (
        <p className="text-xs text-muted-foreground italic">{shipment.notes}</p>
      )}
    </div>
  );
}

// ─── Return Requests Card ──────────────────────────────────────────────────────

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

function ReturnRequestsCard({ orderId, returnRequests }) {
  const queryClient = useQueryClient();
  const [notesMap, setNotesMap] = useState({});

  const mutation = useMutation({
    mutationFn: ({ id, status, adminNotes }) => updateReturnRequest(id, status, adminNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', orderId] });
      toast.success('Return request updated');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update return request'),
  });

  const refundMutation = useMutation({
    mutationFn: (id) => refundReturnRequest(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', orderId] });
      toast.success(data.message || 'Refund processed');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to process refund'),
  });

  if (!returnRequests?.length) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Return Requests</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">No return requests for this order.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Return Requests ({returnRequests.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {returnRequests.map((rr) => {
          const refundTotal = rr.items.reduce((sum, ri) => {
            const price = ri.orderItem?.price || 0;
            return sum + price * ri.quantity;
          }, 0);

          return (
            <div key={rr.id} className="border rounded-lg p-4 space-y-3">
              {/* Header */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant={RETURN_STATUS_VARIANT[rr.status] || 'outline'}
                  className={`text-xs ${RETURN_STATUS_COLOR[rr.status] || ''}`}
                >
                  {rr.status}
                </Badge>
                <span className="text-xs text-muted-foreground">{formatDate(rr.createdAt)}</span>
                <span className="ml-auto text-xs font-medium">
                  Refund: {formatCurrency(refundTotal)}
                </span>
              </div>

              {/* Items */}
              <div className="space-y-2">
                {rr.items.map((ri) => {
                  const item = ri.orderItem;
                  const name = item?.product?.name || '—';
                  const variant = item?.variant?.name;
                  return (
                    <div key={ri.id} className="flex items-center gap-2 text-sm">
                      {item?.product?.mainImage ? (
                        <img src={item.product.mainImage} alt="" className="w-8 h-8 rounded object-cover border shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center border shrink-0">
                          <Package className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{name}{variant ? ` — ${variant}` : ''} ×{ri.quantity}</div>
                        <div className="text-xs text-muted-foreground truncate">{ri.reason}</div>
                      </div>
                      <span className="text-xs shrink-0">{formatCurrency((item?.price || 0) * ri.quantity)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Admin notes */}
              {rr.status === 'PENDING' && (
                <Textarea
                  rows={2}
                  placeholder="Admin note (optional)…"
                  value={notesMap[rr.id] || ''}
                  onChange={(e) => setNotesMap((m) => ({ ...m, [rr.id]: e.target.value }))}
                />
              )}
              {rr.adminNotes && rr.status !== 'PENDING' && (
                <p className="text-xs text-muted-foreground italic">Note: {rr.adminNotes}</p>
              )}

              {/* Actions */}
              {rr.status === 'PENDING' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate({ id: rr.id, status: 'APPROVED', adminNotes: notesMap[rr.id] })}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate({ id: rr.id, status: 'REJECTED', adminNotes: notesMap[rr.id] })}
                  >
                    Reject
                  </Button>
                </div>
              )}
              {rr.status === 'APPROVED' && (
                <Button
                  size="sm"
                  variant="default"
                  disabled={refundMutation.isPending}
                  onClick={() => refundMutation.mutate(rr.id)}
                >
                  {refundMutation.isPending ? 'Processing…' : `Refund ${formatCurrency(refundTotal)}`}
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState('');
  const [showAddShipment, setShowAddShipment] = useState(false);
  const [editingShipment, setEditingShipment] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-order', id],
    queryFn: () => getOrder(id),
  });

  const statusMutation = useMutation({
    mutationFn: (status) => updateOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Order status updated');
      setNewStatus('');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update status'),
  });

  if (isLoading) return <div className="text-muted-foreground">Loading...</div>;

  const order = data?.order;
  if (!order) return <div className="text-muted-foreground">Order not found</div>;

  const customer = order.customer?.user;
  const address = order.address;

  // Items that don't have a shipment assigned (using shipment FK on each item)
  const unassignedItems = (order.items || []).filter((item) => !item.shipment);

  // Guest name fallback
  const guestName = order.guestFirstName
    ? `${order.guestFirstName} ${order.guestLastName || ''}`.trim()
    : null;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/orders')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold font-mono">{order.orderNumber}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Placed {formatDate(order.createdAt)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Items ({order.items?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.items?.map((item) => {
                const isUnassigned = !item.shipment;
                const { label, variant, cls } = itemLifecycleStatus(item);
                return (
                  <div key={item.id} className="flex items-center gap-3">
                    {item.product?.mainImage ? (
                      <img src={item.product.mainImage} alt={item.product.name} className="w-14 h-14 rounded object-cover border shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded bg-muted flex items-center justify-center border shrink-0">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.product?.name || '—'}</div>
                      {item.variant && (
                        <div className="text-xs text-muted-foreground">
                          {[item.variant.color, item.variant.size].filter(Boolean).join(' / ')}
                          {item.variant.sku && ` · SKU: ${item.variant.sku}`}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">Qty: {item.quantity}</div>
                      <div className="flex gap-1.5 mt-1 flex-wrap">
                        <Badge variant={variant} className={`text-xs ${cls}`}>{label}</Badge>
                        {isUnassigned && (
                          <Badge variant="outline" className="text-xs text-orange-500 border-orange-300">Unassigned</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-sm font-medium shrink-0 text-right">
                      {formatCurrency(item.price * item.quantity)}
                      <div className="text-xs text-muted-foreground">{formatCurrency(item.price)} each</div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Shipments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Shipments ({order.shipments?.length ?? 0})
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowAddShipment(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Shipment
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {unassignedItems.length > 0 && (order.shipments?.length ?? 0) > 0 && (
                <p className="text-xs text-orange-500">
                  {unassignedItems.length} item{unassignedItems.length > 1 ? 's' : ''} not yet assigned to a shipment.
                </p>
              )}
              {(order.shipments?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No shipments yet. Add a shipment to start organizing delivery.
                </p>
              ) : (
                order.shipments.map((shipment) => (
                  <ShipmentCard
                    key={shipment.id}
                    orderId={id}
                    shipment={shipment}
                    onEdit={setEditingShipment}
                  />
                ))
              )}
            </CardContent>
          </Card>

          {/* Return Requests */}
          <ReturnRequestsCard
            orderId={id}
            returnRequests={order.returnRequests}
          />

          {/* Order totals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow label="Subtotal" value={formatCurrency(order.subtotal)} />
              <InfoRow label="Shipping" value={formatCurrency(order.shippingCost)} />
              <InfoRow label="Tax" value={formatCurrency(order.tax)} />
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-sm py-1 text-green-600">
                  <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
                  <span className="font-medium">−{formatCurrency(order.discountAmount)}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between text-base font-semibold py-1">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">

          {/* Update status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Update Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder={`Current: ${order.status}`} />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUSES.filter((s) => s !== order.status).map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="w-full"
                disabled={!newStatus || statusMutation.isPending}
                onClick={() => statusMutation.mutate(newStatus)}
              >
                {statusMutation.isPending ? 'Updating...' : 'Update Status'}
              </Button>
            </CardContent>
          </Card>

          {/* Customer */}
          <Card>
            <CardHeader>
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
            </CardContent>
          </Card>

          {/* Shipping address */}
          {address && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Shipping Address</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-0.5">
                {address.label && <p className="font-medium">{address.label}</p>}
                <p>{address.street}{address.apartment ? `, ${address.apartment}` : ''}</p>
                <p>{address.city}, {address.state} {address.zipCode}</p>
                {address.country && <p>{address.country}</p>}
              </CardContent>
            </Card>
          )}

          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow label="Status" value={order.paymentStatus || '—'} />
              {order.stripePaymentIntentId && (
                <InfoRow label="Stripe PI" value={order.stripePaymentIntentId} />
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <AddShipmentDialog
        open={showAddShipment}
        onClose={() => setShowAddShipment(false)}
        orderId={id}
        unassignedItems={unassignedItems}
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

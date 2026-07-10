'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCoupons, createCoupon, updateCoupon, deleteCoupon } from '@/lib/services/coupons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { toast } from 'sonner';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatValue(coupon) {
  return coupon.type === 'PERCENTAGE' ? `${coupon.value}%` : `$${coupon.value.toFixed(2)}`;
}

const EMPTY_FORM = { code: '', type: 'PERCENTAGE', value: '', minOrderAmount: '', maxUses: '', expiresAt: '', isActive: true };

function CouponForm({ initial, onSave, onCancel, loading }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5 col-span-2">
          <Label>Code</Label>
          <Input
            placeholder="e.g. SUMMER20"
            value={form.code}
            onChange={e => set('code', e.target.value.toUpperCase())}
            disabled={!!initial}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={form.type} onValueChange={v => set('type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
              <SelectItem value="FIXED">Fixed Amount ($)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Value</Label>
          <Input type="number" min="0" placeholder={form.type === 'PERCENTAGE' ? '20' : '10.00'} value={form.value} onChange={e => set('value', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Min Order Amount ($) <span className="text-muted-foreground text-xs">optional</span></Label>
          <Input type="number" min="0" placeholder="0.00" value={form.minOrderAmount} onChange={e => set('minOrderAmount', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Max Uses <span className="text-muted-foreground text-xs">optional</span></Label>
          <Input type="number" min="1" placeholder="Unlimited" value={form.maxUses} onChange={e => set('maxUses', e.target.value)} />
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label>Expiry Date <span className="text-muted-foreground text-xs">optional</span></Label>
          <Input type="date" value={form.expiresAt} onChange={e => set('expiresAt', e.target.value)} />
        </div>
        <div className="flex items-center gap-2 col-span-2">
          <Switch checked={form.isActive} onCheckedChange={v => set('isActive', v)} id="active" />
          <Label htmlFor="active">Active</Label>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={loading}>
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function CouponsPage() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState(null); // null | { mode: 'create' | 'edit', coupon? }
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useQuery({ queryKey: ['admin-coupons'], queryFn: getCoupons, staleTime: 30_000 });
  const coupons = data?.data || [];

  function invalidate() { queryClient.invalidateQueries({ queryKey: ['admin-coupons'] }); }

  const createMutation = useMutation({
    mutationFn: createCoupon,
    onSuccess: () => { toast.success('Coupon created'); invalidate(); setDialog(null); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create coupon'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => updateCoupon(id, body),
    onSuccess: () => { toast.success('Coupon updated'); invalidate(); setDialog(null); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update coupon'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCoupon,
    onSuccess: () => { toast.success('Coupon deleted'); invalidate(); setDeleteTarget(null); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete coupon'),
  });

  function handleSave(form) {
    const body = {
      code: form.code,
      type: form.type,
      value: parseFloat(form.value),
      minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : null,
      maxUses: form.maxUses ? parseInt(form.maxUses) : null,
      expiresAt: form.expiresAt || null,
      isActive: form.isActive,
    };
    if (dialog.mode === 'create') {
      createMutation.mutate(body);
    } else {
      updateMutation.mutate({ id: dialog.coupon.id, body });
    }
  }

  const isExpired = (c) => c.expiresAt && new Date(c.expiresAt) < new Date();
  const isExhausted = (c) => c.maxUses != null && c.usedCount >= c.maxUses;

  function statusBadge(c) {
    if (!c.isActive)     return <Badge variant="secondary" className="text-xs">Inactive</Badge>;
    if (isExpired(c))    return <Badge variant="destructive" className="text-xs">Expired</Badge>;
    if (isExhausted(c))  return <Badge variant="destructive" className="text-xs">Exhausted</Badge>;
    return <Badge className="text-xs text-green-600 border-green-300" variant="outline">Active</Badge>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><Tag className="h-5 w-5" /> Coupons</h1>
          <p className="text-sm text-muted-foreground mt-1">{coupons.length} coupon{coupons.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setDialog({ mode: 'create' })}>
          <Plus className="h-4 w-4 mr-1" /> New Coupon
        </Button>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Loading...</CardContent></Card>
      ) : coupons.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Tag className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No coupons yet. Create one to get started.</p>
        </CardContent></Card>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Min Order</TableHead>
                <TableHead>Uses</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-medium text-sm">{c.code}</TableCell>
                  <TableCell className="text-sm font-medium">{formatValue(c)}</TableCell>
                  <TableCell className="text-sm">{c.minOrderAmount ? `$${c.minOrderAmount.toFixed(0)}` : '—'}</TableCell>
                  <TableCell className="text-sm">
                    {c.usedCount}{c.maxUses != null ? ` / ${c.maxUses}` : ''}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(c.expiresAt)}</TableCell>
                  <TableCell>{statusBadge(c)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => setDialog({
                          mode: 'edit', coupon: c,
                          initial: {
                            code: c.code, type: c.type, value: String(c.value),
                            minOrderAmount: c.minOrderAmount ? String(c.minOrderAmount) : '',
                            maxUses: c.maxUses ? String(c.maxUses) : '',
                            expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
                            isActive: c.isActive,
                          },
                        })}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(c)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog?.mode === 'create' ? 'New Coupon' : `Edit ${dialog?.coupon?.code}`}</DialogTitle>
          </DialogHeader>
          {dialog && (
            <CouponForm
              initial={dialog.initial}
              onSave={handleSave}
              onCancel={() => setDialog(null)}
              loading={createMutation.isPending || updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete coupon "{deleteTarget?.code}"?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteTarget.id)}>
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

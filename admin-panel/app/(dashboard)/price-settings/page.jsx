'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPricingSettings, updatePricingSettings, recalculateAllPrices } from '@/lib/services/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { RefreshCw, Save, Infinity } from 'lucide-react';

const DEFAULT = {
  deliveryTiers: [
    { id: 1,  label: 'Parcel XS',        maxWeight: 3,    rate: 22  },
    { id: 2,  label: 'Parcel small',      maxWeight: 7,    rate: 32  },
    { id: 3,  label: 'Parcel medium',     maxWeight: 15,   rate: 45  },
    { id: 4,  label: 'Parcel large',      maxWeight: 30,   rate: 62  },
    { id: 5,  label: 'Parcel oversized',  maxWeight: 50,   rate: 88  },
    { id: 6,  label: 'Parcel heavy+',     maxWeight: 70,   rate: 115 },
    { id: 7,  label: 'LTL light',         maxWeight: 150,  rate: 185 },
    { id: 8,  label: 'LTL standard',      maxWeight: 250,  rate: 310 },
    { id: 9,  label: 'LTL heavy',         maxWeight: 400,  rate: 460 },
    { id: 10, label: 'LTL oversized',     maxWeight: 600,  rate: 620 },
    { id: 11, label: 'LTL max',           maxWeight: null, rate: 750 },
  ],
  whiteGloveTiers: [
    { id: 1, label: 'Simple (no assembly)',              maxWeight: 30,   price: 99  },
    { id: 2, label: 'Basic (chairs, small tables)',      maxWeight: 100,  price: 149 },
    { id: 3, label: 'Standard (sofas, beds, dressers)',  maxWeight: 250,  price: 229 },
    { id: 4, label: 'Complex (sectionals, dining sets)', maxWeight: 500,  price: 329 },
    { id: 5, label: 'Full suite (bedroom/dining room)',  maxWeight: null, price: 449 },
  ],
  marketingPercent: 12,
  marginPercent: 25,
  lastRecalculatedAt: null,
};

function calcDivisor(marketing, margin) {
  return 1 - marketing / 100 - margin / 100;
}

function TierTable({ rows, rateKey, rateLabel, onChange }) {
  function updateRow(id, field, value) {
    onChange(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Label</TableHead>
            <TableHead>Up to (lbs)</TableHead>
            <TableHead className="text-right">{rateLabel}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="text-muted-foreground text-sm">{row.id}</TableCell>
              <TableCell>
                <Input
                  value={row.label}
                  onChange={e => updateRow(row.id, 'label', e.target.value)}
                  className="h-8 text-sm"
                />
              </TableCell>
              <TableCell>
                {row.maxWeight === null ? (
                  <span className="flex items-center gap-1 text-muted-foreground text-sm pl-3">
                    <Infinity className="h-3.5 w-3.5" /> No limit
                  </span>
                ) : (
                  <Input
                    type="number"
                    value={row.maxWeight}
                    onChange={e => updateRow(row.id, 'maxWeight', parseFloat(e.target.value) || 0)}
                    className="h-8 text-sm w-24"
                  />
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <span className="text-muted-foreground text-sm">$</span>
                  <Input
                    type="number"
                    value={row[rateKey]}
                    onChange={e => updateRow(row.id, rateKey, parseFloat(e.target.value) || 0)}
                    className="h-8 text-sm w-24 text-right"
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function PriceSettingsPage() {
  const queryClient = useQueryClient();
  const [dirty, setDirty] = useState(false);
  const [recalcResult, setRecalcResult] = useState(null);

  const { data: saved, isLoading } = useQuery({
    queryKey: ['pricing-settings'],
    queryFn: getPricingSettings,
    staleTime: 60_000,
  });

  const settings = saved || DEFAULT;
  const [deliveryTiers,   setDeliveryTiers]   = useState(null);
  const [whiteGloveTiers, setWhiteGloveTiers] = useState(null);
  const [marketingPct,    setMarketingPct]    = useState(null);
  const [marginPct,       setMarginPct]       = useState(null);
  const [safetyMargin,    setSafetyMargin]    = useState(null);

  const dTiers     = deliveryTiers   ?? settings.deliveryTiers;
  const wTiers     = whiteGloveTiers ?? settings.whiteGloveTiers;
  const mktPct     = marketingPct    ?? settings.marketingPercent;
  const mgnPct     = marginPct       ?? settings.marginPercent;
  const sftyMargin = safetyMargin    ?? settings.stockSafetyMargin ?? 0;
  const divisor = calcDivisor(mktPct, mgnPct);
  const validFormula = divisor > 0 && divisor < 1;

  function markDirty() { setDirty(true); }

  const saveMutation = useMutation({
    mutationFn: () => updatePricingSettings({
      ...settings,
      deliveryTiers: dTiers,
      whiteGloveTiers: wTiers,
      marketingPercent: mktPct,
      marginPercent: mgnPct,
      stockSafetyMargin: sftyMargin,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-settings'] });
      setDirty(false);
      toast.success('Price settings saved');
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const recalcMutation = useMutation({
    mutationFn: recalculateAllPrices,
    onSuccess: (result) => {
      setRecalcResult(result);
      queryClient.invalidateQueries({ queryKey: ['pricing-settings'] });
      toast.success(`Recalculated ${result.updated.toLocaleString()} products`);
    },
    onError: () => toast.error('Recalculation failed'),
  });

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Price Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure delivery costs, white glove upgrade prices, and the auto-pricing formula.
          </p>
        </div>
        <Button
          disabled={!dirty || !validFormula || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* ── Delivery Tiers ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Standard Delivery Cost Tiers</CardTitle>
          <CardDescription>
            Baked into every product price. Based on item weight — capped at 100% of product cost for cheap items.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TierTable
            rows={dTiers}
            rateKey="rate"
            rateLabel="Delivery Cost ($)"
            onChange={v => { setDeliveryTiers(v); markDirty(); }}
          />
          <p className="text-xs text-muted-foreground mt-3">
            Last tier (no limit) catches all items heavier than tier 10.
          </p>
        </CardContent>
      </Card>

      {/* ── White Glove Tiers ──────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>White Glove Upgrade Prices</CardTitle>
          <CardDescription>
            Paid add-on shown at checkout. Price varies by item weight and assembly complexity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TierTable
            rows={wTiers}
            rateKey="price"
            rateLabel="Upgrade Price ($)"
            onChange={v => { setWhiteGloveTiers(v); markDirty(); }}
          />
        </CardContent>
      </Card>

      {/* ── Pricing Formula ────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing Formula</CardTitle>
          <CardDescription>
            Display Price = (Product Cost + Delivery Cost) ÷ (1 − Marketing% − Margin%)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Marketing Cost %</label>
              <p className="text-xs text-muted-foreground">Blended ad spend as % of selling price (Google Shopping, Meta)</p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0} max={50}
                  value={mktPct}
                  onChange={e => { setMarketingPct(parseFloat(e.target.value) || 0); markDirty(); }}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Margin %</label>
              <p className="text-xs text-muted-foreground">Net profit as % of selling price after all costs</p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0} max={80}
                  value={mgnPct}
                  onChange={e => { setMarginPct(parseFloat(e.target.value) || 0); markDirty(); }}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          </div>

          <Separator />

          <div className="bg-muted/50 rounded-lg p-4 space-y-2 font-mono text-sm">
            <p className="text-muted-foreground text-xs font-sans font-medium uppercase tracking-wide mb-3">Formula preview</p>
            <p>Divisor = 1 − {mktPct}% − {mgnPct}% = <strong>{validFormula ? divisor.toFixed(4) : '⚠ invalid'}</strong></p>
            <p>Display Price = (Cost + Delivery) ÷ {validFormula ? divisor.toFixed(4) : '?'}</p>
            <p>Final Price = <strong>max(Display Price, MAP)</strong></p>
            {!validFormula && (
              <p className="text-destructive text-xs font-sans mt-2">Marketing + Margin must be less than 100%</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            {[
              { label: 'Small rug', cost: 21, delivery: 32 },
              { label: 'Mid sofa', cost: 350, delivery: 185 },
              { label: 'Large set', cost: 800, delivery: 460 },
            ].map(ex => {
              const price = validFormula ? ((ex.cost + ex.delivery) / divisor).toFixed(0) : '—';
              return (
                <div key={ex.label} className="border rounded-lg p-3 space-y-1">
                  <p className="font-medium text-xs text-muted-foreground uppercase">{ex.label}</p>
                  <p className="text-xs">Cost ${ex.cost} + Delivery ${ex.delivery}</p>
                  <p className="text-lg font-semibold">${price}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Stock Safety Margin ────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Safety Margin</CardTitle>
          <CardDescription>
            Units subtracted from the vendor&apos;s available stock before showing to customers. Prevents overselling when vendor numbers are delayed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Safety Margin (units)</label>
            <p className="text-xs text-muted-foreground">
              My Stock shown to customers = Vendor Stock − Safety Margin (minimum 0). Per-listing overrides in the listing editor take precedence.
            </p>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                step={1}
                value={sftyMargin}
                onChange={e => { setSafetyMargin(Math.max(0, parseInt(e.target.value) || 0)); markDirty(); }}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">units</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Recalculate ────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Apply to All Products</CardTitle>
          <CardDescription>
            Recalculates and saves the display price on every storefront listing using the current settings.
            Uses <strong>max(formula price, MAP)</strong> for each product.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {dirty && (
            <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2">
              You have unsaved changes. Save settings before recalculating.
            </div>
          )}
          {settings.lastRecalculatedAt && (
            <p className="text-sm text-muted-foreground">
              Last recalculated: {new Date(settings.lastRecalculatedAt).toLocaleString()}
            </p>
          )}
          {recalcResult && (
            <div className="flex gap-4 text-sm">
              <Badge variant="outline" className="text-green-600 border-green-300">
                {recalcResult.updated.toLocaleString()} updated
              </Badge>
              <Badge variant="outline" className="text-muted-foreground">
                {recalcResult.skipped} skipped (no cost/weight data)
              </Badge>
            </div>
          )}
          <Button
            variant="outline"
            disabled={dirty || recalcMutation.isPending}
            onClick={() => recalcMutation.mutate()}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${recalcMutation.isPending ? 'animate-spin' : ''}`} />
            {recalcMutation.isPending ? 'Recalculating...' : 'Recalculate All Product Prices'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Cloud, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { lookupZip, preloadZoneMap } from '@/lib/zip-zones';
import { calculateRates, preloadRateSheet } from '@/lib/rate-sheet';
import { isRemoteZip, preloadRemoteTable } from '@/lib/remote-zones';
import { isUncoveredZip, preloadUncoveredAreas } from '@/lib/uncovered-areas';
import { getFuelSurchargeRate, getFuelFee } from '@/lib/fuel-surcharge';

// ─── Surcharge helpers ────────────────────────────────────────────────────

const QUOTE = 'QUOTE';

function getOverWeightFee(weight) {
  if (!weight || weight <= 300) return 0;
  if (weight <= 400) return 110;
  if (weight <= 500) return 235;
  if (weight <= 600) return 285;
  if (weight <= 700) return 335;
  return QUOTE;
}

function getOverLengthFee(length) {
  if (!length || length <= 100) return 0;
  if (length <= 125) return 110;
  return QUOTE;
}

function fmtMoney(val) {
  if (val === null || val === undefined) return '—';
  if (val === QUOTE) return 'Contact for Quote';
  return `$${Number(val).toFixed(2)}`;
}

// ─── Default state ────────────────────────────────────────────────────────

const defaultInputs = {
  order_id:           '',
  origin_region:      '',
  destination_region: '',
  data_volume_gb:     '',
  compute_units:      '',
  latency_max_ms:     '',
};

const defaultDerived = {
  origin_state:     '',
  origin_zone:      '',
  destination_state:'',
  destination_zone: '',
  over_weight_fee:  null,
  over_length_fee:  null,
  remote_fee:       null,
};

const defaultExtras = {
  fuel_price:       '',
  storage_days:     '',
  waiting_periods:  '',
  stair_pieces:     '',
  stair_floors:     '',
  assembly_periods: '',
  std_coi:          false,
  add_coi:          false,
};

const defaultBaseRates = { threshold: null, roomOfChoice: null, whiteGlove: null };

// ─── Component ────────────────────────────────────────────────────────────

export default function GigigaCalculatorPage() {
  const [inputs,      setInputs]      = useState(defaultInputs);
  const [derived,     setDerived]     = useState(defaultDerived);
  const [extras,      setExtras]      = useState(defaultExtras);
  const [baseRates,   setBaseRates]   = useState(defaultBaseRates);
  const [isUncovered, setIsUncovered] = useState(false);

  useEffect(() => {
    preloadZoneMap();
    preloadRateSheet();
    preloadRemoteTable();
    preloadUncoveredAreas();
  }, []);

  const recompute = useCallback(async (next) => {
    const [originResult, destResult, destRemote, destUncovered] = await Promise.all([
      lookupZip(next.origin_region),
      lookupZip(next.destination_region),
      isRemoteZip(next.destination_region),
      isUncoveredZip(next.destination_region),
    ]);

    setIsUncovered(destUncovered);

    const weight = parseFloat(next.compute_units)  || 0;
    const length = parseFloat(next.latency_max_ms) || 0;
    const cubes  = parseFloat(next.data_volume_gb) || 0;
    const originZone = originResult?.zone ?? '';
    const destZone   = destResult?.zone   ?? '';

    setDerived({
      origin_state:     originResult?.state ?? '',
      origin_zone:      originZone,
      destination_state:destResult?.state   ?? '',
      destination_zone: destZone,
      over_weight_fee:  weight > 0 ? getOverWeightFee(weight) : null,
      over_length_fee:  length > 0 ? getOverLengthFee(length) : null,
      remote_fee:       next.destination_region.length === 5 ? (destRemote ? 110 : 0) : null,
    });

    if (!destUncovered && originZone && destZone && cubes > 0) {
      const rates = await calculateRates(originZone, destZone, cubes);
      setBaseRates(rates);
    } else {
      setBaseRates(defaultBaseRates);
    }
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    const next = { ...inputs, [name]: value };
    setInputs(next);
    recompute(next);
  }

  function handleExtras(e) {
    const { name, value } = e.target;
    setExtras(prev => ({ ...prev, [name]: value }));
  }

  // ─── Computed surcharges ──────────────────────────────────────────────

  const surcharges = useMemo(() => {
    const cubes       = parseFloat(inputs.data_volume_gb) || 0;
    const days        = parseInt(extras.storage_days)     || 0;
    const storageFee  = days > 15 ? Math.max(15, (days - 15) * cubes * 0.1) : 0;
    const waitingFee  = (parseInt(extras.waiting_periods)  || 0) * 30;
    const stairFee    = (parseInt(extras.stair_pieces)     || 0) * (parseInt(extras.stair_floors) || 0) * 12;
    const totalMins   = parseInt(extras.assembly_periods) || 0;
    const assemblyFee = totalMins <= 20 ? 0 : Math.floor((totalMins - 20) / 20) * 30;
    const coiFee      = (extras.std_coi ? 15 : 0) + (extras.add_coi ? 25 : 0);
    return { storageFee, waitingFee, stairFee, assemblyFee, coiFee };
  }, [extras, inputs.data_volume_gb]);

  // ─── Fuel surcharge (per-tier since it's % of base rate) ─────────────

  const fuelData = useMemo(() => {
    const price = parseFloat(extras.fuel_price);
    if (!price) return { rate: null, fees: { threshold: null, roomOfChoice: null, whiteGlove: null } };
    const rate = getFuelSurchargeRate(price);
    return {
      rate,
      fees: {
        threshold:    getFuelFee(baseRates.threshold,    price),
        roomOfChoice: getFuelFee(baseRates.roomOfChoice, price),
        whiteGlove:   getFuelFee(baseRates.whiteGlove,   price),
      },
    };
  }, [extras.fuel_price, baseRates]);

  // ─── Final totals ─────────────────────────────────────────────────────

  const totals = useMemo(() => {
    const { over_weight_fee, over_length_fee, remote_fee } = derived;
    const { storageFee, waitingFee, stairFee, assemblyFee, coiFee } = surcharges;

    const needsQuote = over_weight_fee === QUOTE || over_length_fee === QUOTE;
    const autoNum =
      (typeof over_weight_fee === 'number' ? over_weight_fee : 0) +
      (typeof over_length_fee === 'number' ? over_length_fee : 0) +
      (remote_fee ?? 0);
    const manualCommon = storageFee + waitingFee + stairFee + coiFee;

    function calc(base, fuelFee, includeAssembly = false) {
      if (base === null) return null;
      if (needsQuote) return QUOTE;
      return base + autoNum + manualCommon + (includeAssembly ? assemblyFee : 0) + (fuelFee ?? 0);
    }

    return {
      threshold:    calc(baseRates.threshold,    fuelData.fees.threshold),
      roomOfChoice: calc(baseRates.roomOfChoice, fuelData.fees.roomOfChoice),
      whiteGlove:   calc(baseRates.whiteGlove,   fuelData.fees.whiteGlove,   true),
    };
  }, [derived, baseRates, surcharges, fuelData]);

  // ─── UI helpers ───────────────────────────────────────────────────────

  function InfoCell({ value }) {
    return (
      <div className="h-10 px-3 py-2 rounded-md border bg-muted text-sm flex items-center text-muted-foreground font-medium">
        {value || '—'}
      </div>
    );
  }

  function FeeCell({ fee }) {
    const colour =
      fee === QUOTE ? 'text-destructive' :
      fee > 0       ? 'text-orange-600'  :
      'text-muted-foreground';
    return (
      <div className={`h-10 px-3 py-2 rounded-md border bg-muted text-sm flex items-center font-medium ${colour}`}>
        {fee === null ? '—' : fee === QUOTE ? 'Will be Quoted' : fee === 0 ? '$0' : `+$${fee.toFixed(2)}`}
      </div>
    );
  }

  function OutCell({ value, bold = false }) {
    const isQuote = value === QUOTE;
    return (
      <div className={`h-10 px-3 py-2 rounded-md border bg-muted text-sm flex items-center
        ${bold ? 'font-bold text-base' : 'font-medium'}
        ${isQuote ? 'text-destructive' : value !== null ? 'text-foreground' : 'text-muted-foreground'}`}>
        {fmtMoney(value)}
      </div>
    );
  }

  function DashCell() {
    return (
      <div className="h-10 px-3 py-2 rounded-md border bg-muted text-sm flex items-center text-muted-foreground">—</div>
    );
  }

  // Output breakdown rows — only rendered when relevant
  const autoRows = [
    { label: 'Over Weight', th: derived.over_weight_fee, roc: derived.over_weight_fee, wg: derived.over_weight_fee },
    { label: 'Over Size',   th: derived.over_length_fee, roc: derived.over_length_fee, wg: derived.over_length_fee },
    { label: 'Remote Area', th: derived.remote_fee,      roc: derived.remote_fee,      wg: derived.remote_fee      },
  ].filter(r => r.th !== null && r.th !== 0);

  const manualRows = [
    { label: 'Storage',        th: surcharges.storageFee,  roc: surcharges.storageFee,  wg: surcharges.storageFee,  },
    { label: 'Waiting Time',   th: surcharges.waitingFee,  roc: surcharges.waitingFee,  wg: surcharges.waitingFee,  },
    { label: 'Stair Carry',    th: surcharges.stairFee,    roc: surcharges.stairFee,    wg: surcharges.stairFee,    },
    { label: 'Assembly (WG)',  th: null,                   roc: null,                   wg: surcharges.assemblyFee, },
    { label: 'COI',            th: surcharges.coiFee,      roc: surcharges.coiFee,      wg: surcharges.coiFee,      },
  ].filter(r => (r.th ?? 0) + (r.roc ?? 0) + (r.wg ?? 0) > 0);

  const hasFuel = fuelData.fees.threshold !== null;

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex items-center gap-3">
        <Cloud className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Gigiga Cloud Calculator</h1>
          <p className="text-sm text-muted-foreground">Enter shipment details to calculate service tier costs</p>
        </div>
      </div>

      {/* ── Uncovered area warning ──────────────────────────────────────── */}
      {isUncovered && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-destructive">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Area Not Serviced</p>
            <p className="text-sm mt-0.5">
              The destination zip code <strong>{inputs.destination_region}</strong> is in an uncovered area.
              Gigiga Cloud does not deliver to this location.
            </p>
          </div>
        </div>
      )}

      {/* ── Inputs ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Inputs</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="order_id">Order ID</Label>
            <Input id="order_id" name="order_id" placeholder="e.g. Sample1" value={inputs.order_id} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="origin_region">Origin Zip (Pickup)</Label>
            <Input id="origin_region" name="origin_region" placeholder="e.g. 30336" maxLength={5} value={inputs.origin_region} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="destination_region">Destination Zip (Ship To)</Label>
            <Input
              id="destination_region"
              name="destination_region"
              placeholder="e.g. 94102"
              maxLength={5}
              value={inputs.destination_region}
              onChange={handleChange}
              className={isUncovered ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="data_volume_gb">Cubes (cu ft) <span className="text-xs text-muted-foreground">W×L×H / 1728, summed</span></Label>
            <Input id="data_volume_gb" name="data_volume_gb" type="number" placeholder="e.g. 23.61" value={inputs.data_volume_gb} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="compute_units">Weight (lbs) <span className="text-xs text-muted-foreground">Heaviest single box</span></Label>
            <Input id="compute_units" name="compute_units" type="number" placeholder="e.g. 550" value={inputs.compute_units} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="latency_max_ms">Length Max (in) <span className="text-xs text-muted-foreground">Longest side of any box</span></Label>
            <Input id="latency_max_ms" name="latency_max_ms" type="number" placeholder="e.g. 40.2" value={inputs.latency_max_ms} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="fuel_price">
                Fuel Price ($/gal) <span className="text-xs text-muted-foreground">updated every Monday</span>
              </Label>
              <a
                href="https://www.eia.gov/petroleum/gasdiesel"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary underline underline-offset-2 hover:opacity-75"
              >
                EIA National Avg →
              </a>
            </div>
            <Input id="fuel_price" name="fuel_price" type="number" step="0.01" placeholder="e.g. 3.85" value={extras.fuel_price} onChange={handleExtras} />
          </div>
        </CardContent>
      </Card>

      {/* ── Auto-Generated Fields ───────────────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Auto-Generated Fields</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-4 gap-6">
          <div className="space-y-2"><Label>Origin State</Label><InfoCell value={derived.origin_state} /></div>
          <div className="space-y-2"><Label>Origin Zone</Label><InfoCell value={derived.origin_zone} /></div>
          <div className="space-y-2"><Label>Destination State</Label><InfoCell value={derived.destination_state} /></div>
          <div className="space-y-2"><Label>Destination Zone</Label><InfoCell value={derived.destination_zone} /></div>
          <div className="space-y-2"><Label>Over Weight Surcharge</Label><FeeCell fee={derived.over_weight_fee} /></div>
          <div className="space-y-2"><Label>Over Size Surcharge</Label><FeeCell fee={derived.over_length_fee} /></div>
          <div className="space-y-2"><Label>Remote Surcharge</Label><FeeCell fee={derived.remote_fee} /></div>
          <div className="space-y-2">
            <Label>Fuel Surcharge Rate</Label>
            <InfoCell value={fuelData.rate !== null ? `${fuelData.rate.toFixed(1)}%` : ''} />
          </div>
        </CardContent>
      </Card>

      {/* ── Extras ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Extras</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-6">

            {/* Storage */}
            <div className="space-y-2">
              <Label htmlFor="storage_days">
                Storage Days <span className="text-xs text-muted-foreground">(15 free, then $0.10/cube/day, min $15)</span>
              </Label>
              <Input id="storage_days" name="storage_days" type="number" min="0" placeholder="0" value={extras.storage_days} onChange={handleExtras} />
              {surcharges.storageFee > 0 && <p className="text-xs text-orange-600">+${surcharges.storageFee.toFixed(2)}</p>}
            </div>

            {/* Waiting */}
            <div className="space-y-2">
              <Label htmlFor="waiting_periods">
                Waiting Periods <span className="text-xs text-muted-foreground">(after 15 min free, $30 / 15 min)</span>
              </Label>
              <Input id="waiting_periods" name="waiting_periods" type="number" min="0" placeholder="0" value={extras.waiting_periods} onChange={handleExtras} />
              {surcharges.waitingFee > 0 && <p className="text-xs text-orange-600">+${surcharges.waitingFee.toFixed(2)}</p>}
            </div>

            {/* Assembly */}
            <div className="space-y-2">
              <Label htmlFor="assembly_periods">
                Assembly Time (minutes) <span className="text-xs text-muted-foreground">(first 20 min free, then $30 / 20 min — WG only)</span>
              </Label>
              <Input id="assembly_periods" name="assembly_periods" type="number" min="0" placeholder="0" value={extras.assembly_periods} onChange={handleExtras} />
              {surcharges.assemblyFee > 0 && <p className="text-xs text-orange-600">+${surcharges.assemblyFee.toFixed(2)} (WG only)</p>}
            </div>

            {/* Stair carry */}
            <div className="space-y-2">
              <Label htmlFor="stair_pieces">
                Stair Carry — Pieces <span className="text-xs text-muted-foreground">($12 per piece per floor)</span>
              </Label>
              <Input id="stair_pieces" name="stair_pieces" type="number" min="0" placeholder="0" value={extras.stair_pieces} onChange={handleExtras} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stair_floors">Stair Carry — Floors</Label>
              <Input id="stair_floors" name="stair_floors" type="number" min="0" placeholder="0" value={extras.stair_floors} onChange={handleExtras} />
              {surcharges.stairFee > 0 && <p className="text-xs text-orange-600">+${surcharges.stairFee.toFixed(2)}</p>}
            </div>
          </div>

          {/* COI toggles */}
          <div className="flex gap-10 pt-2 border-t">
            <div className="flex items-center gap-3 pt-4">
              <Switch id="std_coi" checked={extras.std_coi} onCheckedChange={(v) => setExtras(p => ({ ...p, std_coi: v }))} />
              <Label htmlFor="std_coi">Standard COI <span className="text-muted-foreground text-xs ml-1">$15 per issuance</span></Label>
            </div>
            <div className="flex items-center gap-3 pt-4">
              <Switch id="add_coi" checked={extras.add_coi} onCheckedChange={(v) => setExtras(p => ({ ...p, add_coi: v }))} />
              <Label htmlFor="add_coi">Additional Coverage COI <span className="text-muted-foreground text-xs ml-1">$25 per issuance</span></Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Outputs ─────────────────────────────────────────────────────── */}
      {!isUncovered && (
        <>
          <Separator />
          <Card>
            <CardHeader><CardTitle className="text-base">Outputs</CardTitle></CardHeader>
            <CardContent className="space-y-1">

              {/* Column headers */}
              <div className="grid grid-cols-4 gap-4 px-1 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <span>Line Item</span>
                <span>Threshold</span>
                <span>Room of Choice</span>
                <span>White Glove</span>
              </div>

              {/* Base rate */}
              <div className="grid grid-cols-4 gap-4 items-center py-1">
                <span className="text-sm text-muted-foreground">Base Rate</span>
                <OutCell value={baseRates.threshold} />
                <OutCell value={baseRates.roomOfChoice} />
                <OutCell value={baseRates.whiteGlove} />
              </div>

              {/* Fuel surcharge — different per tier */}
              {hasFuel && (
                <div className="grid grid-cols-4 gap-4 items-center py-1">
                  <span className="text-sm text-muted-foreground">
                    Fuel ({fuelData.rate?.toFixed(1)}%)
                  </span>
                  <OutCell value={fuelData.fees.threshold} />
                  <OutCell value={fuelData.fees.roomOfChoice} />
                  <OutCell value={fuelData.fees.whiteGlove} />
                </div>
              )}

              {/* Auto surcharges */}
              {autoRows.map(({ label, th, roc, wg }) => (
                <div key={label} className="grid grid-cols-4 gap-4 items-center py-1">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <OutCell value={th} />
                  <OutCell value={roc} />
                  <OutCell value={wg} />
                </div>
              ))}

              {/* Manual surcharges */}
              {manualRows.map(({ label, th, roc, wg }) => (
                <div key={label} className="grid grid-cols-4 gap-4 items-center py-1">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  {th !== null ? <OutCell value={th} /> : <DashCell />}
                  {roc !== null ? <OutCell value={roc} /> : <DashCell />}
                  {wg !== null ? <OutCell value={wg} /> : <DashCell />}
                </div>
              ))}

              {/* Total */}
              <div className="grid grid-cols-4 gap-4 items-center py-3 mt-2 rounded-lg bg-primary/10 border border-primary/20 px-2">
                <span className="font-semibold text-base">Total</span>
                <OutCell value={totals.threshold}    bold />
                <OutCell value={totals.roomOfChoice} bold />
                <OutCell value={totals.whiteGlove}   bold />
              </div>

            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getVendorImportStatus,
  getVendorImportLogs,
  importAcme,
  refreshAcme,
  importGlobalFurniture,
  clearGlobalFurnitureProducts,
  importUnitedWeavers,
  triggerGfwDropboxSync,
  resetGfwDropboxSync,
  triggerUwImageSync,
  getUwPendingImages,
  migrateUwProductImages,
  getUwPendingCompress,
  compressUwProductImages,
} from '@/lib/services/vendorImport';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Upload, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString();
}

function typeLabel(type) {
  switch (type) {
    case 'FULL_SYNC':     return 'Full Import';
    case 'PRICE_REFRESH': return 'Price/Stock Refresh';
    case 'DROPBOX_SYNC':  return 'Dropbox Image Sync';
    default: return type;
  }
}

function sourceLabel(source) {
  if (source === 'GFW') return 'Global Furniture';
  if (source === 'UW') return 'United Weavers';
  return source;
}

// ─── File picker row ────────────────────────────────────────────

function FileField({ id, label, file, onChange, accept = '.csv,.xlsx,.xls' }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="file"
        accept={accept}
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
      {file && <p className="text-xs text-muted-foreground">{file.name}</p>}
    </div>
  );
}

export default function VendorImportPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [logSource, setLogSource] = useState(null); // null = all

  // ACME full import
  const [acmeSpec, setAcmeSpec] = useState(null);
  const [acmeImages, setAcmeImages] = useState(null);
  const [acmePrice, setAcmePrice] = useState(null);
  const [acmeInventory, setAcmeInventory] = useState(null);

  // ACME refresh
  const [refreshPrice, setRefreshPrice] = useState(null);
  const [refreshInventory, setRefreshInventory] = useState(null);

  // GFW import
  const [gfwData, setGfwData] = useState(null);
  const [gfwInventory, setGfwInventory] = useState(null);

  // UW import
  const [uwCatalog, setUwCatalog] = useState(null);
  const [uwInventory, setUwInventory] = useState(null);

  // UW 3-step pipeline state
  const [uwStep, setUwStep] = useState(0);      // 0=idle 1=uploading 2=migrating 3=compressing 4=done
  const [uwDone, setUwDone] = useState(0);
  const [uwTotal, setUwTotal] = useState(0);
  const [uwCurrent, setUwCurrent] = useState('');
  const [uwErrors, setUwErrors] = useState(0);
  const stopRef = useRef(false);

  const { data: pendingRes, refetch: refetchPending } = useQuery({
    queryKey: ['uw-pending-images'],
    queryFn: getUwPendingImages,
    refetchOnWindowFocus: false,
  });

  async function runLoop(fetchFn, processFn) {
    const res = await fetchFn();
    const products = res.products || [];
    setUwTotal(products.length);
    setUwDone(0);
    if (!products.length) return;

    for (let i = 0; i < products.length; i++) {
      if (stopRef.current) return;
      setUwCurrent(products[i].name);
      try {
        await processFn(products[i].id);
      } catch {
        setUwErrors(e => e + 1);
      }
      setUwDone(i + 1);
    }
  }

  async function handleUwImport() {
    stopRef.current = false;
    setUwErrors(0);
    setUwCurrent('');
    setUwStep(1);

    try {
      // Trigger CSV upload (server responds immediately, runs import in background)
      await uwImportMutation.mutateAsync();

      // Poll until the background import finishes (max ~15 min)
      setUwCurrent('Importing products to database…');
      for (let i = 0; i < 300 && !stopRef.current; i++) {
        const res = await getVendorImportStatus();
        if (!res?.data?.running) break;
        await new Promise(r => setTimeout(r, 3000));
      }
      if (stopRef.current) { setUwStep(0); return; }

      // Step 2 — Migrate Dropbox → S3 JPEG
      setUwStep(2);
      await runLoop(getUwPendingImages, migrateUwProductImages);
      if (stopRef.current) { setUwStep(0); return; }

      // Step 3 — Compress JPEG → WebP
      setUwStep(3);
      await runLoop(getUwPendingCompress, compressUwProductImages);

      setUwStep(4);
      setUwCurrent('');
      refetchPending();
    } catch {
      setUwStep(0);
    }
  }

  async function runImagePipelineOnly() {
    stopRef.current = false;
    setUwErrors(0);
    setUwCurrent('');
    setUwStep(2);

    try {
      await runLoop(getUwPendingImages, migrateUwProductImages);
      if (stopRef.current) { setUwStep(0); return; }
      setUwStep(3);
      await runLoop(getUwPendingCompress, compressUwProductImages);
      setUwStep(4);
      setUwCurrent('');
      refetchPending();
    } catch {
      setUwStep(0);
    }
  }

  const { data: statusRes } = useQuery({
    queryKey: ['vendor-import-status'],
    queryFn: getVendorImportStatus,
    refetchInterval: (query) => {
      const d = query.state.data?.data;
      return (d?.running || d?.dropboxSync?.running || d?.uwImageSync?.running) ? 2000 : 10000;
    },
  });

  const { data: logsRes, isLoading: logsLoading } = useQuery({
    queryKey: ['vendor-import-logs', page, logSource],
    queryFn: () => getVendorImportLogs({ page, limit: 15, ...(logSource ? { source: logSource } : {}) }),
  });

  const status = statusRes?.data;
  const isRunning = status?.running;
  const dropbox = status?.dropboxSync;
  const uwSync = status?.uwImageSync;
  const logs = logsRes?.data || [];
  const pagination = logsRes?.pagination;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['vendor-import-status'] });
    queryClient.invalidateQueries({ queryKey: ['vendor-import-logs'] });
  }

  const uwImageSyncMutation = useMutation({
    mutationFn: triggerUwImageSync,
    onSuccess: () => { toast.success('UV image sync started'); invalidate(); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to start UV image sync'),
  });

  const dropboxResetMutation = useMutation({
    mutationFn: resetGfwDropboxSync,
    onSuccess: (data) => { toast.success(data.message || 'Dropbox sync reset'); invalidate(); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to reset Dropbox sync'),
  });

  const acmeImportMutation = useMutation({
    mutationFn: () => importAcme({ specCsv: acmeSpec, imagesCsv: acmeImages, priceCsv: acmePrice, inventoryCsv: acmeInventory }),
    onSuccess: (data) => {
      toast.success(data.message || 'ACME import started');
      setAcmeSpec(null); setAcmeImages(null); setAcmePrice(null); setAcmeInventory(null);
      invalidate();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to start ACME import'),
  });

  const acmeRefreshMutation = useMutation({
    mutationFn: () => refreshAcme({ priceCsv: refreshPrice, inventoryCsv: refreshInventory }),
    onSuccess: (data) => {
      toast.success(data.message || 'ACME refresh started');
      setRefreshPrice(null); setRefreshInventory(null);
      invalidate();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to start ACME refresh'),
  });

  const gfwImportMutation = useMutation({
    mutationFn: () => importGlobalFurniture({ dataCsv: gfwData, inventoryCsv: gfwInventory }),
    onSuccess: (data) => {
      toast.success(data.message || 'Global Furniture import started');
      setGfwData(null);
      setGfwInventory(null);
      invalidate();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to start Global Furniture import'),
  });

  const gfwClearMutation = useMutation({
    mutationFn: clearGlobalFurnitureProducts,
    onSuccess: (data) => toast.success(data.message || 'GFW products cleared'),
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to clear GFW products'),
  });

  const dropboxSyncMutation = useMutation({
    mutationFn: triggerGfwDropboxSync,
    onSuccess: () => { toast.success('Dropbox sync started'); invalidate(); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to start Dropbox sync'),
  });

  const uwImportMutation = useMutation({
    mutationFn: () => importUnitedWeavers({ catalogCsv: uwCatalog, inventoryCsv: uwInventory }),
    onSuccess: (data) => {
      toast.success(data.message || 'United Weavers import started');
      setUwCatalog(null); setUwInventory(null);
      invalidate();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to start United Weavers import'),
  });

  const acmeImportDisabled = isRunning || acmeImportMutation.isPending || !acmeSpec || !acmeImages || !acmePrice || !acmeInventory;
  const acmeRefreshDisabled = isRunning || acmeRefreshMutation.isPending || !refreshPrice || !refreshInventory;
  const gfwImportDisabled = isRunning || gfwImportMutation.isPending || !gfwData || !gfwInventory;
  const uwPipelineRunning = uwStep > 0 && uwStep < 4;
  const uwImportDisabled = isRunning || uwImportMutation.isPending || !uwCatalog || !uwInventory || uwPipelineRunning;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Vendor Import</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload ACME, Global Furniture, or United Weavers catalog spreadsheets to create or update products.
          Imports run in the background and migrate images to S3, which can take a while for large catalogs.
        </p>
      </div>

      {/* Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Import Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isRunning ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="font-semibold text-blue-600">Running</span>
                </div>
                <p className="text-xs text-muted-foreground">{status?.type} — {status?.progress}</p>
                <p className="text-xs text-muted-foreground">Started: {formatDate(status?.startedAt)}</p>
              </div>
            ) : (
              <span className="font-semibold text-green-600">Idle</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dropbox Image Sync</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dropbox?.running ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="font-semibold text-blue-600">Syncing</span>
                </div>
                <p className="text-xs text-muted-foreground">{dropbox.progress}</p>
                <p className="text-xs text-muted-foreground">Started: {formatDate(dropbox.startedAt)}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(() => {
                  const isError = /error|failed/i.test(dropbox?.progress || '');
                  return (
                    <>
                      <p className={`font-semibold text-sm ${isError ? 'text-red-600' : 'text-green-600'}`}>
                        {dropbox?.lastRun ? (isError ? 'Error' : 'Idle') : 'Not run yet'}
                      </p>
                      {dropbox?.lastRun && (
                        <p className="text-xs text-muted-foreground">Last run: {formatDate(dropbox.lastRun)}</p>
                      )}
                      {dropbox?.progress && (
                        <p className={`text-xs ${isError ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {dropbox.progress}
                        </p>
                      )}
                      {dropbox?.lastResult && (
                        <p className="text-xs text-muted-foreground">
                          {dropbox.lastResult.synced ?? 0} updated · {dropbox.lastResult.skipped ?? 0} already synced · {dropbox.lastResult.total ?? 0} total
                        </p>
                      )}
                    </>
                  );
                })()}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={dropbox?.running || dropboxSyncMutation.isPending || isRunning}
                    onClick={() => dropboxSyncMutation.mutate()}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    {dropboxSyncMutation.isPending ? 'Starting...' : 'Sync Now'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground"
                    disabled={dropbox?.running || dropboxResetMutation.isPending || isRunning}
                    onClick={() => {
                      if (confirm('This clears the dropboxSynced flag on all GFW products so the next sync re-downloads all assets. Continue?')) {
                        dropboxResetMutation.mutate();
                      }
                    }}
                  >
                    {dropboxResetMutation.isPending ? 'Resetting...' : 'Reset & Re-sync'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* UV Image Sync */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">UV Image Sync (S3)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {uwSync?.running ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="font-semibold text-blue-600">Syncing</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {uwSync.done} / {uwSync.total} products migrated
                </p>
                {uwSync.total > 0 && (
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.round((uwSync.done / uwSync.total) * 100)}%` }}
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Started: {formatDate(uwSync.startedAt)}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className={`font-semibold text-sm ${uwSync?.lastRun ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {uwSync?.lastRun ? 'Idle' : 'Not run yet'}
                </p>
                {uwSync?.lastRun && (
                  <p className="text-xs text-muted-foreground">Last run: {formatDate(uwSync.lastRun)}</p>
                )}
                {uwSync?.lastResult && (
                  <p className="text-xs text-muted-foreground">
                    {uwSync.lastResult.migrated} / {uwSync.lastResult.total} migrated to S3
                  </p>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={uwSync?.running || uwImageSyncMutation.isPending}
                  onClick={() => uwImageSyncMutation.mutate()}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  {uwImageSyncMutation.isPending ? 'Starting...' : 'Sync Images Now'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Imports</CardTitle>
          </CardHeader>
          <CardContent>
            {status?.lastSyncs?.length ? (
              <div className="space-y-1.5">
                {status.lastSyncs.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span>
                      <Badge variant="outline" className="mr-1.5 text-xs">{sourceLabel(s.source)}</Badge>
                      {typeLabel(s.type)}
                    </span>
                    <span className="text-muted-foreground">{formatDate(s.completedAt)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">No imports yet</span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upload forms */}
      <Tabs defaultValue="acme-import">
        <TabsList>
          <TabsTrigger value="acme-import">ACME — Full Import</TabsTrigger>
          <TabsTrigger value="acme-refresh">ACME — Price/Stock Refresh</TabsTrigger>
          <TabsTrigger value="gfw-import">Global Furniture — Import</TabsTrigger>
          <TabsTrigger value="uw-import">United Weavers — Import</TabsTrigger>
        </TabsList>

        <TabsContent value="acme-import">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ACME Full Catalog Import</CardTitle>
              <p className="text-sm text-muted-foreground">
                Upload all 4 ACME sheets. Creates new products and updates existing ones (matched by SKU).
                Rows marked "Disabled" are skipped.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FileField id="acme-spec" label="Spec sheet" file={acmeSpec} onChange={setAcmeSpec} />
                <FileField id="acme-images" label="Image links" file={acmeImages} onChange={setAcmeImages} />
                <FileField id="acme-price" label="Price sheet" file={acmePrice} onChange={setAcmePrice} />
                <FileField id="acme-inventory" label="Live inventory" file={acmeInventory} onChange={setAcmeInventory} />
              </div>
              <Button onClick={() => acmeImportMutation.mutate()} disabled={acmeImportDisabled}>
                <Upload className="h-4 w-4 mr-1" />
                {acmeImportMutation.isPending ? 'Starting...' : 'Start Import'}
              </Button>
              {isRunning && (
                <p className="text-xs text-muted-foreground">An import is already running — wait for it to finish.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="acme-refresh">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ACME Price &amp; Stock Refresh</CardTitle>
              <p className="text-sm text-muted-foreground">
                Upload just the price and inventory sheets to update cost and stock on existing ACME products.
                Does not create new products — SKUs not already imported are skipped.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FileField id="refresh-price" label="Price sheet" file={refreshPrice} onChange={setRefreshPrice} />
                <FileField id="refresh-inventory" label="Live inventory" file={refreshInventory} onChange={setRefreshInventory} />
              </div>
              <Button onClick={() => acmeRefreshMutation.mutate()} disabled={acmeRefreshDisabled}>
                <RefreshCw className="h-4 w-4 mr-1" />
                {acmeRefreshMutation.isPending ? 'Starting...' : 'Start Refresh'}
              </Button>
              {isRunning && (
                <p className="text-xs text-muted-foreground">An import is already running — wait for it to finish.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gfw-import">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Global Furniture Catalog Import</CardTitle>
              <p className="text-sm text-muted-foreground">
                Upload the Product Data Sheet and the Search Results export. WHS price and stock quantities are pulled from the Search Results file. Creates new products and updates existing ones (matched by Internal ID).
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FileField id="gfw-data" label="Product Data Sheet" file={gfwData} onChange={setGfwData} />
                <FileField id="gfw-inventory" label="Search Results (inventory)" file={gfwInventory} onChange={setGfwInventory} />
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={() => gfwImportMutation.mutate()} disabled={gfwImportDisabled}>
                  <Upload className="h-4 w-4 mr-1" />
                  {gfwImportMutation.isPending ? 'Starting...' : 'Start Import'}
                </Button>
                <Button
                  variant="destructive"
                  disabled={isRunning || gfwClearMutation.isPending}
                  onClick={() => {
                    if (confirm('This will permanently delete all Global Furniture products, variants, and storefront listings. Continue?')) {
                      gfwClearMutation.mutate();
                    }
                  }}
                >
                  {gfwClearMutation.isPending ? 'Clearing...' : 'Clear All GFW Products'}
                </Button>
              </div>
              {isRunning && (
                <p className="text-xs text-muted-foreground">An import is already running — wait for it to finish.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="uw-import">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">United Weavers — Catalog Import</CardTitle>
              <p className="text-sm text-muted-foreground">
                Upload the MasterFile and Inventory CSV. Once uploaded, the pipeline automatically migrates images from Dropbox to S3, then compresses them to WebP.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* File pickers + start button — shown when idle or done */}
              {(uwStep === 0 || uwStep === 4) && (
                <div className="space-y-4">
                  {uwStep === 4 && (
                    <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <p className="text-sm font-medium text-green-700 dark:text-green-300">
                        Pipeline complete — all 3 steps finished.
                        {uwErrors > 0 && <span className="text-red-500 ml-2">({uwErrors} error{uwErrors > 1 ? 's' : ''})</span>}
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FileField id="uw-catalog" label="Catalog (MasterFile)" file={uwCatalog} onChange={setUwCatalog} />
                    <FileField id="uw-inventory" label="Inventory file" file={uwInventory} onChange={setUwInventory} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleUwImport} disabled={uwImportDisabled}>
                      <Upload className="h-4 w-4 mr-1" />
                      {uwStep === 4 ? 'Import Another Catalog' : 'Start Import'}
                    </Button>
                    {pendingRes?.pending > 0 && uwStep === 0 && (
                      <Button variant="outline" onClick={runImagePipelineOnly} disabled={uwPipelineRunning}>
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Migrate Images Only ({pendingRes.pending} pending)
                      </Button>
                    )}
                  </div>
                  {isRunning && (
                    <p className="text-xs text-muted-foreground">A server import is already running — wait for it to finish before starting a new one.</p>
                  )}
                </div>
              )}

              {/* 3-step progress — shown while pipeline is running */}
              {uwPipelineRunning && (
                <div className="space-y-3">
                  {[
                    { num: 1, label: 'Upload products to database' },
                    { num: 2, label: 'Migrate images: Dropbox → S3' },
                    { num: 3, label: 'Compress images to WebP' },
                  ].map(step => {
                    const isActive = uwStep === step.num;
                    const isDone = uwStep > step.num;
                    const isPending = uwStep < step.num;
                    return (
                      <div
                        key={step.num}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                          isActive
                            ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30'
                            : isDone
                            ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20'
                            : 'border-border bg-muted/30 opacity-50'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                          isActive ? 'bg-blue-500 text-white' : isDone ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                        }`}>
                          {isDone ? '✓' : isActive ? <Loader2 className="h-3 w-3 animate-spin" /> : step.num}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${
                            isActive ? 'text-blue-700 dark:text-blue-300' : isDone ? 'text-green-700 dark:text-green-300' : 'text-muted-foreground'
                          }`}>
                            {step.label}
                          </p>
                          {isActive && step.num === 1 && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{uwCurrent || 'Starting…'}</p>
                          )}
                          {isActive && step.num >= 2 && (
                            <div className="mt-2 space-y-1.5">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span className="truncate max-w-[70%]">{uwCurrent || 'Starting…'}</span>
                                <span className="flex-shrink-0 ml-2">{uwDone} / {uwTotal}</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-1.5">
                                <div
                                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                                  style={{ width: uwTotal ? `${Math.round((uwDone / uwTotal) * 100)}%` : '0%' }}
                                />
                              </div>
                              {uwErrors > 0 && (
                                <p className="text-xs text-red-500">{uwErrors} error{uwErrors > 1 ? 's' : ''}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <Button size="sm" variant="outline" onClick={() => { stopRef.current = true; }}>
                    Stop Pipeline
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Import History</h2>
          <div className="flex gap-1">
            {[
              { label: 'All', value: null },
              { label: 'ACME', value: 'ACME' },
              { label: 'Global Furniture', value: 'GFW' },
              { label: 'United Weavers', value: 'UW' },
            ].map(({ label, value }) => (
              <Button
                key={label}
                size="sm"
                variant={logSource === value ? 'default' : 'outline'}
                onClick={() => { setLogSource(value); setPage(1); }}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Synced</TableHead>
                <TableHead className="text-right">Failed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logsLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No imports yet
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">{formatDate(log.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{sourceLabel(log.source)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{typeLabel(log.type)}</TableCell>
                    <TableCell>
                      <Badge variant={log.status === 'SUCCESS' ? 'default' : 'destructive'} className="text-xs">
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">{log.itemsTotal}</TableCell>
                    <TableCell className="text-right text-sm">{log.itemsSynced}</TableCell>
                    <TableCell className="text-right text-sm">{log.itemsFailed}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-3">
            <p className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getVendorImportStatus,
  importGlobalFurniture,
  refreshGlobalFurniture,
  clearGlobalFurnitureProducts,
  triggerGfwDropboxSync,
  resetGfwDropboxSync,
} from '@/lib/services/vendorImport';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Upload, RefreshCw, ChevronLeft, CalendarClock, PackageSearch, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function FileField({ id, label, file, onChange }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="file" accept=".csv,.xlsx,.xls" onChange={e => onChange(e.target.files?.[0] || null)} />
      {file && <p className="text-xs text-muted-foreground">{file.name}</p>}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-2 pb-2 border-b">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

function formatDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleString();
}

export default function GfwPage() {
  const queryClient = useQueryClient();

  // Daily refresh
  const [gfwRefreshInv, setGfwRefreshInv] = useState(null);

  // Full import
  const [gfwData, setGfwData] = useState(null);
  const [gfwInventory, setGfwInventory] = useState(null);

  const { data: statusRes } = useQuery({
    queryKey: ['vendor-import-status'],
    queryFn: getVendorImportStatus,
    refetchInterval: q => {
      const d = q.state.data?.data;
      return (d?.running || d?.dropboxSync?.running) ? 2000 : 10000;
    },
  });

  const isRunning = statusRes?.data?.running;
  const dropbox = statusRes?.data?.dropboxSync;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['vendor-import-status'] });
    queryClient.invalidateQueries({ queryKey: ['vendor-import-logs'] });
  }

  const refreshMutation = useMutation({
    mutationFn: () => refreshGlobalFurniture({ inventoryCsv: gfwRefreshInv }),
    onSuccess: (data) => {
      toast.success(data.message || 'GFW refresh started');
      setGfwRefreshInv(null);
      invalidate();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to start GFW refresh'),
  });

  const importMutation = useMutation({
    mutationFn: () => importGlobalFurniture({ dataCsv: gfwData, inventoryCsv: gfwInventory }),
    onSuccess: (data) => {
      toast.success(data.message || 'Global Furniture import started — Dropbox image sync will start automatically');
      setGfwData(null); setGfwInventory(null);
      invalidate();
      // Auto-trigger Dropbox sync after import starts
      triggerGfwDropboxSync().catch(err => console.error('[GFW auto Dropbox]', err.message));
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to start GFW import'),
  });

  const clearMutation = useMutation({
    mutationFn: clearGlobalFurnitureProducts,
    onSuccess: (data) => toast.success(data.message || 'GFW products cleared'),
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to clear GFW products'),
  });

  const dropboxResetMutation = useMutation({
    mutationFn: resetGfwDropboxSync,
    onSuccess: (data) => { toast.success(data.message || 'Dropbox sync reset'); invalidate(); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to reset Dropbox sync'),
  });

  const dropboxSyncMutation = useMutation({
    mutationFn: triggerGfwDropboxSync,
    onSuccess: () => { toast.success('Dropbox sync started'); invalidate(); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to trigger Dropbox sync'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/vendor-import">
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
            <ChevronLeft className="h-4 w-4" /> Vendor Import
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Global Furniture (GFW)</h1>
      </div>

      {/* Daily */}
      <Card>
        <CardHeader>
          <SectionHeader
            icon={CalendarClock}
            title="Daily Inventory Upload"
            description="Upload the Search Results export to refresh stock quantities and wholesale prices on existing GFW products. Does not create new products."
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-sm">
            <FileField id="gfw-refresh-inv" label="Search Results (inventory)" file={gfwRefreshInv} onChange={setGfwRefreshInv} />
          </div>
          <Button
            onClick={() => refreshMutation.mutate()}
            disabled={isRunning || refreshMutation.isPending || !gfwRefreshInv}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            {refreshMutation.isPending ? 'Starting...' : 'Refresh Inventory'}
          </Button>
        </CardContent>
      </Card>

      {/* Full import */}
      <Card>
        <CardHeader>
          <SectionHeader
            icon={PackageSearch}
            title="Full Catalog Import"
            description="Upload the Product Data Sheet and Search Results. Creates new products and updates existing ones. Dropbox image sync starts automatically after the import."
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FileField id="gfw-data" label="Product Data Sheet" file={gfwData} onChange={setGfwData} />
            <FileField id="gfw-inventory" label="Search Results (inventory)" file={gfwInventory} onChange={setGfwInventory} />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => importMutation.mutate()}
              disabled={isRunning || importMutation.isPending || !gfwData || !gfwInventory}
            >
              <Upload className="h-4 w-4 mr-1" />
              {importMutation.isPending ? 'Starting...' : 'Start Full Import'}
            </Button>
            <Button
              variant="destructive"
              disabled={isRunning || clearMutation.isPending}
              onClick={() => {
                if (confirm('This will permanently delete all GFW products, variants, and storefront listings. Continue?')) {
                  clearMutation.mutate();
                }
              }}
            >
              {clearMutation.isPending ? 'Clearing...' : 'Clear All GFW Products'}
            </Button>
          </div>

          {isRunning && (
            <p className="text-xs text-muted-foreground">An import is already running — wait for it to finish.</p>
          )}

          {/* Dropbox sync status — embedded, not a separate card */}
          <div className="mt-2 pt-4 border-t space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dropbox Image Sync</p>
            {dropbox?.running ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                <span className="text-sm text-blue-600 font-medium">Syncing…</span>
                <span className="text-xs text-muted-foreground">{dropbox.progress}</span>
              </div>
            ) : (
              <div className="space-y-1">
                {(() => {
                  const isError = /error|failed/i.test(dropbox?.progress || '');
                  return (
                    <>
                      <p className={`text-sm font-medium ${isError ? 'text-red-600' : dropbox?.lastRun ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {dropbox?.lastRun ? (isError ? 'Error' : 'Idle') : 'Not run yet'}
                      </p>
                      {dropbox?.lastRun && (
                        <p className="text-xs text-muted-foreground">Last run: {formatDate(dropbox.lastRun)}</p>
                      )}
                      {dropbox?.lastResult && (
                        <p className="text-xs text-muted-foreground">
                          {dropbox.lastResult.synced ?? 0} updated · {dropbox.lastResult.skipped ?? 0} already synced · {dropbox.lastResult.total ?? 0} total
                        </p>
                      )}
                    </>
                  );
                })()}
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm" variant="outline"
                    disabled={dropbox?.running || dropboxSyncMutation.isPending || isRunning}
                    onClick={() => dropboxSyncMutation.mutate()}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    {dropboxSyncMutation.isPending ? 'Starting...' : 'Sync Now'}
                  </Button>
                  <Button
                    size="sm" variant="ghost" className="text-muted-foreground"
                    disabled={dropbox?.running || dropboxResetMutation.isPending || isRunning}
                    onClick={() => {
                      if (confirm('Clear dropboxSynced flag on all GFW products so the next sync re-downloads all assets. Continue?')) {
                        dropboxResetMutation.mutate();
                      }
                    }}
                  >
                    {dropboxResetMutation.isPending ? 'Resetting...' : 'Reset & Re-sync All'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

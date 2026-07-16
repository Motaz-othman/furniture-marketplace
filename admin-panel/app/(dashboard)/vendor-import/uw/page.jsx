'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getVendorImportStatus,
  importUnitedWeavers,
  refreshUnitedWeavers,
  getUwPendingImages,
  migrateUwProductImages,
} from '@/lib/services/vendorImport';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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

export default function UwPage() {
  const queryClient = useQueryClient();

  // Daily refresh
  const [uwRefreshInv, setUwRefreshInv] = useState(null);

  // Full import + pipeline
  const [uwCatalog, setUwCatalog] = useState(null);
  const [uwInventory, setUwInventory] = useState(null);
  const [uwStep, setUwStep] = useState(0);   // 0=idle 1=uploading CSV 2=migrating images 3=done
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

  const { data: statusRes } = useQuery({
    queryKey: ['vendor-import-status'],
    queryFn: getVendorImportStatus,
    refetchInterval: q => q.state.data?.data?.running ? 2000 : 15000,
  });
  const isRunning = statusRes?.data?.running;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['vendor-import-status'] });
    queryClient.invalidateQueries({ queryKey: ['vendor-import-logs'] });
  }

  // ─── Pipeline helpers ─────────────────────────────────────────────

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
      await uwImportMutation.mutateAsync();

      setUwCurrent('Importing products to database…');
      for (let i = 0; i < 300 && !stopRef.current; i++) {
        const res = await getVendorImportStatus();
        if (!res?.data?.running) break;
        await new Promise(r => setTimeout(r, 3000));
      }
      if (stopRef.current) { setUwStep(0); return; }

      setUwStep(2);
      await runLoop(getUwPendingImages, migrateUwProductImages);
      if (stopRef.current) { setUwStep(0); return; }

      setUwStep(3);
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
      setUwCurrent('');
      refetchPending();
    } catch {
      setUwStep(0);
    }
  }

  // ─── Mutations ────────────────────────────────────────────────────

  const refreshMutation = useMutation({
    mutationFn: () => refreshUnitedWeavers({ inventoryCsv: uwRefreshInv }),
    onSuccess: (data) => {
      toast.success(data.message || 'UW refresh started');
      setUwRefreshInv(null);
      invalidate();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to start UW refresh'),
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

  const uwPipelineRunning = uwStep > 0 && uwStep < 3;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/vendor-import">
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
            <ChevronLeft className="h-4 w-4" /> Vendor Import
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">United Weavers (UW)</h1>
      </div>

      {/* Daily */}
      <Card>
        <CardHeader>
          <SectionHeader
            icon={CalendarClock}
            title="Daily Inventory Upload"
            description="Upload the UW Inventory CSV to refresh stock quantities on existing UW products. Does not update prices or create new products."
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-sm">
            <FileField id="uw-refresh-inv" label="Inventory file" file={uwRefreshInv} onChange={setUwRefreshInv} />
          </div>
          <Button
            onClick={() => refreshMutation.mutate()}
            disabled={isRunning || refreshMutation.isPending || !uwRefreshInv || uwPipelineRunning}
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
            description="Upload the MasterFile and Inventory CSV. The pipeline imports products then migrates all images from Dropbox to S3. AVIF/WebP conversion is handled by Next.js + Cloudflare CDN at serve time."
          />
        </CardHeader>
        <CardContent className="space-y-4">

          {(uwStep === 0 || uwStep === 3) && (
            <>
              {uwStep === 3 && (
                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">
                    Pipeline complete — products imported and images on S3.
                    {uwErrors > 0 && <span className="text-red-500 ml-2">({uwErrors} error{uwErrors > 1 ? 's' : ''})</span>}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FileField id="uw-catalog" label="Catalog (MasterFile)" file={uwCatalog} onChange={setUwCatalog} />
                <FileField id="uw-inventory" label="Inventory file" file={uwInventory} onChange={setUwInventory} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleUwImport}
                  disabled={isRunning || uwImportMutation.isPending || !uwCatalog || !uwInventory || uwPipelineRunning}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  {uwStep === 3 ? 'Import Another Catalog' : 'Start Full Import'}
                </Button>
                {pendingRes?.pending > 0 && uwStep === 0 && (
                  <Button variant="outline" onClick={runImagePipelineOnly} disabled={uwPipelineRunning}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Migrate Images Only ({pendingRes.pending} pending)
                  </Button>
                )}
              </div>
              {isRunning && (
                <p className="text-xs text-muted-foreground">A server import is already running — wait for it to finish.</p>
              )}
            </>
          )}

          {uwPipelineRunning && (
            <div className="space-y-3">
              {[
                { num: 1, label: 'Upload products to database' },
                { num: 2, label: 'Migrate images: Dropbox → S3' },
              ].map(step => {
                const isActive = uwStep === step.num;
                const isDone = uwStep > step.num;
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
    </div>
  );
}

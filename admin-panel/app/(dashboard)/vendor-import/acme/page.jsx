'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { importAcme, refreshAcme } from '@/lib/services/vendorImport';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Upload, RefreshCw, ChevronLeft, CalendarClock, PackageSearch } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { getVendorImportStatus } from '@/lib/services/vendorImport';

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

export default function AcmePage() {
  const queryClient = useQueryClient();

  // Daily refresh
  const [refreshPrice, setRefreshPrice] = useState(null);
  const [refreshInventory, setRefreshInventory] = useState(null);

  // Full import
  const [acmeSpec, setAcmeSpec] = useState(null);
  const [acmeImages, setAcmeImages] = useState(null);
  const [acmePrice, setAcmePrice] = useState(null);
  const [acmeInventory, setAcmeInventory] = useState(null);

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

  const refreshMutation = useMutation({
    mutationFn: () => refreshAcme({ priceCsv: refreshPrice, inventoryCsv: refreshInventory }),
    onSuccess: (data) => {
      toast.success(data.message || 'ACME refresh started');
      setRefreshPrice(null); setRefreshInventory(null);
      invalidate();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to start ACME refresh'),
  });

  const importMutation = useMutation({
    mutationFn: () => importAcme({ specCsv: acmeSpec, imagesCsv: acmeImages, priceCsv: acmePrice, inventoryCsv: acmeInventory }),
    onSuccess: (data) => {
      toast.success(data.message || 'ACME import started');
      setAcmeSpec(null); setAcmeImages(null); setAcmePrice(null); setAcmeInventory(null);
      invalidate();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to start ACME import'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/vendor-import">
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
            <ChevronLeft className="h-4 w-4" /> Vendor Import
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">ACME</h1>
      </div>

      <Card>
        <CardHeader>
          <SectionHeader
            icon={CalendarClock}
            title="Daily Inventory Upload"
            description="Update cost and stock on existing ACME products. Upload just the price and inventory sheets — does not create new products."
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FileField id="refresh-price" label="Price sheet" file={refreshPrice} onChange={setRefreshPrice} />
            <FileField id="refresh-inventory" label="Live inventory" file={refreshInventory} onChange={setRefreshInventory} />
          </div>
          <Button
            onClick={() => refreshMutation.mutate()}
            disabled={isRunning || refreshMutation.isPending || !refreshPrice || !refreshInventory}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            {refreshMutation.isPending ? 'Starting...' : 'Refresh Price & Stock'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionHeader
            icon={PackageSearch}
            title="Full Catalog Import"
            description="First-time import or full catalog update. Creates new products and updates existing ones. Rows marked Disabled are skipped."
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FileField id="acme-spec" label="Spec sheet" file={acmeSpec} onChange={setAcmeSpec} />
            <FileField id="acme-images" label="Image links" file={acmeImages} onChange={setAcmeImages} />
            <FileField id="acme-price" label="Price sheet" file={acmePrice} onChange={setAcmePrice} />
            <FileField id="acme-inventory" label="Live inventory" file={acmeInventory} onChange={setAcmeInventory} />
          </div>
          <Button
            onClick={() => importMutation.mutate()}
            disabled={isRunning || importMutation.isPending || !acmeSpec || !acmeImages || !acmePrice || !acmeInventory}
          >
            <Upload className="h-4 w-4 mr-1" />
            {importMutation.isPending ? 'Starting...' : 'Start Full Import'}
          </Button>
          {isRunning && (
            <p className="text-xs text-muted-foreground">An import is already running — wait for it to finish.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

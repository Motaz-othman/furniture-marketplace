'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, Loader2, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getTaxRateSummary, uploadTaxRatesCsv } from '@/lib/services/settings';
import { toast } from 'sonner';

export default function TaxRatesPage() {
  const csvRef = useRef(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    getTaxRateSummary()
      .then(setSummary)
      .catch(() => toast.error('Failed to load tax rate summary'))
      .finally(() => setLoading(false));
  }, []);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadTaxRatesCsv(file);
      toast.success(result.message);
      const updated = await getTaxRateSummary();
      setSummary(updated);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to upload tax rates');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tax Rates</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage sales tax rates by zip code. Only Georgia zip codes are taxed — all others are $0.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Georgia Tax Rates
          </CardTitle>
          <CardDescription>
            Upload a Georgia DOR CSV to set the exact combined tax rate per zip code.
            Uploading a new file replaces all existing rates instantly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Status */}
          <div className="rounded-lg border border-border bg-muted/40 px-5 py-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : summary?.count > 0 ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{summary.count.toLocaleString()} zip codes loaded</p>
                  {summary.lastUpdated && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Last updated{' '}
                      {new Date(summary.lastUpdated).toLocaleDateString('en-US', {
                        month: 'long', day: 'numeric', year: 'numeric',
                      })}
                    </p>
                  )}
                </div>
                <span className="text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-full px-3 py-1">
                  Active
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">No tax rates loaded yet</p>
                <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                  Not configured
                </span>
              </div>
            )}
          </div>

          {/* Upload */}
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border p-10 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
            onClick={() => !uploading && csvRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
            <div className="text-center">
              <p className="text-sm font-medium">
                {uploading ? 'Processing CSV…' : 'Click to upload CSV'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Required columns: <span className="font-mono">ZipCode</span>, <span className="font-mono">EstimatedCombinedRate</span>
              </p>
            </div>
            <Button variant="outline" size="sm" disabled={uploading} onClick={e => { e.stopPropagation(); csvRef.current?.click(); }}>
              {uploading ? 'Uploading…' : 'Select File'}
            </Button>
          </div>

          <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleUpload} />

          <p className="text-xs text-muted-foreground">
            Source: Georgia Department of Revenue · Rates typically update 1–2 times per year.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getVendorImportStatus, getVendorImportLogs } from '@/lib/services/vendorImport';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, ChevronRight } from 'lucide-react';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString();
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

const VENDORS = [
  {
    key: 'ACME',
    label: 'ACME',
    href: '/vendor-import/acme',
    daily: 'Price & stock refresh (price + inventory sheets)',
    full: 'Full catalog — 4 sheets required',
  },
  {
    key: 'GFW',
    label: 'Global Furniture',
    href: '/vendor-import/gfw',
    daily: 'Stock + wholesale price refresh (Search Results CSV)',
    full: 'Full catalog — Data Sheet + Search Results + auto Dropbox image sync',
  },
  {
    key: 'UW',
    label: 'United Weavers',
    href: '/vendor-import/uw',
    daily: 'Stock refresh (Inventory CSV)',
    full: 'Full catalog — MasterFile + Inventory + Dropbox→S3 image pipeline',
  },
];

export default function VendorImportPage() {
  const [page, setPage] = useState(1);
  const [logSource, setLogSource] = useState(null);

  const { data: statusRes } = useQuery({
    queryKey: ['vendor-import-status'],
    queryFn: getVendorImportStatus,
    refetchInterval: (query) => {
      const d = query.state.data?.data;
      return (d?.running || d?.dropboxSync?.running) ? 2000 : 10000;
    },
  });

  const { data: logsRes, isLoading: logsLoading } = useQuery({
    queryKey: ['vendor-import-logs', page, logSource],
    queryFn: () => getVendorImportLogs({ page, limit: 15, ...(logSource ? { source: logSource } : {}) }),
  });

  const status = statusRes?.data;
  const isRunning = status?.running;
  const logs = logsRes?.data || [];
  const pagination = logsRes?.pagination;

  // Build a last-sync lookup per vendor key
  const lastSyncMap = {};
  (status?.lastSyncs || []).forEach(s => {
    if (!lastSyncMap[s.source]) lastSyncMap[s.source] = s;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Vendor Import</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select a vendor to upload daily inventory or run a full catalog import.
        </p>
      </div>

      {/* Single status card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">System Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <div>
                  <span className="font-semibold text-blue-600 text-sm">Import running</span>
                  <p className="text-xs text-muted-foreground">{status?.type} — {status?.progress}</p>
                </div>
              </>
            ) : (
              <span className="font-semibold text-green-600 text-sm">All systems idle</span>
            )}
          </div>

          {status?.lastSyncs?.length > 0 && (
            <div className="border-t pt-3 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recent activity</p>
              {status.lastSyncs.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span>
                    <Badge variant="outline" className="mr-1.5 text-xs">{sourceLabel(s.source)}</Badge>
                    {typeLabel(s.type)} — {s.itemsSynced} synced
                  </span>
                  <span className="text-muted-foreground">{formatDate(s.completedAt)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vendor navigation cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {VENDORS.map(v => {
          const last = lastSyncMap[v.key];
          return (
            <Link key={v.key} href={v.href} className="block group">
              <Card className="h-full transition-shadow group-hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{v.label}</CardTitle>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Daily</p>
                    <p className="text-xs text-muted-foreground">{v.daily}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Full import</p>
                    <p className="text-xs text-muted-foreground">{v.full}</p>
                  </div>
                  {last && (
                    <p className="text-xs text-muted-foreground border-t pt-2">
                      Last: {typeLabel(last.type)} · {formatDate(last.completedAt)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

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
                key={label} size="sm"
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
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading...</TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No imports yet</TableCell>
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
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= pagination.totalPages}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSyncStatus, getSyncLogs, triggerSync, getSchedule, updateSchedule } from '@/lib/services/sync';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RefreshCw, Play, Loader2, Clock, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString();
}

function typeLabel(type) {
  switch (type) {
    case 'FULL_SYNC': return 'Full';
    case 'INCREMENTAL_SYNC': return 'Incremental';
    case 'SINGLE_PRODUCT': return 'Single Product';
    default: return type;
  }
}

export default function SyncPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data: statusRes } = useQuery({
    queryKey: ['sync-status'],
    queryFn: getSyncStatus,
    refetchInterval: (query) => {
      return query.state.data?.data?.running ? 2000 : 10000;
    },
  });

  const { data: logsRes, isLoading: logsLoading } = useQuery({
    queryKey: ['sync-logs', page],
    queryFn: () => getSyncLogs({ page, limit: 15 }),
  });

  const { data: scheduleRes } = useQuery({
    queryKey: ['sync-schedule'],
    queryFn: getSchedule,
  });

  const syncMutation = useMutation({
    mutationFn: (type) => triggerSync({ type }),
    onSuccess: (data) => {
      toast.success(data.message || 'Sync started');
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to trigger sync'),
  });

  const scheduleMutation = useMutation({
    mutationFn: (body) => updateSchedule(body),
    onSuccess: (data) => {
      toast.success(data.message || 'Schedule updated');
      queryClient.invalidateQueries({ queryKey: ['sync-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update schedule'),
  });

  const status = statusRes?.data;
  const logs = logsRes?.data || [];
  const pagination = logsRes?.pagination;
  const isRunning = status?.running;
  const schedule = scheduleRes?.data?.config;
  const presets = scheduleRes?.data?.presets || {};

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Sync Management</h1>

      {/* Status + Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Sync</CardTitle>
          </CardHeader>
          <CardContent>
            {status?.lastSync ? (
              <div className="space-y-1">
                <p className="font-semibold">{typeLabel(status.lastSync.type)}</p>
                <p className="text-xs text-muted-foreground">{formatDate(status.lastSync.completedAt)}</p>
                <p className="text-xs text-muted-foreground">
                  {status.lastSync.itemsSynced} synced, {status.lastSync.itemsFailed} failed
                </p>
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">No syncs yet</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Manual Sync</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button
              size="sm"
              onClick={() => syncMutation.mutate('incremental')}
              disabled={isRunning || syncMutation.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Incremental
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => syncMutation.mutate('full')}
              disabled={isRunning || syncMutation.isPending}
            >
              <Play className="h-4 w-4 mr-1" />
              Full Sync
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Auto Sync Schedules */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Timer className="h-4 w-4" />
          Automatic Sync Schedules
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Incremental Schedule */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Incremental Sync
                </span>
                <Switch
                  id="incremental-enabled"
                  checked={schedule?.incremental?.enabled ?? false}
                  onCheckedChange={(checked) => scheduleMutation.mutate({ type: 'incremental', enabled: checked })}
                  disabled={scheduleMutation.isPending}
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Syncs only products changed since the last sync. Fast and lightweight.
              </p>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">
                  <Clock className="h-3.5 w-3.5 inline mr-1" />
                  Interval:
                </Label>
                <Select
                  value={schedule?.incremental?.interval || '2h'}
                  onValueChange={(val) => scheduleMutation.mutate({ type: 'incremental', interval: val })}
                  disabled={scheduleMutation.isPending}
                >
                  <SelectTrigger className="w-48 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(presets).map(([key, preset]) => (
                      <SelectItem key={key} value={key}>{preset.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {schedule?.incremental?.enabled && (
                <Badge variant="outline" className="text-xs">
                  Active — {presets[schedule.incremental.interval]?.label?.toLowerCase() || schedule.incremental.interval}
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Full Schedule */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  Full Sync
                </span>
                <Switch
                  id="full-enabled"
                  checked={schedule?.full?.enabled ?? false}
                  onCheckedChange={(checked) => scheduleMutation.mutate({ type: 'full', enabled: checked })}
                  disabled={scheduleMutation.isPending}
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Re-syncs all products, categories, and inventory. Thorough but heavier on API calls.
              </p>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">
                  <Clock className="h-3.5 w-3.5 inline mr-1" />
                  Interval:
                </Label>
                <Select
                  value={schedule?.full?.interval || '24h'}
                  onValueChange={(val) => scheduleMutation.mutate({ type: 'full', interval: val })}
                  disabled={scheduleMutation.isPending}
                >
                  <SelectTrigger className="w-48 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(presets).map(([key, preset]) => (
                      <SelectItem key={key} value={key}>{preset.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {schedule?.full?.enabled && (
                <Badge variant="outline" className="text-xs">
                  Active — {presets[schedule.full.interval]?.label?.toLowerCase() || schedule.full.interval}
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sync History */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Sync History</h2>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
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
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No sync logs yet
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">{formatDate(log.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{typeLabel(log.type)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={log.status === 'SUCCESS' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
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

        {/* Pagination */}
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

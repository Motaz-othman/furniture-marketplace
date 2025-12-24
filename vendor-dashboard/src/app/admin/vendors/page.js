// src/app/admin/vendors/page.js
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/lib/api/admin.service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  Store, 
  Loader2,
  Clock,
  CheckCircle,
  ShieldCheck,
  Star,
  Package,
  DollarSign,
  Phone,
  Mail,
  Calendar,
  ChevronDown,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function VendorsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  
  // Dialog states
  const [detailsDialog, setDetailsDialog] = useState({ open: false, vendor: null });
  
  // Inline editing states
  const [editingCommission, setEditingCommission] = useState(null);
  const [commissionValue, setCommissionValue] = useState('');
  const [editingRating, setEditingRating] = useState(null);
  const [ratingValue, setRatingValue] = useState('');

  // Fetch vendors
  const { data, isLoading } = useQuery({
    queryKey: ['admin-vendors', page, statusFilter, search],
    queryFn: () => adminService.getVendors({ 
      page, 
      status: statusFilter !== 'all' ? statusFilter : undefined,
      search: search || undefined 
    }),
  });

  // Fetch vendor details
  const { data: vendorDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['admin-vendor-details', detailsDialog.vendor?.id],
    queryFn: () => adminService.getVendor(detailsDialog.vendor.id),
    enabled: !!detailsDialog.vendor?.id && detailsDialog.open,
  });

  // Update status mutation
  const statusMutation = useMutation({
    mutationFn: ({ vendorId, status }) => adminService.updateVendorStatus(vendorId, status),
    onSuccess: () => {
      toast.success('Vendor status updated');
      queryClient.invalidateQueries(['admin-vendors']);
    },
    onError: (error) => {
      toast.error(error?.message || error?.error || 'Failed to update status');
    },
  });

  // Update commission mutation
  const commissionMutation = useMutation({
    mutationFn: ({ vendorId, commissionRate }) => adminService.updateVendorCommission(vendorId, commissionRate),
    onSuccess: () => {
      toast.success('Commission rate updated');
      queryClient.invalidateQueries(['admin-vendors']);
      setEditingCommission(null);
    },
    onError: (error) => {
      toast.error(error?.message || error?.error || 'Failed to update commission');
    },
  });

  // Update rating mutation
  const ratingMutation = useMutation({
    mutationFn: ({ vendorId, adminRating }) => adminService.updateVendorRating(vendorId, adminRating),
    onSuccess: () => {
      toast.success('Admin rating updated');
      queryClient.invalidateQueries(['admin-vendors']);
      setEditingRating(null);
    },
    onError: (error) => {
      toast.error(error?.message || error?.error || 'Failed to update rating');
    },
  });

  const vendors = data?.vendors || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1 };
  const statusCounts = data?.statusCounts || { pending: 0, approved: 0, verified: 0 };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 cursor-pointer">
            <Clock className="h-3 w-3 mr-1" />
            Pending
            <ChevronDown className="h-3 w-3 ml-1" />
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
            <ChevronDown className="h-3 w-3 ml-1" />
          </Badge>
        );
      case 'VERIFIED':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer">
            <ShieldCheck className="h-3 w-3 mr-1" />
            Verified
            <ChevronDown className="h-3 w-3 ml-1" />
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200 cursor-pointer">
            <Clock className="h-3 w-3 mr-1" />
            Pending
            <ChevronDown className="h-3 w-3 ml-1" />
          </Badge>
        );
    }
  };

  const handleStatusChange = (vendorId, newStatus) => {
    statusMutation.mutate({ vendorId, status: newStatus });
  };

  const handleCommissionEdit = (vendor) => {
    setEditingCommission(vendor.id);
    setCommissionValue((vendor.commissionRate * 100).toFixed(0));
  };

  const handleCommissionSave = (vendorId) => {
    const rate = parseFloat(commissionValue) / 100;
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error('Commission must be between 0 and 100');
      return;
    }
    commissionMutation.mutate({ vendorId, commissionRate: rate });
  };

  const handleRatingEdit = (vendor) => {
    setEditingRating(vendor.id);
    setRatingValue(vendor.adminRating?.toString() || '');
  };

  const handleRatingSave = (vendorId) => {
    const rating = parseFloat(ratingValue);
    if (isNaN(rating) || rating < 0 || rating > 5) {
      toast.error('Rating must be between 0 and 5');
      return;
    }
    ratingMutation.mutate({ vendorId, adminRating: rating });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`h-3 w-3 ${i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
        />
      );
    }
    return <div className="flex">{stars}</div>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Vendors</h1>
        <p className="text-gray-500 mt-1">Manage marketplace vendors</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Vendors</p>
                <p className="text-2xl font-bold">{pagination.totalCount || 0}</p>
              </div>
              <Store className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-700">Pending</p>
                <p className="text-2xl font-bold text-yellow-800">{statusCounts.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700">Approved</p>
                <p className="text-2xl font-bold text-blue-800">{statusCounts.approved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700">Verified</p>
                <p className="text-2xl font-bold text-green-800">{statusCounts.verified}</p>
              </div>
              <ShieldCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by business name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="VERIFIED">Verified</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vendors Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : vendors.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No vendors found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pending Orders</TableHead>
                    <TableHead>Reviews</TableHead>
                    <TableHead>Admin Rating</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map((vendor) => (
                    <TableRow key={vendor.id}>
                      {/* Vendor Info - Clickable */}
                      <TableCell>
                        <div 
                          className="cursor-pointer hover:opacity-80"
                          onClick={() => setDetailsDialog({ open: true, vendor })}
                        >
                          <p className="font-medium text-blue-600 hover:underline">
                            {vendor.businessName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {vendor.user?.firstName} {vendor.user?.lastName}
                          </p>
                          <p className="text-xs text-gray-400">{vendor.user?.email}</p>
                        </div>
                      </TableCell>

                      {/* Status - Clickable Dropdown */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <div>{getStatusBadge(vendor.status || 'PENDING')}</div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(vendor.id, 'PENDING')}
                              className="cursor-pointer"
                            >
                              <Clock className="h-4 w-4 mr-2 text-yellow-500" />
                              Pending
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(vendor.id, 'APPROVED')}
                              className="cursor-pointer"
                            >
                              <CheckCircle className="h-4 w-4 mr-2 text-blue-500" />
                              Approved
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(vendor.id, 'VERIFIED')}
                              className="cursor-pointer"
                            >
                              <ShieldCheck className="h-4 w-4 mr-2 text-green-500" />
                              Verified
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>

                      {/* Pending Orders */}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className={`font-medium ${vendor.stats?.pendingOrders > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                            {vendor.stats?.pendingOrders || 0}
                          </span>
                          {vendor.stats?.pendingOrders > 0 && (
                            <span className="text-xs text-gray-400">pending</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Overall Reviews */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                            <span className="font-medium">{vendor.stats?.avgRating || 0}</span>
                          </div>
                          <span className="text-xs text-gray-400">
                            ({vendor.stats?.totalReviews || 0})
                          </span>
                        </div>
                      </TableCell>

                      {/* Admin Rating - Editable */}
                      <TableCell>
                        {editingRating === vendor.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="0"
                              max="5"
                              step="0.1"
                              value={ratingValue}
                              onChange={(e) => setRatingValue(e.target.value)}
                              className="w-16 h-8 text-sm"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-green-600"
                              onClick={() => handleRatingSave(vendor.id)}
                              disabled={ratingMutation.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-600"
                              onClick={() => setEditingRating(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div 
                            className="flex items-center gap-2 cursor-pointer hover:opacity-80"
                            onClick={() => handleRatingEdit(vendor)}
                          >
                            {vendor.adminRating ? (
                              <>
                                {renderStars(vendor.adminRating)}
                                <span className="text-sm text-gray-500">{vendor.adminRating}</span>
                              </>
                            ) : (
                              <span className="text-gray-400 text-sm flex items-center gap-1">
                                <Edit2 className="h-3 w-3" /> Set rating
                              </span>
                            )}
                          </div>
                        )}
                      </TableCell>

                      {/* Commission - Editable */}
                      <TableCell>
                        {editingCommission === vendor.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={commissionValue}
                              onChange={(e) => setCommissionValue(e.target.value)}
                              className="w-16 h-8 text-sm"
                            />
                            <span className="text-sm">%</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-green-600"
                              onClick={() => handleCommissionSave(vendor.id)}
                              disabled={commissionMutation.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-600"
                              onClick={() => setEditingCommission(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div 
                            className="cursor-pointer hover:opacity-80 flex items-center gap-1"
                            onClick={() => handleCommissionEdit(vendor)}
                          >
                            <span className="font-medium">{((vendor.commissionRate || 0.06) * 100).toFixed(0)}%</span>
                            <Edit2 className="h-3 w-3 text-gray-400" />
                          </div>
                        )}
                      </TableCell>

                      {/* Revenue */}
                      <TableCell>
                        <span className="font-medium text-green-600">
                          ${(vendor.stats?.totalRevenue || 0).toFixed(2)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <p className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Vendor Details Dialog */}
      <Dialog open={detailsDialog.open} onOpenChange={(open) => setDetailsDialog({ open, vendor: open ? detailsDialog.vendor : null })}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Vendor Details</DialogTitle>
          </DialogHeader>
          
          {detailsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : vendorDetails ? (
            <div className="space-y-5">
              {/* Vendor Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Store className="h-7 w-7 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{vendorDetails.businessName}</h3>
                    <p className="text-gray-500 text-sm">
                      {vendorDetails.user?.firstName} {vendorDetails.user?.lastName}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {getStatusBadge(vendorDetails.status || 'PENDING')}
                      {vendorDetails.adminRating && (
                        <div className="flex items-center gap-1">
                          {renderStars(vendorDetails.adminRating)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-500">Commission</p>
                  <p className="text-lg font-bold text-blue-600">
                    {((vendorDetails.commissionRate || 0.06) * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* Contact Info - Clear Display */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-medium">{vendorDetails.user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="font-medium">{vendorDetails.user?.phone || vendorDetails.businessPhone || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Joined</p>
                    <p className="font-medium">{formatDate(vendorDetails.user?.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Key Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <Package className="h-5 w-5 mx-auto text-blue-400 mb-1" />
                  <p className="text-xl font-bold text-blue-600">{vendorDetails.stats?.totalProducts || 0}</p>
                  <p className="text-xs text-gray-500">Products</p>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <Star className="h-5 w-5 mx-auto text-yellow-400 mb-1" />
                  <p className="text-xl font-bold text-yellow-600">
                    {vendorDetails.stats?.avgRating || 0}
                  </p>
                  <p className="text-xs text-gray-500">{vendorDetails.stats?.totalReviews || 0} reviews</p>
                </div>
              </div>

              {/* Order Stats */}
              <div>
                <h4 className="font-medium mb-2 text-sm">Orders</h4>
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-lg font-bold">{vendorDetails.stats?.totalOrders || 0}</p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                  <div className="text-center p-2 bg-orange-50 rounded-lg">
                    <p className="text-lg font-bold text-orange-600">{vendorDetails.stats?.pendingOrders || 0}</p>
                    <p className="text-xs text-gray-500">Pending</p>
                  </div>
                  <div className="text-center p-2 bg-red-50 rounded-lg">
                    <p className="text-lg font-bold text-red-600">{vendorDetails.stats?.cancelledOrders || 0}</p>
                    <p className="text-xs text-gray-500">Cancelled</p>
                  </div>
                  <div className="text-center p-2 bg-purple-50 rounded-lg">
                    <p className="text-lg font-bold text-purple-600">{vendorDetails.stats?.refundedOrders || 0}</p>
                    <p className="text-xs text-gray-500">Refunded</p>
                  </div>
                </div>
              </div>

              {/* Order Status Breakdown */}
              <div>
                <h4 className="font-medium mb-2 text-sm">Order Status</h4>
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <p className="font-bold text-sm">{vendorDetails.stats?.confirmedOrders || 0}</p>
                    <p className="text-xs text-gray-500">Confirmed</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <p className="font-bold text-sm">{vendorDetails.stats?.processingOrders || 0}</p>
                    <p className="text-xs text-gray-500">Processing</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <p className="font-bold text-sm">{vendorDetails.stats?.shippedOrders || 0}</p>
                    <p className="text-xs text-gray-500">Shipped</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <p className="font-bold text-sm">{vendorDetails.stats?.deliveredOrders || 0}</p>
                    <p className="text-xs text-gray-500">Delivered</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
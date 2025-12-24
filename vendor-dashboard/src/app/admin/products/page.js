// src/app/admin/products/page.js
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Search, 
  Package, 
  Loader2,
  Eye,
  EyeOff,
  Trash2,
  Star,
  Store,
  Tag,
  DollarSign,
  Box,
  Palette,
  Ruler,
  Shield,
  Calendar,
  Image as ImageIcon,
  AlertTriangle,
  Filter,
  X,
  Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  
  // Dialog states
  const [detailsDialog, setDetailsDialog] = useState({ open: false, product: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, product: null });

  // Fetch products
  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page, statusFilter, stockFilter, categoryFilter, vendorFilter, search],
    queryFn: () => adminService.getProducts({ 
      page, 
      isActive: statusFilter !== 'all' ? statusFilter : undefined,
      stock: stockFilter !== 'all' ? stockFilter : undefined,
      categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
      vendorId: vendorFilter !== 'all' ? vendorFilter : undefined,
      search: search || undefined 
    }),
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: (productId) => adminService.toggleProductActive(productId),
    onSuccess: (data) => {
      toast.success(data?.message || 'Product status updated');
      queryClient.invalidateQueries(['admin-products']);
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to update product');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (productId) => adminService.deleteProduct(productId),
    onSuccess: () => {
      toast.success('Product deleted successfully');
      queryClient.invalidateQueries(['admin-products']);
      setDeleteDialog({ open: false, product: null });
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to delete product');
    },
  });

  const products = data?.products || [];
  const categories = data?.categories || [];
  const vendors = data?.vendors || [];
  const stockStats = data?.stockStats || { inStock: 0, lowStock: 0, outOfStock: 0 };
  const pagination = data?.pagination || { page: 1, totalPages: 1, totalCount: 0 };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price || 0);
  };

  const handleDelete = () => {
    if (deleteDialog.product) {
      deleteMutation.mutate(deleteDialog.product.id);
    }
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setStockFilter('all');
    setCategoryFilter('all');
    setVendorFilter('all');
    setSearch('');
  };

  const hasActiveFilters = statusFilter !== 'all' || stockFilter !== 'all' || categoryFilter !== 'all' || vendorFilter !== 'all' || search;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Products</h1>
        <p className="text-gray-500 mt-1">Manage all marketplace products</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Products</p>
                <p className="text-2xl font-bold">{pagination.totalCount}</p>
              </div>
              <Package className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700">In Stock</p>
                <p className="text-2xl font-bold text-green-800">{stockStats.inStock}</p>
              </div>
              <Box className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700">Low Stock</p>
                <p className="text-2xl font-bold text-orange-800">{stockStats.lowStock}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700">Out of Stock</p>
                <p className="text-2xl font-bold text-red-800">{stockStats.outOfStock}</p>
              </div>
              <EyeOff className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search and Filter Toggle */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, SKU, brand..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant={showFilters ? 'default' : 'outline'}
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-1">Active</Badge>
                )}
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" onClick={clearFilters} className="gap-2">
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Stock</label>
                  <Select value={stockFilter} onValueChange={setStockFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Stock" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stock</SelectItem>
                      <SelectItem value="in_stock">In Stock (&gt;10)</SelectItem>
                      <SelectItem value="low_stock">Low Stock (1-10)</SelectItem>
                      <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Category</label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Vendor</label>
                  <Select value={vendorFilter} onValueChange={setVendorFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Vendors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Vendors</SelectItem>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id}>{vendor.businessName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No products found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Variants</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      {/* Product Info - Clickable */}
                      <TableCell>
                        <div 
                          className="flex items-center gap-3 cursor-pointer hover:opacity-80"
                          onClick={() => setDetailsDialog({ open: true, product })}
                        >
                          <div className="h-12 w-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            {product.images?.[0] ? (
                              <img 
                                src={product.images[0]} 
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Package className="h-6 w-6 m-3 text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-blue-600 hover:underline truncate max-w-[200px]">
                              {product.name}
                            </p>
                            <p className="text-xs text-gray-400">{product.sku || 'No SKU'}</p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Vendor */}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Store className="h-3 w-3 text-gray-400" />
                          <span className="text-sm truncate max-w-[120px]">{product.vendor?.businessName || 'Unknown'}</span>
                          {product.vendor?.isVerified && (
                            <Shield className="h-3 w-3 text-green-500" />
                          )}
                        </div>
                      </TableCell>

                      {/* Category */}
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {product.category?.name || 'Uncategorized'}
                        </Badge>
                      </TableCell>

                      {/* Price */}
                      <TableCell>
                        <div>
                          <span className="font-medium">{formatPrice(product.price)}</span>
                          {product.compareAtPrice && product.compareAtPrice > product.price && (
                            <span className="text-xs text-gray-400 line-through ml-1">
                              {formatPrice(product.compareAtPrice)}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Stock */}
                      <TableCell>
                        <span className={`font-medium ${
                          product.stockQuantity === 0 
                            ? 'text-red-600' 
                            : product.stockQuantity <= 10 
                              ? 'text-orange-600' 
                              : 'text-green-600'
                        }`}>
                          {product.stockQuantity || 0}
                        </span>
                      </TableCell>

                      {/* Variants */}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Layers className="h-3 w-3 text-gray-400" />
                          <span className="text-sm">{product._count?.variants || 0}</span>
                        </div>
                      </TableCell>

                      {/* Rating */}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                          <span className="text-sm">{product.rating || 0}</span>
                          <span className="text-xs text-gray-400">({product._count?.reviews || 0})</span>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {product.isActive ? (
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleMutation.mutate(product.id)}
                            disabled={toggleMutation.isPending}
                          >
                            {product.isActive ? (
                              <>
                                <EyeOff className="h-4 w-4 mr-1" />
                                Hide
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-1" />
                                Show
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => setDeleteDialog({ open: true, product })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
              Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} products)
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

      {/* Product Details Dialog */}
      <Dialog open={detailsDialog.open} onOpenChange={(open) => setDetailsDialog({ open, product: open ? detailsDialog.product : null })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
          </DialogHeader>
          
          {detailsDialog.product && (
            <div className="space-y-5">
              {/* Product Header */}
              <div className="flex gap-4">
                <div className="h-24 w-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {detailsDialog.product.images?.[0] ? (
                    <img 
                      src={detailsDialog.product.images[0]} 
                      alt={detailsDialog.product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Package className="h-12 w-12 m-6 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold">{detailsDialog.product.name}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {detailsDialog.product.isActive ? (
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                    <Badge variant="outline">{detailsDialog.product.category?.name || 'Uncategorized'}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    <span className="font-medium">{detailsDialog.product.rating || 0}</span>
                    <span className="text-sm text-gray-500">({detailsDialog.product._count?.reviews || 0} reviews)</span>
                  </div>
                </div>
              </div>

              {/* Pricing & Stock */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-gray-500">Price</span>
                  </div>
                  <p className="text-xl font-bold text-green-600">{formatPrice(detailsDialog.product.price)}</p>
                  {detailsDialog.product.compareAtPrice && detailsDialog.product.compareAtPrice > detailsDialog.product.price && (
                    <p className="text-sm text-gray-400 line-through">{formatPrice(detailsDialog.product.compareAtPrice)}</p>
                  )}
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Box className="h-4 w-4 text-blue-500" />
                    <span className="text-xs text-gray-500">Stock</span>
                  </div>
                  <p className={`text-xl font-bold ${
                    detailsDialog.product.stockQuantity === 0 
                      ? 'text-red-600' 
                      : detailsDialog.product.stockQuantity <= 10 
                        ? 'text-orange-600' 
                        : 'text-blue-600'
                  }`}>
                    {detailsDialog.product.stockQuantity || 0}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Tag className="h-4 w-4 text-gray-500" />
                    <span className="text-xs text-gray-500">SKU</span>
                  </div>
                  <p className="text-sm font-medium">{detailsDialog.product.sku || 'N/A'}</p>
                </div>
              </div>

              {/* Vendor Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Store className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Vendor</p>
                    <p className="font-medium flex items-center gap-1">
                      {detailsDialog.product.vendor?.businessName || 'Unknown'}
                      {detailsDialog.product.vendor?.isVerified && (
                        <Shield className="h-4 w-4 text-green-500" />
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Variants Summary */}
              {detailsDialog.product.variants && detailsDialog.product.variants.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-sm flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Variants ({detailsDialog.product.variants.length})
                  </h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="text-xs">Name/SKU</TableHead>
                          <TableHead className="text-xs">Color</TableHead>
                          <TableHead className="text-xs">Size</TableHead>
                          <TableHead className="text-xs">Material</TableHead>
                          <TableHead className="text-xs">Price</TableHead>
                          <TableHead className="text-xs">Stock</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailsDialog.product.variants.map((variant) => {
                          const variantStock = variant.stockQuantity ?? variant.stock ?? 0;
                          const variantPrice = variant.price ?? variant.priceAdjustment ?? 0;
                          return (
                            <TableRow key={variant.id}>
                              <TableCell className="text-sm py-2">
                                <div>
                                  <p className="font-medium">{variant.name || '-'}</p>
                                  {variant.sku && <p className="text-xs text-gray-400">{variant.sku}</p>}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm py-2">
                                {variant.color ? (
                                  <div className="flex items-center gap-1">
                                    <div 
                                      className="h-4 w-4 rounded-full border"
                                      style={{ backgroundColor: variant.color.toLowerCase() }}
                                    />
                                    <span>{variant.color}</span>
                                  </div>
                                ) : '-'}
                              </TableCell>
                              <TableCell className="text-sm py-2">
                                {variant.size || '-'}
                              </TableCell>
                              <TableCell className="text-sm py-2">
                                {variant.material || '-'}
                              </TableCell>
                              <TableCell className="text-sm py-2 font-medium">
                                {variantPrice > 0 ? formatPrice(variantPrice) : '-'}
                              </TableCell>
                              <TableCell className={`text-sm py-2 font-medium ${
                                variantStock === 0 
                                  ? 'text-red-600' 
                                  : variantStock <= 10 
                                    ? 'text-orange-600' 
                                    : 'text-green-600'
                              }`}>
                                {variantStock}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Variant Summary Stats */}
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-gray-50 p-2 rounded text-center">
                      <p className="text-gray-500">Total Variants</p>
                      <p className="font-bold">{detailsDialog.product.variants.length}</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded text-center">
                      <p className="text-gray-500">Total Variant Stock</p>
                      <p className="font-bold">
                        {detailsDialog.product.variants.reduce((sum, v) => sum + (v.stockQuantity ?? v.stock ?? 0), 0)}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded text-center">
                      <p className="text-gray-500">Price Range</p>
                      <p className="font-bold">
                        {(() => {
                          const prices = detailsDialog.product.variants
                            .map(v => v.price ?? v.priceAdjustment ?? 0)
                            .filter(p => p > 0);
                          if (prices.length === 0) return '-';
                          const min = Math.min(...prices);
                          const max = Math.max(...prices);
                          return min === max ? formatPrice(min) : `${formatPrice(min)} - ${formatPrice(max)}`;
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              {detailsDialog.product.description && (
                <div>
                  <h4 className="font-medium mb-2 text-sm">Description</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                    {detailsDialog.product.description}
                  </p>
                </div>
              )}

              {/* Product Details Grid */}
              <div>
                <h4 className="font-medium mb-2 text-sm">Details</h4>
                <div className="grid grid-cols-2 gap-3">
                  {detailsDialog.product.brand && (
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <Tag className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Brand</p>
                        <p className="text-sm font-medium">{detailsDialog.product.brand}</p>
                      </div>
                    </div>
                  )}
                  {detailsDialog.product.materials && (
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <Box className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Materials</p>
                        <p className="text-sm font-medium">{Array.isArray(detailsDialog.product.materials) ? detailsDialog.product.materials.join(', ') : detailsDialog.product.materials}</p>
                      </div>
                    </div>
                  )}
                  {detailsDialog.product.colors && detailsDialog.product.colors.length > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <Palette className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Colors</p>
                        <p className="text-sm font-medium">{Array.isArray(detailsDialog.product.colors) ? detailsDialog.product.colors.join(', ') : detailsDialog.product.colors}</p>
                      </div>
                    </div>
                  )}
                  {detailsDialog.product.dimensions && (
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <Ruler className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Dimensions</p>
                        <p className="text-sm font-medium">
                          {typeof detailsDialog.product.dimensions === 'object' 
                            ? `${detailsDialog.product.dimensions.width || 0} x ${detailsDialog.product.dimensions.height || 0} x ${detailsDialog.product.dimensions.depth || 0}`
                            : detailsDialog.product.dimensions
                          }
                        </p>
                      </div>
                    </div>
                  )}
                  {detailsDialog.product.roomType && (
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <Box className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Room Type</p>
                        <p className="text-sm font-medium">{detailsDialog.product.roomType}</p>
                      </div>
                    </div>
                  )}
                  {detailsDialog.product.style && (
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <Palette className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Style</p>
                        <p className="text-sm font-medium">{detailsDialog.product.style}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Info */}
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="p-2 bg-gray-50 rounded text-center">
                  <p className="text-xs text-gray-500">Assembly</p>
                  <p className="font-medium">{detailsDialog.product.assemblyRequired ? 'Required' : 'Not Required'}</p>
                </div>
                <div className="p-2 bg-gray-50 rounded text-center">
                  <p className="text-xs text-gray-500">Warranty</p>
                  <p className="font-medium">{detailsDialog.product.warranty || 'N/A'}</p>
                </div>
                <div className="p-2 bg-gray-50 rounded text-center">
                  <p className="text-xs text-gray-500">Total Variants</p>
                  <p className="font-medium">{detailsDialog.product._count?.variants || 0}</p>
                </div>
              </div>

              {/* Care Instructions */}
              {detailsDialog.product.careInstructions && (
                <div>
                  <h4 className="font-medium mb-2 text-sm">Care Instructions</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                    {detailsDialog.product.careInstructions}
                  </p>
                </div>
              )}

              {/* Images */}
              {detailsDialog.product.images && detailsDialog.product.images.length > 1 && (
                <div>
                  <h4 className="font-medium mb-2 text-sm flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Images ({detailsDialog.product.images.length})
                  </h4>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {detailsDialog.product.images.map((img, idx) => (
                      <div key={idx} className="h-16 w-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        <img 
                          src={img} 
                          alt={`${detailsDialog.product.name} ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Created: {formatDate(detailsDialog.product.createdAt)}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Updated: {formatDate(detailsDialog.product.updatedAt)}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.product?.name}"? 
              This will remove the product and all associated data including reviews and order history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
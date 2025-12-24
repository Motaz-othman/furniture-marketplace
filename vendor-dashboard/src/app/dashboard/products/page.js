// src/app/dashboard/products/page.js
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsService } from '@/lib/api/products.service';
import { variantsService } from '@/lib/api/variants.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Copy, CheckSquare, Square, Filter, X } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ProductsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState('');
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Inline editing states
  const [editingCell, setEditingCell] = useState(null);
  
  // Variants dialog
  const [variantsDialogOpen, setVariantsDialogOpen] = useState(false);
  const [selectedProductVariants, setSelectedProductVariants] = useState(null);
  const [variants, setVariants] = useState([]);

  // Fetch products
  const { data, isLoading, error } = useQuery({
    queryKey: ['vendor-products', page],
    queryFn: async () => {
      try {
        const result = await productsService.getVendorProducts({ page, limit: 100 });
        return result || { products: [], pagination: { page: 1, totalPages: 1, totalCount: 0 } };
      } catch (error) {
        return { products: [], pagination: { page: 1, totalPages: 1, totalCount: 0 } };
      }
    },
    retry: false,
    staleTime: 0,
  });

  const products = data?.products || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, totalCount: 0 };

  // Fetch variants for a product
  const fetchVariants = async (productId) => {
    try {
      const result = await variantsService.getProductVariants(productId);
      if (Array.isArray(result)) return result;
      if (result?.variants) return result.variants;
      if (result?.data?.variants) return result.data.variants;
      return [];
    } catch (error) {
      return [];
    }
  };

  // Apply filters
  const filteredProducts = data?.products?.filter(product => {
    if (categoryFilter !== 'all' && product.categoryId !== categoryFilter) return false;
    if (statusFilter === 'active' && !product.isActive) return false;
    if (statusFilter === 'inactive' && product.isActive) return false;
    
    const stock = product.stockQuantity;
    if (stockFilter === 'zero' && stock !== 0) return false;
    if (stockFilter === 'low' && (stock < 1 || stock > 3)) return false;
    if (stockFilter === 'medium' && (stock < 5 || stock > 10)) return false;
    if (stockFilter === 'high' && stock <= 10) return false;
    
    return true;
  }) || [];

  // Get unique categories from products
  const categoriesMap = new Map();
  data?.products?.forEach(product => {
    if (product.category && product.category.id) {
      categoriesMap.set(product.category.id, product.category);
    }
  });
  const categories = Array.from(categoriesMap.values());

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: ({ productId, data }) => productsService.updateProduct(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['vendor-products']);
      toast.success('Product updated');
      setEditingCell(null);
    },
    onError: (error) => {
      toast.error(error.error || 'Failed to update product');
    },
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (productId) => {
      return await productsService.toggleProductStatus(productId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vendor-products']);
      toast.success('Status updated');
    },
    onError: (error) => {
      toast.error(error.error || 'Failed to update status');
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (productIds) => {
      await Promise.all(productIds.map(id => productsService.deleteProduct(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vendor-products']);
      toast.success(`${selectedProducts.length} product(s) deleted`);
      setSelectedProducts([]);
      setBulkActionDialogOpen(false);
    },
    onError: () => {
      toast.error('Failed to delete products');
    },
  });

  // Bulk duplicate mutation
  const bulkDuplicateMutation = useMutation({
    mutationFn: async (productIds) => {
      const products = data?.products?.filter(p => productIds.includes(p.id));
      const results = { success: 0, failed: 0, errors: [] };
      
      const vendorId = products[0]?.vendorId;
      if (!vendorId) throw new Error('Vendor ID not found');
      
      for (let i = 0; i < products.length; i++) {
        try {
          const product = products[i];
          const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
          const baseName = product.name.replace(/\s*\(Copy\)$/i, '');
          
          const duplicateData = {
            vendorId: vendorId,
            name: `${baseName} (Copy)`,
            description: product.description,
            categoryId: product.categoryId,
            price: product.price,
            compareAtPrice: product.compareAtPrice || undefined,
            sku: product.sku ? `${product.sku}-${randomSuffix}` : null,
            stockQuantity: product.stockQuantity,
            images: product.images,
            dimensions: product.dimensions,
            materials: product.materials,
            colors: product.colors,
            roomType: product.roomType,
            style: product.style,
            assemblyRequired: product.assemblyRequired,
            brand: product.brand,
            warranty: product.warranty,
            careInstructions: product.careInstructions || '',
            isActive: false,
          };
          
          await productsService.createProduct(duplicateData);
          results.success++;
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          results.failed++;
          results.errors.push({
            product: products[i].name,
            error: error?.error || error?.message || 'Unknown error'
          });
        }
      }
      
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries(['vendor-products']);
      
      if (results.failed === 0) {
        toast.success(`${results.success} product(s) duplicated successfully`);
      } else {
        toast.error(`${results.success} succeeded, ${results.failed} failed`);
      }
      
      setSelectedProducts([]);
    },
    onError: () => {
      toast.error('Failed to duplicate products');
    },
  });

  // Update variant stock mutation
  const updateVariantMutation = useMutation({
    mutationFn: ({ variantId, stockQuantity }) => 
      variantsService.updateVariant(variantId, { stockQuantity: parseInt(stockQuantity) }),
    onSuccess: () => {
      toast.success('Variant updated');
      if (selectedProductVariants) {
        fetchVariants(selectedProductVariants.id).then(setVariants);
      }
    },
    onError: () => {
      toast.error('Failed to update variant');
    },
  });

  // Handlers
  const toggleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };

  const toggleSelectProduct = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleBulkAction = (action) => {
    if (selectedProducts.length === 0) {
      toast.error('Please select at least one product');
      return;
    }
    setBulkAction(action);
    setBulkActionDialogOpen(true);
  };

  const confirmBulkAction = () => {
    if (bulkAction === 'delete') {
      bulkDeleteMutation.mutate(selectedProducts);
    } else if (bulkAction === 'duplicate') {
      bulkDuplicateMutation.mutate(selectedProducts);
    }
  };

  const handleStatusClick = (product) => {
    toggleStatusMutation.mutate(product.id);
  };

  const startEditing = (productId, field, currentValue) => {
    setEditingCell({ productId, field, value: currentValue });
  };

  const saveEdit = () => {
    if (!editingCell) return;
    
    const { productId, field, value } = editingCell;
    
    let updateData = {};
    if (field === 'stockQuantity') {
      updateData.stockQuantity = parseInt(value);
    } else if (field === 'price') {
      updateData.price = parseFloat(value);
    } else if (field === 'compareAtPrice') {
      updateData.compareAtPrice = value ? parseFloat(value) : null;
    }
    
    updateProductMutation.mutate({ productId, data: updateData });
  };

  const cancelEdit = () => {
    setEditingCell(null);
  };

  const handleOpenVariants = async (product) => {
    setSelectedProductVariants(product);
    setVariantsDialogOpen(true);
    
    try {
      const productVariants = await fetchVariants(product.id);
      setVariants(productVariants || []);
    } catch (error) {
      setVariants([]);
    }
  };

  const allSelected = filteredProducts.length > 0 && selectedProducts.length === filteredProducts.length;
  const someSelected = selectedProducts.length > 0 && !allSelected;
  const activeFiltersCount = [categoryFilter !== 'all', statusFilter !== 'all', stockFilter !== 'all'].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 mt-1">Manage your product inventory</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/products/add">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Link>
        </Button>
      </div>

      {/* Filters & Bulk Actions */}
      <div className="flex items-center gap-4 flex-wrap">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge className="ml-2 bg-blue-600">{activeFiltersCount}</Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Stock Level</Label>
                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stock</SelectItem>
                    <SelectItem value="zero">Out of Stock (0)</SelectItem>
                    <SelectItem value="low">Low (1-3)</SelectItem>
                    <SelectItem value="medium">Medium (5-10)</SelectItem>
                    <SelectItem value="high">High (10+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Bulk Actions */}
        {selectedProducts.length > 0 && (
          <div className="flex items-center gap-2 flex-1 justify-end">
            <span className="text-sm text-gray-600">
              {selectedProducts.length} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('duplicate')}
            >
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('delete')}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedProducts([])}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Products table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading products...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-4">
              {data?.products?.length === 0 ? 'No products yet' : 'No products match the filters'}
            </p>
            {data?.products?.length === 0 ? (
              <Button asChild>
                <Link href="/dashboard/products/add">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Product
                </Link>
              </Button>
            ) : (
              <Button variant="outline" onClick={() => {
                setCategoryFilter('all');
                setStatusFilter('all');
                setStockFilter('all');
              }}>
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center justify-center w-full"
                    >
                      {allSelected ? (
                        <CheckSquare className="h-5 w-5 text-blue-600" />
                      ) : someSelected ? (
                        <div className="h-5 w-5 border-2 border-blue-600 bg-blue-100 rounded flex items-center justify-center">
                          <div className="h-2 w-2 bg-blue-600 rounded-sm" />
                        </div>
                      ) : (
                        <Square className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Compare Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Variants</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <button
                        onClick={() => toggleSelectProduct(product.id)}
                        className="flex items-center justify-center w-full"
                      >
                        {selectedProducts.includes(product.id) ? (
                          <CheckSquare className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        {product.images?.[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-12 h-12 rounded object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-400 text-xs">No image</span>
                          </div>
                        )}
                        <div>
                          <Link 
                            href={`/dashboard/products/edit/${product.id}`}
                            className="font-medium text-gray-900 hover:text-blue-600 cursor-pointer"
                          >
                            {product.name}
                          </Link>
                          <p className="text-sm text-gray-500">SKU: {product.sku || 'N/A'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {product.category?.name || 'Uncategorized'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {editingCell?.productId === product.id && editingCell?.field === 'price' ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={editingCell.value}
                            onChange={(e) => setEditingCell({...editingCell, value: e.target.value})}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="w-24 h-8"
                            autoFocus
                          />
                          <Button size="sm" onClick={saveEdit}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={cancelEdit}>✕</Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditing(product.id, 'price', product.price)}
                          className="font-semibold hover:text-blue-600 cursor-pointer"
                        >
                          ${product.price.toFixed(2)}
                        </button>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingCell?.productId === product.id && editingCell?.field === 'compareAtPrice' ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={editingCell.value}
                            onChange={(e) => setEditingCell({...editingCell, value: e.target.value})}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="w-24 h-8"
                            autoFocus
                          />
                          <Button size="sm" onClick={saveEdit}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={cancelEdit}>✕</Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditing(product.id, 'compareAtPrice', product.compareAtPrice || '')}
                          className="text-gray-500 line-through hover:text-blue-600 cursor-pointer"
                        >
                          {product.compareAtPrice ? `$${product.compareAtPrice.toFixed(2)}` : '—'}
                        </button>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingCell?.productId === product.id && editingCell?.field === 'stockQuantity' ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={editingCell.value}
                            onChange={(e) => setEditingCell({...editingCell, value: e.target.value})}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="w-20 h-8"
                            autoFocus
                          />
                          <Button size="sm" onClick={saveEdit}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={cancelEdit}>✕</Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditing(product.id, 'stockQuantity', product.stockQuantity)}
                          className={`font-medium hover:text-blue-600 cursor-pointer ${product.stockQuantity < 10 ? 'text-red-600' : ''}`}
                        >
                          {product.stockQuantity}
                        </button>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenVariants(product)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        View ({product._count?.variants || 0})
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={`cursor-pointer ${product.isActive ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                        onClick={() => handleStatusClick(product)}
                      >
                        {product.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Bulk action confirmation */}
      <AlertDialog open={bulkActionDialogOpen} onOpenChange={setBulkActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Action</AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction === 'delete' && `Delete ${selectedProducts.length} product(s)? This cannot be undone.`}
              {bulkAction === 'duplicate' && `Duplicate ${selectedProducts.length} product(s)?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkAction}
              className={bulkAction === 'delete' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Variants Dialog */}
      <Dialog open={variantsDialogOpen} onOpenChange={setVariantsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Variants - {selectedProductVariants?.name}</DialogTitle>
            <DialogDescription>
              Update stock quantities for each variant
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {variants.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No variants for this product</p>
            ) : (
              <div className="space-y-3">
                {variants.map((variant) => (
                  <div key={variant.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">
                        {variant.color && `${variant.color}`}
                        {variant.color && variant.size && ' - '}
                        {variant.size && `${variant.size}`}
                      </p>
                      <p className="text-sm text-gray-500">
                        ${variant.price.toFixed(2)} • SKU: {variant.sku || 'N/A'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Stock:</Label>
                      <Input
                        type="number"
                        defaultValue={variant.stockQuantity}
                        className="w-20"
                        onBlur={(e) => {
                          if (e.target.value !== variant.stockQuantity.toString()) {
                            updateVariantMutation.mutate({
                              variantId: variant.id,
                              stockQuantity: e.target.value
                            });
                          }
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setVariantsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
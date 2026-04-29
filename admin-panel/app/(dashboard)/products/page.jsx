'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRawProducts, getRawProductFilters, createListing, bulkCreateListings, getCategories } from '@/lib/services/storefront';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Plus, Package, X } from 'lucide-react';
import { toast } from 'sonner';

export default function ProductsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', brand: '', categoryId: '', collection: '', minPrice: '', maxPrice: '' });
  const [selected, setSelected] = useState(new Set());
  const [addDialog, setAddDialog] = useState(null);
  const [bulkDialog, setBulkDialog] = useState(false);
  const [formData, setFormData] = useState({ displayPrice: '', categoryId: '', isPublished: true });
  const [bulkData, setBulkData] = useState({ markupPercent: '30', isPublished: false });

  const activeFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));

  const { data: productsRes, isLoading } = useQuery({
    queryKey: ['raw-products', search, page, activeFilters],
    queryFn: () => getRawProducts({ search, page, limit: 20, ...activeFilters }),
  });

  const { data: categoriesRes } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const { data: filtersRes } = useQuery({
    queryKey: ['raw-product-filters'],
    queryFn: getRawProductFilters,
  });

  const products = productsRes?.data || [];
  const pagination = productsRes?.pagination;
  const categories = categoriesRes?.data || [];
  const filterOptions = filtersRes?.data || {};
  const brands = filterOptions.brands || [];
  const collections = filterOptions.collections || [];

  function setFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  function clearFilters() {
    setFilters({ status: '', brand: '', categoryId: '', collection: '', minPrice: '', maxPrice: '' });
    setPage(1);
  }

  const hasActiveFilters = Object.values(filters).some(Boolean);

  const createMutation = useMutation({
    mutationFn: (data) => createListing(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw-products'] });
      setAddDialog(null);
      setFormData({ displayPrice: '', categoryId: '', isPublished: true });
      toast.success('Product added to storefront');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to add'),
  });

  const bulkMutation = useMutation({
    mutationFn: (data) => bulkCreateListings(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['raw-products'] });
      setBulkDialog(false);
      setSelected(new Set());
      setBulkData({ markupPercent: '30', isPublished: false });
      toast.success(`${res.created} listings created${res.skipped ? `, ${res.skipped} skipped` : ''}`);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Bulk add failed'),
  });

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const unlistedIds = products.filter((p) => !p.hasListing).map((p) => p.id);
    if (unlistedIds.every((id) => selected.has(id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(unlistedIds));
    }
  }

  function handleAdd(e, product) {
    e.stopPropagation();
    setFormData({ displayPrice: '', categoryId: product.category?.id || '', isPublished: true });
    setAddDialog(product);
  }

  function submitAdd() {
    const body = {
      productId: addDialog.id,
      isPublished: formData.isPublished,
    };
    if (formData.displayPrice) body.displayPrice = parseFloat(formData.displayPrice);
    if (formData.categoryId) body.categoryId = formData.categoryId;
    createMutation.mutate(body);
  }

  function submitBulk() {
    const markup = parseFloat(bulkData.markupPercent);
    const body = {
      productIds: [...selected],
      isPublished: bulkData.isPublished,
    };
    if (markup > 0) {
      body.pricingRule = { type: 'markup', percent: markup };
    }
    bulkMutation.mutate(body);
  }

  function formatPrice(price) {
    return price != null ? `$${Number(price).toFixed(2)}` : '—';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Wondersign Products</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse raw products and add them to your storefront. Click a row to view full details.
          </p>
        </div>
        {selected.size > 0 && (
          <Button onClick={() => setBulkDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Bulk Add ({selected.size})
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, SKU, brand..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={filters.status} onValueChange={(v) => setFilter('status', v)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="unlisted">Not Listed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.brand} onValueChange={(v) => setFilter('brand', v)}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Brand" />
            </SelectTrigger>
            <SelectContent>
              {brands.map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.categoryId} onValueChange={(v) => setFilter('categoryId', v)}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.collection} onValueChange={(v) => setFilter('collection', v)}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Collection" />
            </SelectTrigger>
            <SelectContent>
              {collections.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            <Input
              type="number"
              placeholder="Min $"
              value={filters.minPrice}
              onChange={(e) => setFilter('minPrice', e.target.value)}
              className="w-[90px] h-8 text-xs"
            />
            <span className="text-xs text-muted-foreground">–</span>
            <Input
              type="number"
              placeholder="Max $"
              value={filters.maxPrice}
              onChange={(e) => setFilter('maxPrice', e.target.value)}
              className="w-[90px] h-8 text-xs"
            />
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
              <X className="h-3 w-3 mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={
                    products.filter((p) => !p.hasListing).length > 0 &&
                    products.filter((p) => !p.hasListing).every((p) => selected.has(p.id))
                  }
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="w-16">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>SKUs</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Variants</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow
                  key={product.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/products/${product.id}`)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {!product.hasListing && (
                      <Checkbox
                        checked={selected.has(product.id)}
                        onCheckedChange={() => toggleSelect(product.id)}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {product.mainImage ? (
                      <img
                        src={product.mainImage}
                        alt={product.name}
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{product.name}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {product.brand || '—'}
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">
                    {product.variants?.length > 0 ? (
                      <div className="space-y-0.5">
                        {product.variants.map((v, i) => (
                          <div key={i} className="truncate max-w-[140px]" title={v.sku}>
                            {v.sku || '—'}
                          </div>
                        ))}
                      </div>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {product.variants?.length > 0 ? (
                      <div className="space-y-0.5">
                        {product.variants.map((v, i) => (
                          <div key={i} className="whitespace-nowrap">
                            {formatPrice(v.price?.retailPrice)}
                          </div>
                        ))}
                      </div>
                    ) : formatPrice(product.minPrice)}
                  </TableCell>
                  <TableCell className="text-sm">{product._count?.variants ?? 0}</TableCell>
                  <TableCell>
                    {product.isOnStorefront ? (
                      <Badge variant="default">Published</Badge>
                    ) : product.hasListing ? (
                      <Badge variant="secondary">Draft</Badge>
                    ) : (
                      <Badge variant="outline">Not Listed</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {!product.hasListing ? (
                      <Button size="sm" variant="outline" onClick={(e) => handleAdd(e, product)}>
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">On storefront</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1}-
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Add Single Product Dialog */}
      <Dialog open={!!addDialog} onOpenChange={(open) => !open && setAddDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Storefront</DialogTitle>
          </DialogHeader>
          {addDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Adding <strong>{addDialog.name}</strong> (raw price: {formatPrice(addDialog.minPrice)})
              </p>
              <div className="space-y-2">
                <Label>Display Price (leave empty to use raw price)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={addDialog.minPrice?.toString()}
                  value={formData.displayPrice}
                  onChange={(e) => setFormData((f) => ({ ...f, displayPrice: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(val) => setFormData((f) => ({ ...f, categoryId: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="publish"
                  checked={formData.isPublished}
                  onCheckedChange={(v) => setFormData((f) => ({ ...f, isPublished: v }))}
                />
                <Label htmlFor="publish">Publish immediately</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(null)}>Cancel</Button>
            <Button onClick={submitAdd} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Adding...' : 'Add to Storefront'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Add Dialog */}
      <Dialog open={bulkDialog} onOpenChange={setBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Add to Storefront</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Adding <strong>{selected.size}</strong> products to storefront
            </p>
            <div className="space-y-2">
              <Label>Markup % (applied as pricing rule)</Label>
              <Input
                type="number"
                value={bulkData.markupPercent}
                onChange={(e) => setBulkData((d) => ({ ...d, markupPercent: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="bulkPublish"
                checked={bulkData.isPublished}
                onCheckedChange={(v) => setBulkData((d) => ({ ...d, isPublished: v }))}
              />
              <Label htmlFor="bulkPublish">Publish immediately</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialog(false)}>Cancel</Button>
            <Button onClick={submitBulk} disabled={bulkMutation.isPending}>
              {bulkMutation.isPending ? 'Adding...' : `Add ${selected.size} Products`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

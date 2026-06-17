'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Read initial state from URL
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get('search') || '');
  const [filters, setFilters] = useState(() => ({
    status: searchParams.get('status') || '',
    brand: searchParams.get('brand') || '',
    categoryId: searchParams.get('categoryId') || '',
    collection: searchParams.get('collection') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    acmeStatus: searchParams.get('acmeStatus') || '',
  }));
  // Cursor stack for back navigation: [null, cursor1, cursor2, ...]
  const [cursorStack, setCursorStack] = useState([null]);
  const [stackIndex, setStackIndex] = useState(0);
  const currentCursor = cursorStack[stackIndex];

  const [selected, setSelected] = useState(new Set());
  const [addDialog, setAddDialog] = useState(null);
  const [bulkDialog, setBulkDialog] = useState(false);
  const [formData, setFormData] = useState({ displayPrice: '', categoryId: '', isPublished: true });
  const [bulkData, setBulkData] = useState({ markupPercent: '30', isPublished: false });

  // Sync state to URL
  const updateUrl = useCallback((newSearch, newFilters) => {
    const params = new URLSearchParams();
    if (newSearch) params.set('search', newSearch);
    Object.entries(newFilters).forEach(([k, v]) => { if (v) params.set(k, v); });
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [pathname, router]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setCursorStack([null]);
      setStackIndex(0);
      updateUrl(search, filters);
    }, 300);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));

  const { data: productsRes, isLoading, isFetching } = useQuery({
    queryKey: ['raw-products', debouncedSearch, currentCursor, activeFilters],
    queryFn: () => getRawProducts({ search: debouncedSearch, cursor: currentCursor || undefined, limit: 20, ...activeFilters }),
    placeholderData: keepPreviousData,
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
  const categories = categoriesRes?.data || [];
  const filterOptions = filtersRes?.data || {};
  const brands = filterOptions.brands || [];
  const collections = filterOptions.collections || [];
  const categoryOptions = filterOptions.categories || [];

  function setFilter(key, value) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    setCursorStack([null]);
    setStackIndex(0);
    updateUrl(debouncedSearch, next);
  }

  function clearFilters() {
    const empty = { status: '', brand: '', categoryId: '', collection: '', minPrice: '', maxPrice: '', acmeStatus: '' };
    setFilters(empty);
    setSearch('');
    setDebouncedSearch('');
    setCursorStack([null]);
    setStackIndex(0);
    router.replace(pathname, { scroll: false });
  }

  const hasActiveFilters = Object.values(filters).some(Boolean) || !!search;

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
    const selectableIds = products.filter((p) => !p.hasListing && p.isActive).map((p) => p.id);
    if (selectableIds.every((id) => selected.has(id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectableIds));
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
          <h1 className="text-2xl font-semibold">Raw Products</h1>
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
              {categoryOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
              <SelectItem value="uncategorized">Uncategorized</SelectItem>
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

          <Select value={filters.acmeStatus} onValueChange={(v) => setFilter('acmeStatus', v)}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="ACME Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="DISABLED">Disconnected</SelectItem>
              <SelectItem value="REMOVED">Deleted</SelectItem>
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

      <div className={`border rounded-lg transition-opacity duration-150 ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
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
              <TableHead className="w-36">Action</TableHead>
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
                    {!product.hasListing && product.isActive && (
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
                    <div className="truncate max-w-[140px]" title={product.variants?.[0]?.sku}>
                      {product.variants?.[0]?.sku || '—'}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatPrice(product.variants?.[0]?.price?.retailPrice ?? product.minPrice)}
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
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {product.hasListing ? (
                      <span className="text-xs text-muted-foreground">On storefront</span>
                    ) : product.isActive ? (
                      <Button size="sm" variant="outline" onClick={(e) => handleAdd(e, product)}>
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    ) : product.acmeStatus === 'REMOVED' ? (
                      <Badge variant="destructive" className="text-xs">Omitted</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Disconnected</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {(stackIndex > 0 || productsRes?.pagination?.hasMore) && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={stackIndex === 0}
            onClick={() => setStackIndex((i) => i - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!productsRes?.pagination?.hasMore}
            onClick={() => {
              const nextCursor = productsRes.pagination.nextCursor;
              setCursorStack((s) => {
                const next = s.slice(0, stackIndex + 1);
                next.push(nextCursor);
                return next;
              });
              setStackIndex((i) => i + 1);
            }}
          >
            Next
          </Button>
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

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
import Image from 'next/image';
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
    source: searchParams.get('source') || '',
    stock: searchParams.get('stock') || '',
    brand: searchParams.get('brand') || '',
    categoryId: searchParams.get('categoryId') || '',
    collection: searchParams.get('collection') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    acmeStatus: searchParams.get('acmeStatus') || '',
  }));
  const [activeTab, setActiveTab] = useState('all');

  const [page, setPage] = useState(1);

  function switchTab(tab) {
    setActiveTab(tab);
    setPage(1);
  }

  const [selected, setSelected] = useState(new Set());
  const [addDialog, setAddDialog] = useState(null);
  const [bulkDialog, setBulkDialog] = useState(false);
  const [formData, setFormData] = useState({ mainCategoryId: '', subCategoryId: '', isPublished: true });
  const [bulkData, setBulkData] = useState({ isPublished: false });

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
      setPage(1);
      updateUrl(search, filters);
    }, 300);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));

  const { data: productsRes, isLoading, isFetching } = useQuery({
    queryKey: ['raw-products', debouncedSearch, page, activeFilters, activeTab],
    queryFn: () => getRawProducts({
      search: debouncedSearch,
      page,
      limit: 20,
      ...activeFilters,
      ...(activeTab !== 'all' ? { source: activeTab } : {}),
    }),
    placeholderData: keepPreviousData,
  });

  const { data: categoriesRes } = useQuery({
    queryKey: ['categories', 'hierarchy'],
    queryFn: () => getCategories({ parentOnly: 'true' }),
  });

  const { data: filtersRes } = useQuery({
    queryKey: ['raw-product-filters', activeTab],
    queryFn: () => getRawProductFilters(activeTab !== 'all' ? { source: activeTab } : {}),
  });

  const products = productsRes?.data || [];
  const categories = categoriesRes?.data || [];
  const filterOptions = filtersRes?.data || {};
  const collections = filterOptions.collections || [];
  const categoryOptions = filterOptions.categories || [];

  function setFilter(key, value) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    setPage(1);
    updateUrl(debouncedSearch, next);
  }

  function clearFilters() {
    const empty = { status: '', source: '', stock: '', brand: '', categoryId: '', collection: '', minPrice: '', maxPrice: '', acmeStatus: '' };
    setFilters(empty);
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
    setActiveTab('all');
    router.replace(pathname, { scroll: false });
  }

  const hasActiveFilters = Object.values(filters).some(Boolean) || !!search || activeTab !== 'all';

  const createMutation = useMutation({
    mutationFn: (data) => createListing(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw-products'] });
      setAddDialog(null);
      setFormData({ mainCategoryId: '', subCategoryId: '', isPublished: true });
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
      setBulkData({ isPublished: false });
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

  // When a product has no variants, synthesize a single product-level row so the
  // pricing table always appears with the same Cost | MAP | Display Price layout.


  function handleAdd(e, product) {
    e.stopPropagation();
    let mainCategoryId = '';
    let subCategoryId = '';
    if (product.category) {
      const catId = product.category.id;
      // Search the loaded categories tree: if this category appears as a child, derive parent from the tree
      const parentCat = categories.find((c) => c.children?.some((ch) => ch.id === catId));
      if (parentCat) {
        mainCategoryId = parentCat.id;
        subCategoryId = catId;
      } else {
        mainCategoryId = catId;
      }
    }
    setFormData({ mainCategoryId, subCategoryId, isPublished: true });
    setAddDialog(product);
  }

  function handleMainCategoryChange(value) {
    setFormData((f) => ({ ...f, mainCategoryId: value, subCategoryId: '' }));
  }

  function submitAdd() {
    const body = {
      productId: addDialog.id,
      isPublished: formData.isPublished,
    };
    const categoryId = formData.subCategoryId || formData.mainCategoryId;
    if (categoryId) body.categoryId = categoryId;
    createMutation.mutate(body);
  }

  function submitBulk() {
    bulkMutation.mutate({
      productIds: [...selected],
      isPublished: bulkData.isPublished,
    });
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

      {/* Vendor Tabs */}
      <div className="flex items-center border-b">
        {[
          { key: 'all', label: 'All' },
          { key: 'UW', label: 'United Weavers' },
          { key: 'ACME', label: 'ACME' },
          { key: 'GFW', label: 'Global Furniture' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => switchTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, SKU, brand..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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

          {activeTab === 'all' && (
            <Select value={filters.source} onValueChange={(v) => setFilter('source', v)}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACME">ACME</SelectItem>
                <SelectItem value="GFW">Global Furniture</SelectItem>
                <SelectItem value="UW">United Weavers</SelectItem>
                <SelectItem value="WONDERSIGN">Wondersign</SelectItem>
                <SelectItem value="MANUAL">Manual</SelectItem>
              </SelectContent>
            </Select>
          )}

          <div className="flex items-center gap-1">
            <Input
              type="number"
              min="0"
              placeholder="Min stock"
              value={filters.stock}
              onChange={(e) => setFilter('stock', e.target.value)}
              className="w-[100px] h-8 text-xs"
            />
            <span className="text-xs text-muted-foreground">+</span>
          </div>

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

          {(activeTab === 'all' || activeTab === 'ACME') && (
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
          )}

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
              <TableHead>Stock</TableHead>
              <TableHead>Variants</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-36">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
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
                      <div className="relative w-10 h-10 rounded overflow-hidden">
                        <Image
                          src={product.mainImage}
                          alt={product.name}
                          fill
                          sizes="40px"
                          className="object-cover"
                          loading="lazy"
                          unoptimized={!product.mainImage.includes('amazonaws.com')}
                        />
                      </div>
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
                  <TableCell className={`text-sm ${(product.totalStock ?? 0) <= 3 ? 'text-destructive font-medium' : ''}`}>{product.totalStock ?? 0}</TableCell>
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

      {productsRes?.pagination?.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <p className="text-sm text-muted-foreground mr-2">
            Page {productsRes.pagination.page} of {productsRes.pagination.totalPages} ({productsRes.pagination.totalCount} products)
          </p>
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(1)}>«</Button>
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <Button variant="outline" size="sm" disabled={!productsRes.pagination.hasMore} onClick={() => setPage(p => p + 1)}>Next</Button>
          <Button variant="outline" size="sm" disabled={!productsRes.pagination.hasMore} onClick={() => setPage(productsRes.pagination.totalPages)}>»</Button>
        </div>
      )}

      {/* Add Single Product Dialog */}
      <Dialog open={!!addDialog} onOpenChange={(open) => !open && setAddDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add to Storefront</DialogTitle>
          </DialogHeader>
          {addDialog && (() => {
            const subCategories = categories.find((c) => c.id === formData.mainCategoryId)?.children || [];
            return (
              <div className="space-y-4">
                <p className="text-sm font-medium">{addDialog.name}</p>


                {/* Main Category */}
                <div className="space-y-2">
                  <Label>Main Category</Label>
                  <Select value={formData.mainCategoryId} onValueChange={handleMainCategoryChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select main category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sub Category */}
                {subCategories.length > 0 && (
                  <div className="space-y-2">
                    <Label>Sub Category</Label>
                    <Select value={formData.subCategoryId} onValueChange={(val) => setFormData((f) => ({ ...f, subCategoryId: val }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sub category" />
                      </SelectTrigger>
                      <SelectContent>
                        {subCategories.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="publish"
                    checked={formData.isPublished}
                    onCheckedChange={(v) => setFormData((f) => ({ ...f, isPublished: v }))}
                  />
                  <Label htmlFor="publish">Publish immediately</Label>
                </div>
              </div>
            );
          })()}
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
              Adding <strong>{selected.size}</strong> products to storefront. Display prices will be auto-calculated from Price Settings.
            </p>
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

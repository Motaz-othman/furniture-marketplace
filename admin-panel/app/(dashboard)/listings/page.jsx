'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getListings, updateListing, deleteListing, bulkUpdateListings, bulkDeleteListings, getCategories, getRawProductFilters } from '@/lib/services/storefront';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Pencil, Trash2, Package, Search, X } from 'lucide-react';
import { toast } from 'sonner';

function InlineEdit({ value, onSave, type = 'number', placeholder, prefix }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  function startEdit() {
    setDraft(value != null ? String(value) : '');
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commit() {
    setEditing(false);
    const parsed = type === 'number'
      ? (draft.trim() === '' ? null : Number(draft))
      : draft.trim() || null;
    if (parsed !== value) onSave(parsed);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') setEditing(false);
  }

  if (editing) {
    return (
      <Input
        ref={inputRef}
        type={type}
        step={type === 'number' ? '0.01' : undefined}
        className="h-7 w-24 text-sm"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
      />
    );
  }

  return (
    <button
      onClick={startEdit}
      className="block text-sm hover:bg-muted px-1.5 py-0.5 rounded cursor-pointer text-left min-w-15"
      title="Click to edit"
    >
      {value != null ? `${prefix || ''}${type === 'number' && prefix === '$' ? Number(value).toFixed(2) : value}` : (
        <span className="text-muted-foreground italic">{placeholder || 'Set'}</span>
      )}
    </button>
  );
}

export default function ListingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  const [filters, setFilters] = useState({ status: '', brand: '', categoryId: '', isTrending: '', isNewArrival: '', minPrice: '', maxPrice: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [bulkCategoryDialog, setBulkCategoryDialog] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState('');

  const activeFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
  const hasActiveFilters = Object.values(filters).some(Boolean);

  function setFilter(key, value) {
    setFilters(f => ({ ...f, [key]: value }));
    setPage(1);
  }

  function clearFilters() {
    setFilters({ status: '', brand: '', categoryId: '', isTrending: '', isNewArrival: '', minPrice: '', maxPrice: '' });
    setSearch('');
    setPage(1);
  }

  const queryParams = { page, limit: 20 };
  if (debouncedSearch) queryParams.search = debouncedSearch;
  if (activeFilters.status === 'published') queryParams.isPublished = 'true';
  if (activeFilters.status === 'drafts') queryParams.isPublished = 'false';
  if (activeFilters.brand) queryParams.brand = activeFilters.brand;
  if (activeFilters.categoryId) queryParams.categoryId = activeFilters.categoryId;
  if (activeFilters.isTrending) queryParams.isTrending = activeFilters.isTrending;
  if (activeFilters.isNewArrival) queryParams.isNewArrival = activeFilters.isNewArrival;
  if (activeFilters.minPrice) queryParams.minPrice = activeFilters.minPrice;
  if (activeFilters.maxPrice) queryParams.maxPrice = activeFilters.maxPrice;

  const { data: listingsRes, isLoading } = useQuery({
    queryKey: ['listings', debouncedSearch, page, activeFilters],
    queryFn: () => getListings(queryParams),
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

  const categories = categoriesRes?.data || [];
  const brands = filtersRes?.data?.brands || [];

  const listings = listingsRes?.data || [];
  const pagination = listingsRes?.pagination;

  const cacheKey = ['listings', debouncedSearch, page, activeFilters];

  const toggleMutation = useMutation({
    mutationFn: ({ id, field, value }) => updateListing(id, { [field]: value }),
    onMutate: async ({ id, field, value }) => {
      await queryClient.cancelQueries({ queryKey: cacheKey });
      const previous = queryClient.getQueryData(cacheKey);
      queryClient.setQueryData(cacheKey, (old) => {
        if (!old) return old;
        return { ...old, data: old.data.map((l) => (l.id === id ? { ...l, [field]: value } : l)) };
      });
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(cacheKey, context.previous);
      toast.error(err.response?.data?.error || 'Update failed');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['listings'] }),
  });

  const fieldMutation = useMutation({
    mutationFn: ({ id, data }) => updateListing(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: cacheKey });
      const previous = queryClient.getQueryData(cacheKey);
      queryClient.setQueryData(cacheKey, (old) => {
        if (!old) return old;
        return { ...old, data: old.data.map((l) => (l.id === id ? { ...l, ...data } : l)) };
      });
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(cacheKey, context.previous);
      toast.error(err.response?.data?.error || 'Update failed');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['listings'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['raw-products'] });
      setDeleteTarget(null);
      toast.success('Listing removed from storefront');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Delete failed'),
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: ({ ids, data }) => bulkUpdateListings(ids, data),
    onSuccess: (_, { data }) => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      setSelected(new Set());
      setBulkCategoryDialog(false);
      setBulkCategoryId('');
      const label = data.isPublished === true ? 'Published' : data.isPublished === false ? 'Unpublished' : 'Updated';
      toast.success(`${label} ${[...selected].length} listings`);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Bulk update failed'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) => bulkDeleteListings(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['raw-products'] });
      setSelected(new Set());
      setBulkDeleteDialog(false);
      toast.success(`Removed ${[...selected].length} listings`);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Bulk delete failed'),
  });

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (listings.every((l) => selected.has(l.id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(listings.map((l) => l.id)));
    }
  }

  function handleToggle(listing, field) {
    toggleMutation.mutate({ id: listing.id, field, value: !listing[field] });
  }

  function formatPrice(val) {
    return val != null ? `$${Number(val).toFixed(2)}` : '—';
  }

  function displayName(listing) {
    return listing.displayName || listing.product?.name || 'Unnamed';
  }

  function saveVariantPrice(listing, variantId, price) {
    const current = listing.variantPrices || {};
    const updated = { ...current };
    if (price == null) {
      delete updated[variantId];
    } else {
      updated[variantId] = price;
    }
    fieldMutation.mutate({ id: listing.id, data: { variantPrices: updated } });
  }

  function saveVariantStock(listing, variantId, qty) {
    const current = listing.variantStocks || {};
    const updated = { ...current };
    if (qty == null) {
      delete updated[variantId];
    } else {
      updated[variantId] = parseInt(qty);
    }
    fieldMutation.mutate({ id: listing.id, data: { variantStocks: updated } });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Storefront Listings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your published products and drafts
        </p>
      </div>

      <div className="space-y-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, SKU, brand..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
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
              <SelectItem value="drafts">Drafts</SelectItem>
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

          <Select value={filters.isTrending} onValueChange={(v) => setFilter('isTrending', v)}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Trending" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Trending</SelectItem>
              <SelectItem value="false">Not Trending</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.isNewArrival} onValueChange={(v) => setFilter('isNewArrival', v)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="New Arrival" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">New Arrival</SelectItem>
              <SelectItem value="false">Not New Arrival</SelectItem>
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
            <span className="text-xs text-muted-foreground">&ndash;</span>
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

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border">
          <span className="text-sm font-medium mr-2">{selected.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => bulkUpdateMutation.mutate({ ids: [...selected], data: { isPublished: true } })} disabled={bulkUpdateMutation.isPending}>
            Publish
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkUpdateMutation.mutate({ ids: [...selected], data: { isPublished: false } })} disabled={bulkUpdateMutation.isPending}>
            Unpublish
          </Button>
          <Button size="sm" variant="outline" onClick={() => setBulkCategoryDialog(true)}>
            Set Category
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setBulkDeleteDialog(true)}>
            Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={listings.length > 0 && listings.every((l) => selected.has(l.id))}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="w-16">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Display Price</TableHead>
              <TableHead>Discounted Price</TableHead>
              <TableHead>Available Stock</TableHead>
              <TableHead>My Stock</TableHead>
              <TableHead className="text-center w-16 px-1">Published</TableHead>
              <TableHead className="text-center w-16 px-1">Trending</TableHead>
              <TableHead className="text-center w-20 px-1">New Arrival</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : listings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">
                  No listings found. Add products from the Wondersign Products page.
                </TableCell>
              </TableRow>
            ) : (
              listings.map((listing) => (
                <TableRow key={listing.id} data-state={selected.has(listing.id) ? 'selected' : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(listing.id)}
                      onCheckedChange={() => toggleSelect(listing.id)}
                    />
                  </TableCell>
                  <TableCell>
                    {listing.product?.mainImage ? (
                      <div className="relative w-10 h-10 rounded overflow-hidden">
                        <Image
                          src={listing.product.mainImage}
                          alt={displayName(listing)}
                          fill
                          sizes="40px"
                          className="object-cover"
                          loading="lazy"
                          unoptimized={!listing.product.mainImage.includes('amazonaws.com')}
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div
                      className="font-medium text-primary hover:underline cursor-pointer"
                      onClick={() => router.push(`/listings/${listing.id}`)}
                    >
                      {displayName(listing)}
                    </div>
                    {listing.displayName && (
                      <div className="text-xs text-muted-foreground">
                        Raw: {listing.product?.name}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {listing.product?.brand || '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {listing.product?.variants?.length > 0 ? (
                      <div className="space-y-1">
                        {listing.product.variants.map((v) => (
                          <div key={v.id} className="text-xs text-muted-foreground whitespace-nowrap h-7 flex items-center">
                            {v.sku || '—'}
                          </div>
                        ))}
                      </div>
                    ) : '—'}
                  </TableCell>
                  {/* Cost (read-only supplier cost) */}
                  <TableCell>
                    {listing.product?.variants?.length > 0 ? (
                      <div className="space-y-0.5">
                        {listing.product.variants.map((v) => (
                          <div key={v.id} className="text-xs text-muted-foreground whitespace-nowrap h-7 flex items-center">
                            {formatPrice(v.price?.cost)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {formatPrice(listing.product?.variants?.[0]?.price?.cost)}
                      </span>
                    )}
                  </TableCell>
                  {/* Display Price (editable selling price with margin) */}
                  <TableCell>
                    {listing.product?.variants?.length > 0 ? (
                      <div className="space-y-1">
                        {listing.product.variants.map((v) => (
                          <InlineEdit
                            key={v.id}
                            value={listing.variantPrices?.[v.id] ?? listing.displayPrice ?? null}
                            placeholder={formatPrice(v.price?.retailPrice)}
                            prefix="$"
                            onSave={(val) => saveVariantPrice(listing, v.id, val)}
                          />
                        ))}
                      </div>
                    ) : (
                      <InlineEdit
                        value={listing.displayPrice}
                        placeholder={formatPrice(listing.product?.minPrice)}
                        prefix="$"
                        onSave={(val) => fieldMutation.mutate({ id: listing.id, data: { displayPrice: val } })}
                      />
                    )}
                  </TableCell>
                  {/* Discounted Price (editable sale price) */}
                  <TableCell>
                    <InlineEdit
                      value={listing.discountedPrice}
                      placeholder="—"
                      prefix="$"
                      onSave={(val) => fieldMutation.mutate({ id: listing.id, data: { discountedPrice: val } })}
                    />
                  </TableCell>
                  <TableCell>
                    {listing.product?.variants?.length > 0 ? (
                      <div className="space-y-1">
                        {listing.product.variants.map((v) => (
                          <div key={v.id} className="text-xs text-muted-foreground h-7 flex items-center">
                            {v.stockQuantity ?? 0}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm">{listing.product?.totalStock ?? '—'}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {listing.product?.variants?.length > 0 ? (
                      <div className="space-y-1">
                        {listing.product.variants.map((v) => (
                          <InlineEdit
                            key={v.id}
                            value={listing.variantStocks?.[v.id] ?? null}
                            placeholder={String(v.stockQuantity ?? 0)}
                            onSave={(val) => saveVariantStock(listing, v.id, val)}
                          />
                        ))}
                      </div>
                    ) : (
                      <InlineEdit
                        value={listing.displayStock}
                        placeholder={String(listing.product?.totalStock ?? 0)}
                        onSave={(val) => fieldMutation.mutate({ id: listing.id, data: { displayStock: val != null ? parseInt(val) : null } })}
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch size="sm" checked={listing.isPublished} onCheckedChange={() => handleToggle(listing, 'isPublished')} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch size="sm" checked={listing.isTrending} onCheckedChange={() => handleToggle(listing, 'isTrending')} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch size="sm" checked={listing.isNewArrival} onCheckedChange={() => handleToggle(listing, 'isNewArrival')} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => router.push(`/listings/${listing.id}`)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setDeleteTarget(listing)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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

      {/* Bulk Delete Confirmation */}
      <Dialog open={bulkDeleteDialog} onOpenChange={(open) => !open && setBulkDeleteDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {selected.size} listings</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently remove {selected.size} listing{selected.size !== 1 ? 's' : ''} from the storefront. The raw products will still be available to re-add later.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => bulkDeleteMutation.mutate([...selected])}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? 'Removing...' : `Remove ${selected.size}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Category Assignment */}
      <Dialog open={bulkCategoryDialog} onOpenChange={(open) => { if (!open) { setBulkCategoryDialog(false); setBulkCategoryId(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Category for {selected.size} listings</DialogTitle>
          </DialogHeader>
          <Select value={bulkCategoryId} onValueChange={setBulkCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBulkCategoryDialog(false); setBulkCategoryId(''); }}>Cancel</Button>
            <Button
              onClick={() => bulkUpdateMutation.mutate({ ids: [...selected], data: { categoryId: bulkCategoryId } })}
              disabled={!bulkCategoryId || bulkUpdateMutation.isPending}
            >
              {bulkUpdateMutation.isPending ? 'Saving...' : 'Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove from Storefront</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove <strong>{deleteTarget && displayName(deleteTarget)}</strong> from your storefront? The raw Wondersign product will still be available to re-add later.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRawProduct, createListing, getCategories, setMainImage } from '@/lib/services/storefront';
import { triggerProductSync } from '@/lib/services/sync';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Plus, RefreshCw, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

function fmt(val) {
  if (val == null || val === '') return '—';
  return String(val);
}

function fmtPrice(price) {
  return price != null ? `$${Number(price).toFixed(2)}` : '—';
}

function fmtDim(dim) {
  if (!dim) return '—';
  const parts = [];
  if (dim.length) parts.push(`L: ${dim.length}`);
  if (dim.width) parts.push(`W: ${dim.width}`);
  if (dim.height) parts.push(`H: ${dim.height}`);
  if (parts.length === 0) return '—';
  return `${parts.join(', ')}${dim.unitOfMeasureDistance ? ` (${dim.unitOfMeasureDistance})` : ''}`;
}

function fmtWeight(dim) {
  if (!dim?.weight) return '—';
  return `${dim.weight}${dim.unitOfMeasureWeight ? ` ${dim.unitOfMeasureWeight}` : ''}`;
}

function fmtPkg(pkg) {
  if (!pkg) return '—';
  const parts = [];
  if (pkg.type) parts.push(`Type: ${pkg.type}`);
  const d = pkg.dimensions;
  if (d) {
    const dp = [];
    if (d.length) dp.push(`L: ${d.length}`);
    if (d.width) dp.push(`W: ${d.width}`);
    if (d.height) dp.push(`H: ${d.height}`);
    if (dp.length) parts.push(dp.join(', ') + (pkg.dimensionsUnitOfMeasure ? ` (${pkg.dimensionsUnitOfMeasure})` : ''));
  }
  if (pkg.weight) parts.push(`Weight: ${pkg.weight}${pkg.weightUnitOfMeasure ? ` ${pkg.weightUnitOfMeasure}` : ''}`);
  return parts.length > 0 ? parts.join('\n') : '—';
}

function fmtBool(val) {
  return val ? 'Yes' : 'No';
}

function fmtOpts(options) {
  if (!options || options.length === 0) return '—';
  return options.map((o) => `${o.option}: ${o.value}`).join('\n');
}

function fmtAttrs(attributes) {
  if (!attributes || attributes.length === 0) return '—';
  return attributes.map((a) => `${a.attribute}: ${(a.values || a.normalizedValues || []).join(', ')}`).join('\n');
}

// Section header row
function SectionHeader({ label, colSpan }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted border-t-2 border-border">
        {label}
      </td>
    </tr>
  );
}

// Data row: label | variant values (or single value column)
// spanAll: merge all variant columns into one (for product-only rows)
function Row({ label, productVal, variantVals, mono, spanAll }) {
  const hasVariants = variantVals.length > 0;
  return (
    <tr className="border-b hover:bg-muted/30">
      <td className="py-2.5 px-4 text-sm text-muted-foreground whitespace-nowrap border-r bg-muted/10 font-medium min-w-[170px]">
        {label}
      </td>
      {spanAll && hasVariants ? (
        <td colSpan={variantVals.length} className={`py-2.5 px-4 text-sm ${mono ? 'font-mono text-xs' : ''}`}>
          <span className="whitespace-pre-line">{productVal}</span>
        </td>
      ) : hasVariants ? (
        variantVals.map((val, i) => (
          <td key={i} className={`py-2.5 px-4 text-sm border-r last:border-r-0 ${mono ? 'font-mono text-xs' : ''}`}>
            <span className="whitespace-pre-line">{val}</span>
          </td>
        ))
      ) : (
        <td className={`py-2.5 px-4 text-sm ${mono ? 'font-mono text-xs' : ''}`}>
          <span className="whitespace-pre-line">{productVal}</span>
        </td>
      )}
    </tr>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [addDialog, setAddDialog] = useState(false);
  const [formData, setFormData] = useState({ displayPrice: '', categoryId: '', isPublished: true });

  const { data: productRes, isLoading } = useQuery({
    queryKey: ['raw-product', id],
    queryFn: () => getRawProduct(id),
  });

  const { data: categoriesRes } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const product = productRes?.data;
  const categories = categoriesRes?.data || [];

  const resyncMutation = useMutation({
    mutationFn: () => triggerProductSync(product?.externalId),
    onSuccess: () => toast.success('Re-sync started'),
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to trigger re-sync'),
  });

  const mainImageMutation = useMutation({
    mutationFn: (imageUrl) => setMainImage(id, imageUrl),
    onMutate: async (imageUrl) => {
      await queryClient.cancelQueries({ queryKey: ['raw-product', id] });
      const previous = queryClient.getQueryData(['raw-product', id]);

      queryClient.setQueryData(['raw-product', id], (old) => {
        if (!old?.data) return old;
        const media = old.data.media || {};
        const allImages = [...(media.mainImages || []), ...(media.additionalImages || [])];
        const seen = new Set();
        const reordered = [
          { url: imageUrl },
          ...allImages.filter((img) => {
            if (img.url === imageUrl || seen.has(img.url)) return false;
            seen.add(img.url);
            return true;
          }),
        ];
        return {
          ...old,
          data: {
            ...old.data,
            mainImage: imageUrl,
            media: { ...media, mainImages: [reordered[0]], additionalImages: reordered.slice(1) },
          },
        };
      });

      return { previous };
    },
    onError: (err, _imageUrl, context) => {
      queryClient.setQueryData(['raw-product', id], context.previous);
      toast.error(err.response?.data?.error || 'Failed to update main image');
    },
    onSuccess: () => toast.success('Main image updated'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['raw-product', id] }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => createListing(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw-product', id] });
      queryClient.invalidateQueries({ queryKey: ['raw-products'] });
      setAddDialog(false);
      toast.success('Product added to storefront');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to add'),
  });

  function submitAdd() {
    const body = { productId: product.id, isPublished: formData.isPublished };
    if (formData.displayPrice) body.displayPrice = parseFloat(formData.displayPrice);
    if (formData.categoryId) body.categoryId = formData.categoryId;
    createMutation.mutate(body);
  }

  if (isLoading) return <p className="text-muted-foreground">Loading...</p>;
  if (!product) return <p className="text-muted-foreground">Product not found</p>;

  const variants = product.variants || [];
  const singleVariant = variants.length === 1;
  const multiVariant = variants.length > 1;
  const colSpan = multiVariant ? variants.length + 1 : 2; // label + variants or label + value
  const v0 = singleVariant ? variants[0] : null; // shorthand for the single variant
  const media = product.media || {};


  // For rows with both product and variant data
  function sv(prodVal, variantFn) {
    if (!singleVariant) return { productVal: prodVal, variantVals: variants.map(variantFn) };
    const vVal = variantFn(v0, 0);
    const merged = (vVal != null && vVal !== '' && vVal !== '—') ? vVal : prodVal;
    return { productVal: merged, variantVals: [] };
  }

  // For product-only rows — spans all columns in multi-variant view
  function po(val) {
    return { productVal: val, variantVals: multiVariant ? variants.map(() => '—') : [], spanAll: multiVariant };
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold">
            {product.name}{singleVariant && v0?.name && v0.name !== product.name ? ` - ${v0.name}` : ''}
          </h1>
          {product.isOnStorefront ? (
            <Badge>Published</Badge>
          ) : product.hasListing ? (
            <Badge variant="secondary">Draft</Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => resyncMutation.mutate()}
            disabled={resyncMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${resyncMutation.isPending ? 'animate-spin' : ''}`} />
            {resyncMutation.isPending ? 'Syncing...' : 'Re-sync'}
          </Button>
          {!product.hasListing && (
            <Button
              size="sm"
              onClick={() => {
                setFormData({ displayPrice: '', categoryId: product.categoryId || '', isPublished: true });
                setAddDialog(true);
              }}
              disabled={!product.isActive}
              title={!product.isActive ? 'Product is inactive and cannot be listed on the storefront' : undefined}
            >
              <Plus className="h-4 w-4 mr-1" /> Add to Storefront
            </Button>
          )}
        </div>
      </div>

      {/* Spec Table — columns adapt to number of variants */}
      <div className="border-2 rounded-lg overflow-x-auto">
        <table className="w-full text-left min-w-max">
          <thead>
            <tr className="bg-muted border-b-2">
              <th className="py-3 px-4 text-sm font-bold whitespace-nowrap min-w-[170px] border-r">Field</th>
              {multiVariant ? (
                variants.map((v, i) => (
                  <th key={v.id} className="py-3 px-4 text-sm font-bold whitespace-nowrap min-w-[220px] border-r last:border-r-0">
                    <div>{v.name || `Variant ${i + 1}`}</div>
                    {v.sku && <div className="font-mono text-xs font-normal text-muted-foreground mt-0.5">{v.sku}</div>}
                  </th>
                ))
              ) : (
                <th className="py-3 px-4 text-sm font-bold whitespace-nowrap min-w-[220px]">Value</th>
              )}
            </tr>
          </thead>
          <tbody>
            {/* ─── General ─── */}
            <SectionHeader label="General" colSpan={colSpan} />
            <Row label="Name" {...sv(product.name, (v) => fmt(v.name))} />
            <Row label="Description" {...sv(fmt(product.description), (v) => fmt(v.description))} />
            <Row label="Brand" {...sv(fmt(product.brand), (v) => fmt(v.consumerBrand))} />
            <Row label="Collection" {...po(fmt(product.collection))} />
            <Row label="Provider" {...po(fmt(product.provider))} />
            <Row label="Category" {...po(product.category?.name || '—')} />
            <Row label="Variant Key" {...po(fmt(product.variantKey))} />
            <Row label="Vendor" {...po(product.vendor?.businessName || '—')} />
            <Row label="Status" {...sv(fmtBool(product.isActive), (v) => (
              <Badge variant={v.status === 'Active' ? 'default' : 'secondary'} className="text-xs">{fmt(v.status)}</Badge>
            ))} />
            {variants.length > 0 && (
              <>
                <Row label="Product Type" {...sv('—', (v) => fmt(v.productType))} />
                <Row label="Changed State" {...sv('—', (v) => fmt(v.changedState))} />
              </>
            )}

            {/* ─── Identifiers ─── */}
            <SectionHeader label="Identifiers" colSpan={colSpan} />
            <Row label="External ID" {...sv(fmt(product.externalId), (v) => fmt(v.externalProductId))} mono />
            <Row label="Slug" {...po(fmt(product.slug))} mono />
            <Row label="Source" {...po(fmt(product.source))} />
            {variants.length > 0 && (
              <>
                <Row label="SKU" {...sv('—', (v) => fmt(v.sku))} mono />
                <Row label="Customer SKU" {...sv('—', (v) => fmt(v.customerSku))} mono />
                <Row label="UPC" {...sv('—', (v) => fmt(v.upc))} mono />
              </>
            )}

            {/* ─── Pricing ─── */}
            <SectionHeader label="Pricing" colSpan={colSpan} />
            <Row label="Min Price" {...po(fmtPrice(product.minPrice))} />
            <Row label="Max Price" {...po(fmtPrice(product.maxPrice))} />
            <Row label="Compare At (MSRP)" {...po(fmtPrice(product.compareAtPrice))} />
            {variants.length > 0 && (
              <>
                <Row label="Retail Price" {...sv('—', (v) => fmtPrice(v.price?.retailPrice))} />
                <Row label="MSRP Price" {...sv('—', (v) => fmtPrice(v.price?.msrpPrice))} />
                <Row label="Cost" {...sv('—', (v) => fmtPrice(v.price?.cost))} />
                <Row label="List Price" {...sv('—', (v) => fmtPrice(v.price?.listPrice))} />
                <Row label="MAP Price" {...sv('—', (v) => fmtPrice(v.price?.mapPrice))} />
                {variants.some((v) => v.price?.rates?.length > 0) && (
                  <Row label="Rates" {...sv('—', (v) => {
                    const rates = v.price?.rates;
                    if (!rates || rates.length === 0) return '—';
                    return rates.map((r) => `${r.name || r.type}: ${fmtPrice(r.price || r.rate)}`).join('\n');
                  })} />
                )}
                {variants.some((v) => v.price?.rentalPrices?.length > 0) && (
                  <Row label="Rental Prices" {...sv('—', (v) => {
                    const rp = v.price?.rentalPrices;
                    if (!rp || rp.length === 0) return '—';
                    return rp.map((r) => `${r.period || r.name}: ${fmtPrice(r.price)}`).join('\n');
                  })} />
                )}
              </>
            )}

            {/* ─── Stock ─── */}
            <SectionHeader label="Stock" colSpan={colSpan} />
            <Row label="Stock" {...sv(fmt(product.totalStock), (v) => fmt(v.stockQuantity))} />

            {/* ─── Dimensions, Weight, Packaging ─── */}
            {variants.length > 0 && (
              <>
                <SectionHeader label="Dimensions & Weight" colSpan={colSpan} />
                <Row label="Dimensions (L × W × H)" {...sv('—', (v) => fmtDim(v.dimensions))} />
                <Row label="Weight" {...sv('—', (v) => fmtWeight(v.dimensions))} />

                <SectionHeader label="Packaging" colSpan={colSpan} />
                <Row label="Package Details" {...sv('—', (v) => fmtPkg(v.packaging))} />

                <SectionHeader label="Options & Attributes" colSpan={colSpan} />
                <Row label="Options" {...sv('—', (v) => fmtOpts(v.options))} />
                <Row label="Attributes" {...sv('—', (v) => fmtAttrs(v.attributes))} />
                {variants.some((v) => v.categories?.length > 0) && (
                  <Row label="Variant Categories" {...sv('—', (v) => {
                    if (!v.categories || v.categories.length === 0) return '—';
                    return v.categories.map((c) => c.path || c.name || JSON.stringify(c)).join('\n');
                  })} />
                )}
              </>
            )}

            {/* ─── Flags ─── */}
            <SectionHeader label="Flags" colSpan={colSpan} />
            <Row label="Active" {...sv(fmtBool(product.isActive), (v) => fmtBool(v.isActive))} />
            <Row label="Featured" {...po(fmtBool(product.isFeatured))} />
            <Row label="New" {...po(fmtBool(product.isNew))} />
            <Row label="On Sale" {...po(fmtBool(product.isOnSale))} />
            {variants.length > 0 && (
              <>
                <Row label="Direct Shipping" {...sv('—', (v) => fmtBool(v.isDirectShipping))} />
                <Row label="In Catalog" {...sv('—', (v) => fmtBool(v.isInCatalog))} />
                <Row label="Is Package" {...sv('—', (v) => v.isPackage ? `Yes (${v.packageProductType || 'bundle'})` : 'No')} />
                <Row label="Sold Individually" {...sv('—', (v) => fmtBool(v.isSoldIndividually))} />
              </>
            )}

            {/* ─── Metadata ─── */}
            <SectionHeader label="Metadata" colSpan={colSpan} />
            <Row label="Rating" {...po(`${product.rating ?? 0} (${product.totalReviews ?? 0} reviews)`)} />
            <Row label="Last Sync" {...po(product.lastSyncAt ? new Date(product.lastSyncAt).toLocaleString() : '—')} />
            <Row label="Created" {...sv(new Date(product.createdAt).toLocaleString(), (v) => new Date(v.createdAt).toLocaleString())} />
            <Row label="Updated" {...sv(new Date(product.updatedAt).toLocaleString(), (v) => new Date(v.updatedAt).toLocaleString())} />
            {variants.length > 0 && (
              <>
                <Row label="Rank" {...sv('—', (v) => fmt(v.rank))} />
                <Row label="Introduced At" {...sv('—', (v) => v.introducedAt ? new Date(v.introducedAt).toLocaleString() : '—')} />
                {variants.some((v) => v.deletedAt) && (
                  <Row label="Deleted At" {...sv('—', (v) => v.deletedAt ? new Date(v.deletedAt).toLocaleString() : '—')} />
                )}
              </>
            )}

            {/* ─── Images ─── */}
            {(() => {
              const allImages = [
                ...(media.mainImages || []),
                ...(media.additionalImages || []),
              ].filter((img) => img?.url);
              if (!allImages.length) return null;
              return (
                <>
                  <SectionHeader label="Images" colSpan={colSpan} />
                  <tr className="border-b">
                    <td className="py-2.5 px-4 text-sm text-muted-foreground whitespace-nowrap border-r bg-muted/10 font-medium min-w-[170px]">
                      Gallery
                      <p className="text-xs font-normal mt-0.5">Click to set main</p>
                    </td>
                    <td colSpan={colSpan - 1} className="py-3 px-4">
                      <div className="flex gap-2 flex-wrap">
                        {allImages.map((img, i) => {
                          const isMain = img.url === product.mainImage;
                          return (
                            <button
                              key={i}
                              onClick={() => !isMain && mainImageMutation.mutate(img.url)}
                              disabled={mainImageMutation.isPending}
                              className={`relative group rounded overflow-hidden border-2 transition-all focus:outline-none ${isMain ? 'border-primary' : 'border-transparent hover:border-muted-foreground'}`}
                            >
                              <img
                                src={img.url}
                                alt={`${product.name} ${i + 1}`}
                                className="w-20 h-20 object-cover"
                              />
                              {isMain ? (
                                <span className="absolute top-1 left-1 bg-primary text-primary-foreground rounded p-0.5">
                                  <Flag className="h-3 w-3 fill-current" />
                                </span>
                              ) : (
                                <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Flag className="h-4 w-4" />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                </>
              );
            })()}
          </tbody>
        </table>
      </div>

      {/* Provider Category Paths */}
      {product.categories && Array.isArray(product.categories) && product.categories.length > 0 && (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Provider Category Paths</h2>
          <ul className="text-sm space-y-1">
            {product.categories.map((cat, i) => (
              <li key={i} className="text-muted-foreground">{cat.path || JSON.stringify(cat)}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Related Products */}
      {product.relatedProducts && (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Related Products</h2>
          <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">{JSON.stringify(product.relatedProducts, null, 2)}</pre>
        </div>
      )}

      {/* Add to Storefront Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Storefront</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Adding <strong>{product.name}</strong> (raw price: {fmtPrice(product.minPrice)})
            </p>
            <div className="space-y-2">
              <Label>Display Price (leave empty to use raw price)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder={product.minPrice?.toString()}
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
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>Cancel</Button>
            <Button onClick={submitAdd} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Adding...' : 'Add to Storefront'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

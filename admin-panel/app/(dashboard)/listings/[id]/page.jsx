'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getListing, updateListing, getCategories } from '@/lib/services/storefront';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

// ─── Spec table helpers (same as products/[id]) ─────────────────────

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

function SectionHeader({ label, colSpan }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted border-t-2 border-border">
        {label}
      </td>
    </tr>
  );
}

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

// ─── Main component ─────────────────────────────────────────────────

export default function EditListingPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showRawDetails, setShowRawDetails] = useState(true);

  const { data: listingRes, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => getListing(id),
  });

  const { data: categoriesRes } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const listing = listingRes?.data;
  const product = listing?.product;
  const categories = categoriesRes?.data || [];

  const [form, setForm] = useState({
    displayName: '',
    displayDescription: '',
    displayPrice: '',
    discountedPrice: '',
    compareAtPrice: '',
    displayStock: '',
    variantPrices: {},
    variantStocks: {},
    categoryId: '',
    isPublished: false,
    isTrending: false,
    isNewArrival: false,
  });

  useEffect(() => {
    if (listing) {
      setForm({
        displayName: listing.displayName || '',
        displayDescription: listing.displayDescription || '',
        displayPrice: listing.displayPrice != null ? String(listing.displayPrice) : '',
        discountedPrice: listing.discountedPrice != null ? String(listing.discountedPrice) : '',
        compareAtPrice: listing.compareAtPrice != null ? String(listing.compareAtPrice) : '',
        displayStock: listing.displayStock != null ? String(listing.displayStock) : '',
        variantPrices: listing.variantPrices || {},
        variantStocks: listing.variantStocks || {},
        categoryId: listing.categoryId || '',
        isPublished: listing.isPublished,
        isTrending: listing.isTrending,
        isNewArrival: listing.isNewArrival,
      });
    }
  }, [listing]);

  const updateMutation = useMutation({
    mutationFn: (data) => updateListing(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listing', id] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      toast.success('Listing updated');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Update failed'),
  });

  function handleSubmit(e) {
    e.preventDefault();
    const body = {
      displayName: form.displayName || null,
      displayDescription: form.displayDescription || null,
      displayPrice: form.displayPrice ? parseFloat(form.displayPrice) : null,
      discountedPrice: form.discountedPrice ? parseFloat(form.discountedPrice) : null,
      compareAtPrice: form.compareAtPrice ? parseFloat(form.compareAtPrice) : null,
      displayStock: form.displayStock ? parseInt(form.displayStock) : null,
      variantPrices: Object.keys(form.variantPrices).length > 0 ? form.variantPrices : null,
      variantStocks: Object.keys(form.variantStocks).length > 0 ? form.variantStocks : null,
      categoryId: form.categoryId || null,
      isPublished: form.isPublished,
      isTrending: form.isTrending,
      isNewArrival: form.isNewArrival,
    };
    updateMutation.mutate(body);
  }

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function updateVariantPrice(variantId, value) {
    setForm((f) => {
      const updated = { ...f.variantPrices };
      if (value === '' || value == null) {
        delete updated[variantId];
      } else {
        updated[variantId] = parseFloat(value);
      }
      return { ...f, variantPrices: updated };
    });
  }

  function updateVariantStock(variantId, value) {
    setForm((f) => {
      const updated = { ...f.variantStocks };
      if (value === '' || value == null) {
        delete updated[variantId];
      } else {
        updated[variantId] = parseInt(value);
      }
      return { ...f, variantStocks: updated };
    });
  }

  if (isLoading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  if (!listing) {
    return <div className="text-muted-foreground">Listing not found</div>;
  }

  // Spec table setup
  const variants = product?.variants || [];
  const singleVariant = variants.length === 1;
  const multiVariant = variants.length > 1;
  const colSpan = multiVariant ? variants.length + 1 : 2;
  const v0 = singleVariant ? variants[0] : null;
  const media = product?.media || {};
  const mainImages = media.mainImages || [];

  function sv(prodVal, variantFn) {
    if (!singleVariant) return { productVal: prodVal, variantVals: variants.map(variantFn) };
    const vVal = variantFn(v0, 0);
    const merged = (vVal != null && vVal !== '' && vVal !== '—') ? vVal : prodVal;
    return { productVal: merged, variantVals: [] };
  }

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
          <div>
            <h1 className="text-xl font-semibold">
              {product?.name}{singleVariant && v0?.name && v0.name !== product?.name ? ` - ${v0.name}` : ''}
            </h1>
            <p className="text-sm text-muted-foreground">Listing overrides & raw product details</p>
          </div>
          {listing.isPublished ? (
            <Badge>Published</Badge>
          ) : (
            <Badge variant="secondary">Draft</Badge>
          )}
        </div>
      </div>

      {/* Product image + quick info */}
      <div className="flex gap-4 items-start">
        {product?.mainImage ? (
          <Image src={product.mainImage} alt={product.name} width={96} height={96} className="rounded-lg object-cover border" />
        ) : (
          <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center border">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div className="text-sm space-y-1">
          <div><span className="text-muted-foreground">Brand:</span> {product?.brand || '—'}</div>
          <div><span className="text-muted-foreground">Price Range:</span> {fmtPrice(product?.minPrice)}{product?.maxPrice && product.maxPrice !== product.minPrice && <> – {fmtPrice(product.maxPrice)}</>}</div>
          <div><span className="text-muted-foreground">Stock:</span> {product?.totalStock ?? '—'}</div>
          <div><span className="text-muted-foreground">Variants:</span> {variants.length}</div>
          <div><span className="text-muted-foreground">Source:</span> {product?.source || 'wondersign'}</div>
        </div>
      </div>

      {/* Editable listing overrides */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Display Overrides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    placeholder={product?.name || 'Product name'}
                    value={form.displayName}
                    onChange={(e) => updateField('displayName', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to use raw name: {product?.name}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayDescription">Display Description</Label>
                  <Textarea
                    id="displayDescription"
                    placeholder="Custom description..."
                    rows={4}
                    value={form.displayDescription}
                    onChange={(e) => updateField('displayDescription', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pricing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Cost Price - read-only from Wondersign */}
                <div className="space-y-2">
                  <Label>Cost Price (Supplier)</Label>
                  <div className="flex items-center h-9 px-3 rounded-md border bg-muted text-sm text-muted-foreground">
                    {fmtPrice(variants[0]?.price?.cost)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Read-only. This is the supplier cost from Wondersign.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Original Price (selling price) */}
                  <div className="space-y-2">
                    <Label htmlFor="displayPrice">Original Price</Label>
                    <Input
                      id="displayPrice"
                      type="number"
                      step="0.01"
                      placeholder={product?.minPrice?.toString() || '0'}
                      value={form.displayPrice}
                      onChange={(e) => updateField('displayPrice', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Raw retail: {fmtPrice(product?.minPrice)}. Leave empty to use raw price.
                    </p>
                  </div>

                  {/* Discounted Price (sale price) */}
                  <div className="space-y-2">
                    <Label htmlFor="discountedPrice">Discounted Price</Label>
                    <Input
                      id="discountedPrice"
                      type="number"
                      step="0.01"
                      placeholder={form.displayPrice || product?.minPrice?.toString() || '0'}
                      value={form.discountedPrice}
                      onChange={(e) => updateField('discountedPrice', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Sale price. When set lower than original, shows as on-sale with strikethrough.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayStock">My Stock</Label>
                  <Input
                    id="displayStock"
                    type="number"
                    step="1"
                    min="0"
                    placeholder={product?.totalStock?.toString() || '0'}
                    value={form.displayStock}
                    onChange={(e) => updateField('displayStock', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Available stock from supplier: {product?.totalStock ?? 0}. Leave empty to use raw stock.
                  </p>
                </div>
              </CardContent>
            </Card>

            {variants.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Variant Overrides</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Set custom price and stock for each variant. Leave empty to use the original supplier values.
                  </p>
                  {variants.map((v, i) => (
                    <div key={v.id} className="flex items-center gap-3 border-b pb-3 last:border-0 last:pb-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{v.name || `Variant ${i + 1}`}</div>
                        <div className="text-xs text-muted-foreground">
                          SKU: {v.sku || '—'} | Original: {v.price?.retailPrice != null ? `$${Number(v.price.retailPrice).toFixed(2)}` : '—'} | Stock: {v.stockQuantity ?? 0}
                        </div>
                      </div>
                      <div className="w-28">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder={v.price?.retailPrice?.toString() || '0'}
                          value={form.variantPrices[v.id] != null ? String(form.variantPrices[v.id]) : ''}
                          onChange={(e) => updateVariantPrice(v.id, e.target.value)}
                        />
                      </div>
                      <div className="w-20">
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          placeholder={String(v.stockQuantity ?? 0)}
                          value={form.variantStocks[v.id] != null ? String(form.variantStocks[v.id]) : ''}
                          onChange={(e) => updateVariantStock(v.id, e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Category</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={form.categoryId}
                  onValueChange={(val) => updateField('categoryId', val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category (or use raw)" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {product?.category && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Raw category: {product.category.name}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Published</Label>
                  <Switch
                    checked={form.isPublished}
                    onCheckedChange={(v) => updateField('isPublished', v)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label>Trending</Label>
                  <Switch
                    checked={form.isTrending}
                    onCheckedChange={(v) => updateField('isTrending', v)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label>New Arrival</Label>
                  <Switch
                    checked={form.isNewArrival}
                    onCheckedChange={(v) => updateField('isNewArrival', v)}
                  />
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>

      {/* Raw Product Details (spec table like Wondersign products/[id]) */}
      <div>
        <button
          type="button"
          className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground mb-3"
          onClick={() => setShowRawDetails((v) => !v)}
        >
          {showRawDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          Raw Product Details
        </button>

        {showRawDetails && (
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
                {/* General */}
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

                {/* Identifiers */}
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

                {/* Pricing */}
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

                {/* Stock */}
                <SectionHeader label="Stock" colSpan={colSpan} />
                <Row label="Stock" {...sv(fmt(product.totalStock), (v) => fmt(v.stockQuantity))} />

                {/* Dimensions, Weight, Packaging */}
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

                {/* Flags */}
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

                {/* Metadata */}
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

                {/* Image */}
                {variants.length > 0 && (
                  <>
                    <SectionHeader label="Image" colSpan={colSpan} />
                    <tr className="border-b">
                      <td className="py-2.5 px-4 text-sm text-muted-foreground whitespace-nowrap border-r bg-muted/10 font-medium min-w-[170px]">
                        Image
                      </td>
                      {multiVariant ? (
                        variants.map((v, i) => {
                          const img = mainImages.find((m) => m.variantProductIds?.includes(v.externalProductId));
                          return (
                            <td key={i} className="py-2.5 px-4 text-sm border-r last:border-r-0">
                              {img?.url ? (
                                <Image src={img.url} alt={v.name || `Variant ${i + 1}`} width={80} height={80} className="rounded object-cover border" />
                              ) : '—'}
                            </td>
                          );
                        })
                      ) : (
                        <td className="py-2.5 px-4 text-sm">
                          {(() => {
                            const img = mainImages.find((m) => m.variantProductIds?.includes(v0?.externalProductId));
                            return (img?.url || product.mainImage) ? (
                              <Image src={img?.url || product.mainImage} alt={product.name} width={80} height={80} className="rounded object-cover border" />
                            ) : '—';
                          })()}
                        </td>
                      )}
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Provider Category Paths */}
      {showRawDetails && product?.categories && Array.isArray(product.categories) && product.categories.length > 0 && (
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
      {showRawDetails && product?.relatedProducts && (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Related Products</h2>
          <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">{JSON.stringify(product.relatedProducts, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

'use client';

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/lib/services/storefront';
import { uploadImage } from '@/lib/services/upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, ImageIcon, Upload, Loader2, ChevronRight } from 'lucide-react';

const EMPTY_FORM = {
  name: '',
  slug: '',
  description: '',
  imageUrl: '',
  parentId: '',
  sortOrder: 0,
};

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function CategoryDialog({ open, onClose, category, allCategories }) {
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const isEdit = !!category;

  useEffect(() => {
    if (open) {
      if (category) {
        setForm({
          name: category.name || '',
          slug: category.slug || '',
          description: category.description || '',
          imageUrl: category.imageUrl || '',
          parentId: category.parentId || '',
          sortOrder: category.sortOrder ?? 0,
        });
        setSlugManuallyEdited(true);
      } else {
        setForm(EMPTY_FORM);
        setSlugManuallyEdited(false);
      }
    }
  }, [open, category]);

  const saveMutation = useMutation({
    mutationFn: (body) =>
      isEdit ? updateCategory(category.id, body) : createCategory(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast.success(isEdit ? 'Category updated' : 'Category created');
      onClose();
    },
    onError: (err) => {
      const msg = err?.response?.data?.error || 'Failed to save category';
      toast.error(msg);
    },
  });

  function handleNameChange(val) {
    setForm((f) => ({
      ...f,
      name: val,
      slug: slugManuallyEdited ? f.slug : slugify(val),
    }));
  }

  function handleSlugChange(val) {
    setSlugManuallyEdited(true);
    setForm((f) => ({ ...f, slug: val }));
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setForm((f) => ({ ...f, imageUrl: url }));
      toast.success('Image uploaded');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const body = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description.trim() || undefined,
      imageUrl: form.imageUrl.trim() || undefined,
      parentId: form.parentId || null,
      sortOrder: Number(form.sortOrder),
    };
    saveMutation.mutate(body);
  }

  // Exclude self and its descendants from parent options
  const parentOptions = allCategories.filter(
    (c) => !isEdit || (c.id !== category.id && c.parentId !== category.id)
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Category' : 'New Category'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Living Room"
              required
            />
          </div>

          {/* Slug */}
          <div className="space-y-1.5">
            <Label>Slug</Label>
            <Input
              value={form.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="auto-generated from name"
            />
            <p className="text-xs text-muted-foreground">Lowercase letters, numbers, and hyphens only.</p>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional category description"
              rows={3}
            />
          </div>

          {/* Parent category */}
          <div className="space-y-1.5">
            <Label>Parent Category</Label>
            <Select
              value={form.parentId || 'none'}
              onValueChange={(v) => setForm((f) => ({ ...f, parentId: v === 'none' ? '' : v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Top-level category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Top-level —</SelectItem>
                {parentOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort order */}
          <div className="space-y-1.5">
            <Label>Sort Order</Label>
            <Input
              type="number"
              min={0}
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
              className="w-28"
            />
            <p className="text-xs text-muted-foreground">Lower numbers appear first.</p>
          </div>

          {/* Image */}
          <div className="space-y-1.5">
            <Label>Category Image</Label>
            <p className="text-xs text-muted-foreground">Recommended: 800×600px (4:3), max 5 MB, JPG/PNG/WebP.</p>

            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

            {form.imageUrl ? (
              <div className="relative w-full rounded-lg overflow-hidden border bg-muted" style={{ aspectRatio: '4/3' }}>
                <Image
                  src={form.imageUrl}
                  alt="Category"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Replace
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => setForm((f) => ({ ...f, imageUrl: '' }))}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                style={{ aspectRatio: '4/3' }}
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <ImageIcon className="h-8 w-8" />
                    <span className="text-sm font-medium">Click to upload image</span>
                    <span className="text-xs">800×600px · 4:3 · max 5 MB</span>
                  </>
                )}
              </button>
            )}

            {/* URL override */}
            <Input
              value={form.imageUrl}
              onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
              placeholder="Or paste an image URL"
              className="text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending || uploading}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ open, onClose, category }) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => deleteCategory(category.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast.success('Category deleted');
      onClose();
    },
    onError: (err) => {
      const msg = err?.response?.data?.error || 'Failed to delete category';
      toast.error(msg);
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Category</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete <span className="font-medium text-foreground">{category?.name}</span>?
          This cannot be undone.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CategoriesPage() {
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => getCategories(),
    staleTime: 60_000,
  });

  const categories = data?.data || [];
  const parentMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  // Sort: parents first, then children grouped under parent
  const sorted = [
    ...categories.filter((c) => !c.parentId).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    ...categories.filter((c) => c.parentId).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Categories</h1>
          <p className="text-sm text-muted-foreground mt-1">{categories.length} categories</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Category
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Sort</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  No categories yet. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell>
                    {cat.imageUrl ? (
                      <Image
                        src={cat.imageUrl}
                        alt={cat.name}
                        width={48}
                        height={36}
                        className="rounded object-cover border"
                      />
                    ) : (
                      <div className="w-12 h-9 rounded bg-muted border flex items-center justify-center">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {cat.parentId && (
                      <ChevronRight className="inline h-3.5 w-3.5 text-muted-foreground mr-1 -mt-0.5" />
                    )}
                    {cat.name}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {cat.slug}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {cat.parentId ? parentMap[cat.parentId] || '—' : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {cat.sortOrder}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditTarget(cat)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(cat)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CategoryDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        category={null}
        allCategories={categories}
      />

      <CategoryDialog
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        category={editTarget}
        allCategories={categories}
      />

      {deleteTarget && (
        <DeleteDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          category={deleteTarget}
        />
      )}
    </div>
  );
}

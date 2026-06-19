'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSettings, updateSettings } from '@/lib/services/settings';
import { uploadImage } from '@/lib/services/upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Plus, Trash2, GripVertical, Upload, ImageIcon, VideoIcon,
  ChevronUp, ChevronDown, Info, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_HERO_SLIDES = [
  {
    id: '1',
    title: 'Quality Furniture, Carefully Selected',
    subtitle: 'Handpicked pieces from trusted makers worldwide',
    ctaText: 'Shop Collection',
    ctaLink: '/products',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=2400&q=80',
    focalPoint: 'center center',
  },
  {
    id: '2',
    title: 'New Arrivals Every Week',
    subtitle: 'Discover the latest additions to our curated collection',
    ctaText: "See What's New",
    ctaLink: '/products?filter=new',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=2400&q=80',
    focalPoint: 'center center',
  },
  {
    id: '3',
    title: 'Try Before You Buy with AR',
    subtitle: 'See furniture in your space with augmented reality',
    ctaText: 'Coming Soon',
    ctaLink: '#',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=2400&q=80',
    focalPoint: 'center center',
  },
];


const DEFAULT = {
  heroSlides: { items: DEFAULT_HERO_SLIDES },
  offerBar: {
    enabled: true,
    items: [
      { emoji: '🎉', text: '20% Off First Order' },
      { emoji: '🚚', text: 'Free Shipping Over $500' },
      { emoji: '💳', text: 'Buy Now, Pay Later' },
      { emoji: '🔄', text: '30-Day Easy Returns' },
    ],
  },
  socialBar: {
    enabled: true,
    items: [
      { emoji: '⭐', text: '4.8/5 Customer Rating' },
      { emoji: '📈', text: 'Trending Products' },
      { emoji: '😊', text: '98% Satisfaction Rate' },
      { emoji: '🏆', text: 'Award-Winning Service' },
    ],
  },
  brandStory: {
    enabled: true,
    title: 'Our Story',
    paragraph1: 'At LiviPoint, we believe your home should tell your story. That\'s why we\'ve spent years building relationships with the world\'s finest furniture makers, bringing you pieces that combine timeless design with modern craftsmanship.',
    paragraph2: 'Every item in our collection is carefully vetted for quality, sustainability, and style. We don\'t just sell furniture—we help you create spaces that inspire, comfort, and endure.',
    buttonText: 'Learn More About Us',
    buttonLink: '/about',
    imageUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80',
  },
};

function parseFocalPoint(fp) {
  const parts = (fp || '50% 50%').split(' ');
  const toNum = (v) => {
    if (!v) return 50;
    if (v === 'left' || v === 'top') return 0;
    if (v === 'right' || v === 'bottom') return 100;
    if (v === 'center') return 50;
    return parseFloat(v) || 50;
  };
  return { x: toNum(parts[0]), y: toNum(parts[1] ?? parts[0]) };
}

function HeroSlideCard({ slide, index, total, onUpdate, onRemove, onMoveUp, onMoveDown }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      onUpdate('mediaUrl', url, true);
      onUpdate('mediaType', 'image');
      toast.success('Image uploaded & saved');
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Upload failed';
      console.error('Upload error:', err?.response ?? err);
      toast.error(msg);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function handleFocalClick(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    onUpdate('focalPoint', `${x}% ${y}%`);
  }

  const focalPoint = slide.focalPoint || '50% 50%';
  const { x: fpX, y: fpY } = parseFocalPoint(focalPoint);

  return (
    <Card className="border border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-0.5">
              <Button
                variant="ghost" size="icon" className="h-6 w-6"
                onClick={onMoveUp} disabled={index === 0}
                title="Move up"
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost" size="icon" className="h-6 w-6"
                onClick={onMoveDown} disabled={index === total - 1}
                title="Move down"
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
            <div>
              <p className="font-medium text-sm">Slide {index + 1}</p>
              <p className="text-xs text-muted-foreground truncate max-w-70">
                {slide.title || 'Untitled slide'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost" size="icon"
            className="text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            title="Remove slide"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Media Type Toggle */}
        <div>
          <Label className="text-xs mb-2 block">Background Media</Label>
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => onUpdate('mediaType', 'image')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                slide.mediaType !== 'video'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <ImageIcon className="h-3 w-3" /> Image
            </button>
            <button
              type="button"
              onClick={() => onUpdate('mediaType', 'video')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                slide.mediaType === 'video'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <VideoIcon className="h-3 w-3" /> Video URL
            </button>
          </div>

          {slide.mediaType !== 'video' ? (
            <div className="space-y-3">
              {/* Upload dropzone — empty state */}
              {!slide.mediaUrl && (
                <>
                  <div
                    className="relative border-2 border-dashed border-border rounded-lg overflow-hidden cursor-pointer"
                    style={{ height: 160 }}
                    onClick={() => !uploading && fileRef.current?.click()}
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Upload className="h-6 w-6" />
                      <p className="text-sm">Click to upload image</p>
                      <p className="text-xs">JPG, PNG or WebP · max 5 MB · 1920×1080 recommended</p>
                    </div>
                    {uploading && (
                      <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                        <Loader2 className="h-7 w-7 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Image set — focal point picker + mobile preview */}
              {slide.mediaUrl && (
                <div className="space-y-2">
                  {/* Full landscape image — click to set focal point */}
                  <p className="text-[10px] text-muted-foreground">
                    Click the image to set the mobile focus point
                  </p>
                  <div
                    className="relative rounded-md border border-border cursor-crosshair select-none w-full"
                    onClick={handleFocalClick}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slide.mediaUrl}
                      alt="Slide"
                      className="w-full h-auto block rounded-md pointer-events-none"
                    />
                    {/* Mobile crop boundary — 31.64% width = what's visible on a 9:16 phone */}
                    <div
                      className="absolute pointer-events-none inset-y-0"
                      style={{
                        width: '31.64%',
                        left: `${fpX}%`,
                        transform: 'translateX(-50%)',
                        border: '1.5px dashed rgba(255,255,255,0.9)',
                        boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
                      }}
                    />
                    {/* Focal dot */}
                    <div
                      className="absolute pointer-events-none w-2.5 h-2.5 rounded-full bg-white"
                      style={{
                        left: `${fpX}%`,
                        top: `${fpY}%`,
                        transform: 'translate(-50%, -50%)',
                        boxShadow: '0 0 0 1.5px rgba(0,0,0,0.5)',
                      }}
                    />
                  </div>

                  {/* Mobile preview + actions row */}
                  <div className="flex items-center gap-3">
                    {/* Mobile preview */}
                    <div className="shrink-0">
                      <p className="text-[10px] text-muted-foreground mb-1 text-center">Mobile</p>
                      <div
                        className="relative rounded-md overflow-hidden border border-border bg-muted"
                        style={{ width: 68, height: 120 }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={slide.mediaUrl}
                          alt="Mobile preview"
                          className="w-full h-full object-cover"
                          style={{ objectPosition: focalPoint }}
                        />
                        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-black/25" />
                      </div>
                    </div>

                    {/* Focus info + replace button */}
                    <div className="flex-1 space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Focus: <span className="font-medium text-foreground">{focalPoint}</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => !uploading && fileRef.current?.click()}
                        className="text-xs text-muted-foreground hover:text-foreground underline flex items-center gap-1"
                      >
                        {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                        Replace image
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFile}
              />

              {/* Manual URL override */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Or paste an image URL directly
                </Label>
                <Input
                  value={slide.mediaUrl}
                  onChange={e => onUpdate('mediaUrl', e.target.value)}
                  placeholder="https://..."
                  className="text-xs font-mono"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Video URL</Label>
                <Input
                  value={slide.mediaUrl}
                  onChange={e => onUpdate('mediaUrl', e.target.value)}
                  placeholder="YouTube, Vimeo, or direct .mp4 URL"
                />
              </div>

              {slide.mediaUrl && (
                <p className="text-xs text-muted-foreground break-all font-mono bg-muted/50 rounded p-2">
                  {slide.mediaUrl}
                </p>
              )}

              <div className="bg-muted/50 rounded-md p-3">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  Supported Video Formats
                </div>
                <div className="space-y-1 text-xs">
                  <div className="grid grid-cols-[80px_1fr] gap-1">
                    <span className="text-muted-foreground">YouTube</span>
                    <span className="font-mono text-muted-foreground">youtube.com/watch?v=…</span>
                  </div>
                  <div className="grid grid-cols-[80px_1fr] gap-1">
                    <span className="text-muted-foreground">Vimeo</span>
                    <span className="font-mono text-muted-foreground">vimeo.com/…</span>
                  </div>
                  <div className="grid grid-cols-[80px_1fr] gap-1">
                    <span className="text-muted-foreground">Direct MP4</span>
                    <span className="font-mono text-muted-foreground">example.com/video.mp4</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
                  Videos autoplay silently. For best mobile support use a direct MP4 URL.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Text fields */}
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Headline</Label>
            <Input
              value={slide.title}
              onChange={e => onUpdate('title', e.target.value)}
              placeholder="Quality Furniture, Carefully Selected"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Subheading</Label>
            <Input
              value={slide.subtitle}
              onChange={e => onUpdate('subtitle', e.target.value)}
              placeholder="Handpicked pieces from trusted makers worldwide"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Button Text</Label>
              <Input
                value={slide.ctaText}
                onChange={e => onUpdate('ctaText', e.target.value)}
                placeholder="Shop Now"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Button Link</Label>
              <Input
                value={slide.ctaLink}
                onChange={e => onUpdate('ctaLink', e.target.value)}
                placeholder="/products"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: getSettings });
  const [form, setForm] = useState(DEFAULT);

  useEffect(() => {
    if (data) {
      setForm({
        ...DEFAULT,
        ...data,
        heroSlides: {
          items: data.heroSlides?.items?.length > 0
            ? data.heroSlides.items
            : DEFAULT.heroSlides.items,
        },
      });
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings saved');
    },
    onError: () => toast.error('Failed to save settings'),
  });

  // ── Hero slides helpers ──────────────────────────────────────────────────

  function updateSlide(index, field, value, autoSave = false) {
    setForm(f => {
      const items = [...f.heroSlides.items];
      items[index] = { ...items[index], [field]: value };
      const updated = { ...f, heroSlides: { ...f.heroSlides, items } };
      if (autoSave && !mutation.isPending) mutation.mutate(updated);
      return updated;
    });
  }

  function removeSlide(index) {
    setForm(f => {
      const items = f.heroSlides.items.filter((_, i) => i !== index);
      return { ...f, heroSlides: { ...f.heroSlides, items } };
    });
  }

  function addSlide() {
    const newSlide = {
      id: crypto.randomUUID(),
      title: '',
      subtitle: '',
      ctaText: 'Shop Now',
      ctaLink: '/products',
      mediaType: 'image',
      mediaUrl: '',
      focalPoint: 'center center',
    };
    setForm(f => ({
      ...f,
      heroSlides: { ...f.heroSlides, items: [...f.heroSlides.items, newSlide] },
    }));
  }

  function moveSlide(index, direction) {
    setForm(f => {
      const items = [...f.heroSlides.items];
      const target = index + direction;
      if (target < 0 || target >= items.length) return f;
      [items[index], items[target]] = [items[target], items[index]];
      return { ...f, heroSlides: { ...f.heroSlides, items } };
    });
  }

  // ── Offer bar helpers ────────────────────────────────────────────────────

  function setBarEnabled(bar, enabled) {
    setForm(f => ({ ...f, [bar]: { ...f[bar], enabled } }));
  }

  function setItem(bar, index, field, value) {
    setForm(f => {
      const items = [...f[bar].items];
      items[index] = { ...items[index], [field]: value };
      return { ...f, [bar]: { ...f[bar], items } };
    });
  }

  function addItem(bar, template) {
    setForm(f => ({
      ...f,
      [bar]: { ...f[bar], items: [...f[bar].items, { ...template }] },
    }));
  }

  function removeItem(bar, index) {
    setForm(f => {
      const items = f[bar].items.filter((_, i) => i !== index);
      return { ...f, [bar]: { ...f[bar], items } };
    });
  }

  // ── Brand story helpers ──────────────────────────────────────────────────

  function setBrandStoryField(field, value) {
    setForm(f => ({ ...f, brandStory: { ...f.brandStory, [field]: value } }));
  }

  const [uploadingStoryImage, setUploadingStoryImage] = useState(false);
  const storyImageRef = useRef(null);

  async function handleStoryImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingStoryImage(true);
    try {
      const url = await uploadImage(file);
      setBrandStoryField('imageUrl', url);
      toast.success('Story image uploaded');
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Upload failed';
      toast.error(msg);
    } finally {
      setUploadingStoryImage(false);
      e.target.value = '';
    }
  }

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading settings…</div>;

  return (
    <div className="p-8 max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Storefront Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage hero slides and promotional bars shown on the storefront.
        </p>
      </div>

      {/* ── Hero Slides ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Hero Slides</CardTitle>
              <CardDescription>
                Full-width carousel at the top of the homepage. Supports images and videos.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={addSlide}>
              <Plus className="h-4 w-4" /> Add Slide
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.heroSlides.items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">
              No slides yet. Click "Add Slide" to create the first one.
            </p>
          )}
          {form.heroSlides.items.map((slide, i) => (
            <HeroSlideCard
              key={slide.id || i}
              slide={slide}
              index={i}
              total={form.heroSlides.items.length}
              onUpdate={(field, value, autoSave) => updateSlide(i, field, value, autoSave)}
              onRemove={() => removeSlide(i)}
              onMoveUp={() => moveSlide(i, -1)}
              onMoveDown={() => moveSlide(i, 1)}
            />
          ))}
        </CardContent>
      </Card>

      <Separator />

      {/* ── Offer Bar ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Offer Bar</CardTitle>
              <CardDescription>Promotional highlights shown on the homepage.</CardDescription>
            </div>
            <Switch
              checked={form.offerBar.enabled}
              onCheckedChange={v => setBarEnabled('offerBar', v)}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.offerBar.items.map((item, i) => (
            <div key={i} className="flex gap-2 items-start">
              <GripVertical className="h-4 w-4 mt-2.5 text-muted-foreground shrink-0" />
              <div className="flex-1 grid grid-cols-4 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Emoji</Label>
                  <Input
                    value={item.emoji}
                    onChange={e => setItem('offerBar', i, 'emoji', e.target.value)}
                    className="text-center"
                  />
                </div>
                <div className="col-span-3 space-y-1">
                  <Label className="text-xs">Text</Label>
                  <Input
                    value={item.text}
                    onChange={e => setItem('offerBar', i, 'text', e.target.value)}
                  />
                </div>
              </div>
              <Button
                variant="ghost" size="icon"
                className="mt-5 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeItem('offerBar', i)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline" size="sm" className="gap-2"
            onClick={() => addItem('offerBar', { emoji: '', text: '' })}
          >
            <Plus className="h-4 w-4" /> Add Offer
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* ── Social Bar ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Social Proof Bar</CardTitle>
              <CardDescription>Trust signals shown between trending and new arrivals sections.</CardDescription>
            </div>
            <Switch
              checked={form.socialBar.enabled}
              onCheckedChange={v => setBarEnabled('socialBar', v)}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.socialBar.items.map((item, i) => (
            <div key={i} className="flex gap-2 items-start">
              <GripVertical className="h-4 w-4 mt-2.5 text-muted-foreground shrink-0" />
              <div className="flex-1 grid grid-cols-4 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Emoji</Label>
                  <Input
                    value={item.emoji}
                    onChange={e => setItem('socialBar', i, 'emoji', e.target.value)}
                    className="text-center"
                  />
                </div>
                <div className="col-span-3 space-y-1">
                  <Label className="text-xs">Text</Label>
                  <Input
                    value={item.text}
                    onChange={e => setItem('socialBar', i, 'text', e.target.value)}
                  />
                </div>
              </div>
              <Button
                variant="ghost" size="icon"
                className="mt-5 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeItem('socialBar', i)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline" size="sm" className="gap-2"
            onClick={() => addItem('socialBar', { emoji: '', text: '' })}
          >
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* ── Brand Story ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Our Story</CardTitle>
              <CardDescription>Brand story section shown on the homepage.</CardDescription>
            </div>
            <Switch
              checked={form.brandStory.enabled}
              onCheckedChange={v => setBrandStoryField('enabled', v)}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Left — text fields */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Section Title</Label>
                <Input
                  value={form.brandStory.title}
                  onChange={e => setBrandStoryField('title', e.target.value)}
                  placeholder="Our Story"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Paragraph 1</Label>
                <Textarea
                  value={form.brandStory.paragraph1}
                  onChange={e => setBrandStoryField('paragraph1', e.target.value)}
                  rows={4}
                  placeholder="Tell your brand story…"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Paragraph 2</Label>
                <Textarea
                  value={form.brandStory.paragraph2}
                  onChange={e => setBrandStoryField('paragraph2', e.target.value)}
                  rows={4}
                  placeholder="Continue your story…"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Button Text</Label>
                  <Input
                    value={form.brandStory.buttonText}
                    onChange={e => setBrandStoryField('buttonText', e.target.value)}
                    placeholder="Learn More"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Button Link</Label>
                  <Input
                    value={form.brandStory.buttonLink}
                    onChange={e => setBrandStoryField('buttonLink', e.target.value)}
                    placeholder="/about"
                  />
                </div>
              </div>
            </div>

            {/* Right — image */}
            <div className="space-y-2">
              <Label className="text-xs">Story Image</Label>
              <div
                className="relative border-2 border-dashed border-border rounded-lg overflow-hidden cursor-pointer group"
                style={{ aspectRatio: '3 / 4' }}
                onClick={() => !uploadingStoryImage && storyImageRef.current?.click()}
              >
                {form.brandStory.imageUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.brandStory.imageUrl}
                      alt="Story"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                      <Upload className="h-5 w-5 text-white" />
                      <p className="text-xs text-white font-medium">Click to replace</p>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Upload className="h-6 w-6" />
                    <p className="text-xs text-center px-2">Click to upload</p>
                    <p className="text-[10px] text-center px-2 leading-relaxed">
                      900 × 1200 px recommended<br />3:4 portrait · max 5 MB<br />JPG, PNG, WebP
                    </p>
                  </div>
                )}
                {uploadingStoryImage && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <Input
                value={form.brandStory.imageUrl}
                onChange={e => setBrandStoryField('imageUrl', e.target.value)}
                placeholder="Or paste image URL…"
                className="text-xs font-mono"
              />
              <input ref={storyImageRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleStoryImage} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Button
        onClick={() => mutation.mutate(form)}
        disabled={mutation.isPending}
        className="w-full sm:w-auto"
      >
        {mutation.isPending ? 'Saving…' : 'Save Settings'}
      </Button>
    </div>
  );
}

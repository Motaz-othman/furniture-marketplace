'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSettings, updateSettings } from '@/lib/services/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_DELIVERY_PRICING = {
  smallParcel: [
    { key: 'GROUND',   label: 'Ground Shipping', description: 'Delivered within 7–14 business days once shipped', price: 0 },
    { key: 'TWO_DAY',  label: '2-Day Shipping',  description: 'Delivered within 2 business days once shipped',   price: 29 },
    { key: 'ONE_DAY',  label: '1-Day Shipping',  description: 'Delivered within 1 business day once shipped',    price: 59 },
  ],
  ltl: [
    { key: 'OUTSIDE_DROP_OFF', label: 'Outside Drop Off',        description: 'Scheduled delivery to the outside entrance of your home at ground level', price: 0 },
    { key: 'IN_HOME_DROP_OFF', label: 'In Home Drop Off',        description: 'Scheduled delivery to the immediate entryway inside your home',           price: 0 },
    { key: 'ROOM_OF_CHOICE',  label: 'Room of Choice Delivery', description: 'Scheduled delivery to your room of choice on any floor',                  price: 119 },
    { key: 'WHITE_GLOVE',     label: 'White Glove Delivery',    description: 'Room of Choice + Full Assembly & Packaging Removal',                      price: 199 },
  ],
};

const TIERS = [
  {
    tier: 'smallParcel',
    label: 'Small Parcel',
    hint: 'Rugs and small accessories — products with shipType: Small Parcel or GROUND',
  },
  {
    tier: 'ltl',
    label: 'LTL / Large Items',
    hint: 'Furniture and oversize pieces — products with shipType: LTL or GROUND - OVERSIZE',
  },
];

export default function DeliveryPricingPage() {
  const queryClient = useQueryClient();
  const { data: allSettings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });

  const [pricing, setPricing] = useState(DEFAULT_DELIVERY_PRICING);

  useEffect(() => {
    if (allSettings) {
      setPricing({
        smallParcel: allSettings.deliveryPricing?.smallParcel?.length > 0
          ? allSettings.deliveryPricing.smallParcel
          : DEFAULT_DELIVERY_PRICING.smallParcel,
        ltl: allSettings.deliveryPricing?.ltl?.length > 0
          ? allSettings.deliveryPricing.ltl
          : DEFAULT_DELIVERY_PRICING.ltl,
      });
    }
  }, [allSettings]);

  const mutation = useMutation({
    mutationFn: (deliveryPricing) =>
      updateSettings({ ...allSettings, deliveryPricing }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Delivery pricing saved');
    },
    onError: () => toast.error('Failed to save delivery pricing'),
  });

  function updateOption(tier, index, field, value) {
    setPricing((p) => {
      const options = [...p[tier]];
      options[index] = { ...options[index], [field]: value };
      return { ...p, [tier]: options };
    });
  }

  function addOption(tier) {
    setPricing((p) => ({
      ...p,
      [tier]: [
        ...p[tier],
        { key: crypto.randomUUID().slice(0, 8).toUpperCase(), label: '', description: '', price: 0 },
      ],
    }));
  }

  function removeOption(tier, index) {
    setPricing((p) => ({ ...p, [tier]: p[tier].filter((_, i) => i !== index) }));
  }

  function handleReset() {
    setPricing(DEFAULT_DELIVERY_PRICING);
  }

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Delivery Pricing</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure the delivery options and prices shown to customers at checkout.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleReset}>
          <RotateCcw className="h-3.5 w-3.5" /> Reset to Defaults
        </Button>
      </div>

      <div className="space-y-6">
        {TIERS.map(({ tier, label, hint }) => (
          <Card key={tier}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{label}</CardTitle>
                  <CardDescription className="text-xs mt-0.5">{hint}</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => addOption(tier)}>
                  <Plus className="h-3.5 w-3.5" /> Add Option
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {pricing[tier]?.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                  No options. Click "Add Option" to add one.
                </p>
              )}
              {(pricing[tier] || []).map((opt, i) => (
                <div key={opt.key || i} className="grid grid-cols-[1fr_2fr_90px_36px] gap-2 items-end">
                  <div className="space-y-1">
                    {i === 0 && <Label className="text-xs">Label</Label>}
                    <Input
                      value={opt.label}
                      onChange={(e) => updateOption(tier, i, 'label', e.target.value)}
                      placeholder="Ground Shipping"
                    />
                  </div>
                  <div className="space-y-1">
                    {i === 0 && <Label className="text-xs">Description</Label>}
                    <Input
                      value={opt.description}
                      onChange={(e) => updateOption(tier, i, 'description', e.target.value)}
                      placeholder="Delivered in 7–14 business days"
                    />
                  </div>
                  <div className="space-y-1">
                    {i === 0 && <Label className="text-xs">Price ($)</Label>}
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={opt.price}
                      onChange={(e) => updateOption(tier, i, 'price', Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => removeOption(tier, i)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      <Button
        onClick={() => mutation.mutate(pricing)}
        disabled={mutation.isPending || !allSettings}
      >
        {mutation.isPending ? 'Saving…' : 'Save Delivery Pricing'}
      </Button>
    </div>
  );
}

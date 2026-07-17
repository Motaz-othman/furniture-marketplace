import db from '../config/db.js';

export const DEFAULT_PRICING_SETTINGS = {
  deliveryTiers: [
    { id: 1,  label: 'Parcel XS',        maxWeight: 3,    rate: 22  },
    { id: 2,  label: 'Parcel small',      maxWeight: 7,    rate: 32  },
    { id: 3,  label: 'Parcel medium',     maxWeight: 15,   rate: 45  },
    { id: 4,  label: 'Parcel large',      maxWeight: 30,   rate: 62  },
    { id: 5,  label: 'Parcel oversized',  maxWeight: 50,   rate: 88  },
    { id: 6,  label: 'Parcel heavy+',     maxWeight: 70,   rate: 115 },
    { id: 7,  label: 'LTL light',         maxWeight: 150,  rate: 185 },
    { id: 8,  label: 'LTL standard',      maxWeight: 250,  rate: 310 },
    { id: 9,  label: 'LTL heavy',         maxWeight: 400,  rate: 460 },
    { id: 10, label: 'LTL oversized',     maxWeight: 600,  rate: 620 },
    { id: 11, label: 'LTL max',           maxWeight: null, rate: 750 },
  ],
  whiteGloveTiers: [
    { id: 1, label: 'Simple (no assembly)',              maxWeight: 30,   price: 99  },
    { id: 2, label: 'Basic (chairs, small tables)',      maxWeight: 100,  price: 149 },
    { id: 3, label: 'Standard (sofas, beds, dressers)',  maxWeight: 250,  price: 229 },
    { id: 4, label: 'Complex (sectionals, dining sets)', maxWeight: 500,  price: 329 },
    { id: 5, label: 'Full suite (bedroom/dining room)',  maxWeight: null, price: 449 },
  ],
  marketingPercent: 12,
  marginPercent: 25,
  stockSafetyMargin: 0,
};

export function getDeliveryRate(weightLbs, tiers) {
  const sorted = [...tiers].sort((a, b) => (a.maxWeight ?? Infinity) - (b.maxWeight ?? Infinity));
  for (const tier of sorted) {
    if (tier.maxWeight === null || weightLbs <= tier.maxWeight) return tier.rate;
  }
  return sorted[sorted.length - 1].rate;
}

export function getWhiteGloveRate(weightLbs, tiers) {
  const sorted = [...tiers].sort((a, b) => (a.maxWeight ?? Infinity) - (b.maxWeight ?? Infinity));
  for (const tier of sorted) {
    if (tier.maxWeight === null || weightLbs <= tier.maxWeight) return tier.price;
  }
  return sorted[sorted.length - 1].price;
}

export function extractWeight(packaging) {
  if (!packaging) return 0;
  const boxes = Array.isArray(packaging) ? packaging : [packaging];
  let total = 0;
  for (const b of boxes) {
    const w = b.weight ?? b.packageWeight ?? b.shippingWeight ?? 0;
    const unit = (b.unitOfMeasureWeight || b.weightUnit || 'lbs').toLowerCase();
    total += unit === 'kg' ? w * 2.205 : w;
  }
  return total;
}

export function calcDisplayPrice(cost, weightLbs, mapPrice, pricingSettings) {
  const { deliveryTiers, marketingPercent, marginPercent } = pricingSettings;
  const divisor = 1 - marketingPercent / 100 - marginPercent / 100;
  if (divisor <= 0) return null;
  const deliveryCost = Math.min(getDeliveryRate(weightLbs, deliveryTiers), cost);
  const formulaPrice = (cost + deliveryCost) / divisor;
  const validMap = mapPrice && mapPrice > cost * 1.1 ? mapPrice : null;
  const finalPrice = validMap ? Math.max(formulaPrice, validMap) : formulaPrice;
  return Math.round(finalPrice * 100) / 100;
}

export async function loadPricingSettings() {
  try {
    const record = await db.siteSettings.findUnique({ where: { id: 'main' } });
    return record?.settings?.pricingSettings || DEFAULT_PRICING_SETTINGS;
  } catch {
    return DEFAULT_PRICING_SETTINGS;
  }
}

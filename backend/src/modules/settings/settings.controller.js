import db from '../../shared/config/db.js';
import { DEFAULT_PRICING_SETTINGS, calcDisplayPrice, extractWeight } from '../../shared/utils/pricing.js';

export const DEFAULT_DELIVERY_PRICING = {
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

const DEFAULT_SETTINGS = {
  heroSlides: {
    items: [
      {
        id: '1',
        title: 'Quality Furniture, Carefully Selected',
        subtitle: 'Handpicked pieces from trusted makers worldwide',
        ctaText: 'Shop Collection',
        ctaLink: '/products',
        mediaType: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=2400&q=80',
        focalPoint: '50% 50%',
      },
      {
        id: '2',
        title: 'New Arrivals Every Week',
        subtitle: 'Discover the latest additions to our curated collection',
        ctaText: "See What's New",
        ctaLink: '/products?filter=new',
        mediaType: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=2400&q=80',
        focalPoint: '50% 50%',
      },
      {
        id: '3',
        title: 'Try Before You Buy with AR',
        subtitle: 'See furniture in your space with augmented reality',
        ctaText: 'Coming Soon',
        ctaLink: '#',
        mediaType: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=2400&q=80',
        focalPoint: '50% 50%',
      },
    ],
  },
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

export async function getSettings(req, res) {
  try {
    const record = await db.siteSettings.findUnique({ where: { id: 'main' } });
    const settings = record ? record.settings : DEFAULT_SETTINGS;
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
}

export async function getDeliveryOptions(req, res) {
  try {
    const record = await db.siteSettings.findUnique({ where: { id: 'main' } });
    const pricing = record?.settings?.deliveryPricing || DEFAULT_DELIVERY_PRICING;
    res.json(pricing);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch delivery options' });
  }
}

export async function updateSettings(req, res) {
  try {
    const record = await db.siteSettings.upsert({
      where: { id: 'main' },
      update: { settings: req.body },
      create: { id: 'main', settings: req.body },
    });
    res.json(record.settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
}

// ─── Pricing Settings endpoints ──────────────────────────────────────

export async function getPricingSettings(req, res) {
  try {
    const record = await db.siteSettings.findUnique({ where: { id: 'main' } });
    const pricing = record?.settings?.pricingSettings || DEFAULT_PRICING_SETTINGS;
    res.json(pricing);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pricing settings' });
  }
}

export async function updatePricingSettings(req, res) {
  try {
    const record = await db.siteSettings.findUnique({ where: { id: 'main' } });
    const current = record?.settings || {};
    const updated = { ...current, pricingSettings: req.body };
    await db.siteSettings.upsert({
      where: { id: 'main' },
      update: { settings: updated },
      create: { id: 'main', settings: updated },
    });
    res.json(req.body);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update pricing settings' });
  }
}

export async function recalculateAllPrices(req, res) {
  try {
    const record = await db.siteSettings.findUnique({ where: { id: 'main' } });
    const pricingSettings = record?.settings?.pricingSettings || DEFAULT_PRICING_SETTINGS;

    const listings = await db.storefrontListing.findMany({
      select: {
        id: true,
        product: {
          select: {
            variants: {
              select: { price: true, packaging: true },
              orderBy: { rank: 'asc' },
              take: 1,
            },
          },
        },
      },
    });

    const updates = [];
    let skipped = 0;

    for (const listing of listings) {
      const variant = listing.product?.variants?.[0];
      const cost = variant?.price?.cost;
      const weight = extractWeight(variant?.packaging);
      if (!cost || cost <= 0 || weight <= 0) { skipped++; continue; }

      const map = variant?.price?.mapPrice;
      const displayPrice = calcDisplayPrice(cost, weight, map, pricingSettings);
      updates.push({ id: listing.id, displayPrice });
    }

    // Batch update in chunks of 50
    const BATCH = 50;
    for (let i = 0; i < updates.length; i += BATCH) {
      await db.$transaction(
        updates.slice(i, i + BATCH).map(u =>
          db.storefrontListing.update({ where: { id: u.id }, data: { displayPrice: u.displayPrice } })
        )
      );
    }

    // Save lastRecalculatedAt
    const currentSettings = record?.settings || {};
    const ps = { ...(currentSettings.pricingSettings || DEFAULT_PRICING_SETTINGS), lastRecalculatedAt: new Date().toISOString() };
    await db.siteSettings.upsert({
      where: { id: 'main' },
      update: { settings: { ...currentSettings, pricingSettings: ps } },
      create: { id: 'main', settings: { ...currentSettings, pricingSettings: ps } },
    });

    res.json({ updated: updates.length, skipped, total: listings.length });
  } catch (err) {
    console.error('Recalculate prices error:', err);
    res.status(500).json({ error: 'Failed to recalculate prices' });
  }
}

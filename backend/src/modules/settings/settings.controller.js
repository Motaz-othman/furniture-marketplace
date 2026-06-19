import db from '../../shared/config/db.js';

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

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getSettings } from '@/lib/api/settings';
import { logger } from '@/lib/logger';
import Link from 'next/link';
import Image from 'next/image';
import MainLayout from '@/components/layout/MainLayout';
import ProductCard from '@/components/products/ProductCard';
import { useFeaturedProducts, useNewProducts, useParentCategories } from '@/lib/hooks';

const CATEGORY_IMAGES = {
  'bedroom':               'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80',
  'living-room':           'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
  'dining-kitchen':        'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800&q=80',
  'dining-room':           'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800&q=80',
  'office':                'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800&q=80',
  'outdoor':               'https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?w=800&q=80',
  'decor':                 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80',
  'rugs':                  'https://images.unsplash.com/photo-1558997519-83ea9252edc8?w=800&q=80',
  'lighting':              'https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=800&q=80',
  'mattresses-and-bedding':'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80',
  'mattresses':            'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80',
};

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

function getYouTubeId(url) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?#\s]{11})/);
  return m ? m[1] : null;
}

function getVimeoId(url) {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

function isDirectVideo(url) {
  return /\.(mp4|webm|ogg)(\?|$)/i.test(url);
}

function HeroBackground({ slide, priority = false }) {
  if (slide.mediaType === 'video' && slide.mediaUrl) {
    const ytId = getYouTubeId(slide.mediaUrl);
    const vimeoId = getVimeoId(slide.mediaUrl);

    if (ytId) {
      return (
        <div className="hero-iframe-wrapper">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=1&loop=1&controls=0&playlist=${ytId}&disablekb=1&modestbranding=1&showinfo=0&rel=0`}
            allow="autoplay; fullscreen"
            style={{ border: 0 }}
            title="Hero video"
          />
        </div>
      );
    }

    if (vimeoId) {
      return (
        <div className="hero-iframe-wrapper">
          <iframe
            src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1&muted=1&loop=1&controls=0&background=1`}
            allow="autoplay; fullscreen"
            style={{ border: 0 }}
            title="Hero video"
          />
        </div>
      );
    }

    if (isDirectVideo(slide.mediaUrl)) {
      return (
        <video
          className="hero-video"
          autoPlay
          muted
          loop
          playsInline
          key={slide.mediaUrl}
        >
          <source src={slide.mediaUrl} />
        </video>
      );
    }
  }

  if (slide.mediaUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={slide.mediaUrl}
        className="hero-bg"
        alt={slide.title}
        style={{ objectPosition: slide.focalPoint || 'center center' }}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'low'}
        decoding="async"
      />
    );
  }

  return null;
}

function EmptyState({ icon, title, description, actionText, actionLink }) {
  return (
    <div className="empty-state">
      <div className="empty-state-illustration">
        <span className="empty-state-icon">{icon}</span>
        <div className="empty-state-circles">
          <div className="circle circle-1"></div>
          <div className="circle circle-2"></div>
          <div className="circle circle-3"></div>
        </div>
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>
      {actionText && actionLink && (
        <Link href={actionLink} className="empty-state-action">
          {actionText}
        </Link>
      )}
    </div>
  );
}

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const heroRef = useRef(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const { data: featuredData, isLoading: featuredLoading, error: featuredError, refetch: refetchFeatured } = useFeaturedProducts();
  const { data: newData, isLoading: newLoading, error: newError, refetch: refetchNew } = useNewProducts();
  const { data: categoriesData } = useParentCategories();

  const featuredProducts = featuredData?.data || [];
  const newProducts = newData?.data || [];

  const [heroSlides, setHeroSlides] = useState(DEFAULT_HERO_SLIDES);
  const [offerBar, setOfferBar] = useState({
    enabled: true,
    items: [
      { emoji: '🎉', text: '20% Off First Order' },
      { emoji: '🚚', text: 'Free Shipping Over $500' },
      { emoji: '💳', text: 'Buy Now, Pay Later' },
      { emoji: '🔄', text: '30-Day Easy Returns' },
    ],
  });
  const [socialBar, setSocialBar] = useState({
    enabled: true,
    items: [
      { emoji: '⭐', text: '4.8/5 Customer Rating' },
      { emoji: '📈', text: 'Trending Products' },
      { emoji: '😊', text: '98% Satisfaction Rate' },
      { emoji: '🏆', text: 'Award-Winning Service' },
    ],
  });
  const [brandStory, setBrandStory] = useState({
    enabled: true,
    title: 'Our Story',
    paragraph1: 'At LiviPoint, we believe your home should tell your story. That\'s why we\'ve spent years building relationships with the world\'s finest furniture makers, bringing you pieces that combine timeless design with modern craftsmanship.',
    paragraph2: 'Every item in our collection is carefully vetted for quality, sustainability, and style. We don\'t just sell furniture—we help you create spaces that inspire, comfort, and endure.',
    buttonText: 'Learn More About Us',
    buttonLink: '/about',
    imageUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80',
  });

  useEffect(() => {
    getSettings()
      .then(s => {
        if (s?.heroSlides?.items?.length > 0) setHeroSlides(s.heroSlides.items);
        if (s?.offerBar) setOfferBar(s.offerBar);
        if (s?.socialBar) setSocialBar(s.socialBar);
        if (s?.brandStory) setBrandStory(s.brandStory);
      })
      .catch(err => logger.error('Settings fetch failed:', err));
  }, []);

  // Reset slide index if slides change and current index is out of bounds
  useEffect(() => {
    setCurrentSlide(prev => (prev >= heroSlides.length ? 0 : prev));
  }, [heroSlides.length]);

  const slideCount = heroSlides.length;

  // Auto-advance carousel
  useEffect(() => {
    if (isPaused || slideCount < 2) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slideCount);
    }, 7000);
    return () => clearInterval(interval);
  }, [isPaused, slideCount]);

  // Keyboard navigation
  useEffect(() => {
    if (slideCount < 2) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') setCurrentSlide(prev => (prev === 0 ? slideCount - 1 : prev - 1));
      if (e.key === 'ArrowRight') setCurrentSlide(prev => (prev + 1) % slideCount);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slideCount]);

  // Swipe handlers
  const handleTouchStart = useCallback((e) => { touchStartX.current = e.touches[0].clientX; }, []);
  const handleTouchMove = useCallback((e) => { touchEndX.current = e.touches[0].clientX; }, []);
  const handleTouchEnd = useCallback(() => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      setCurrentSlide(prev =>
        diff > 0
          ? (prev + 1) % slideCount
          : (prev === 0 ? slideCount - 1 : prev - 1)
      );
    }
  }, [slideCount]);

  const scrollCarousel = (direction, containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.scrollBy({ left: direction === 'right' ? 300 : -300, behavior: 'smooth' });
  };

  return (
    <MainLayout>
      {/* HERO CAROUSEL */}
      <section
        className="hero"
        ref={heroRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {heroSlides.map((slide, index) => (
          <div
            key={slide.id || index}
            className={`hero-slide ${index === currentSlide ? 'active' : ''}`}
          >
            <HeroBackground slide={slide} priority={currentSlide === 0} />
            <div className="hero-overlay" />
          </div>
        ))}

        <div className="hero-content">
          <h1 className="hero-title">{heroSlides[currentSlide]?.title}</h1>
          <p className="hero-subtitle">{heroSlides[currentSlide]?.subtitle}</p>
          {heroSlides[currentSlide]?.ctaText && (
            <Link
              href={heroSlides[currentSlide]?.ctaLink || '#'}
              className="btn btn-hero"
            >
              {heroSlides[currentSlide].ctaText}
            </Link>
          )}

          {slideCount > 1 && (
            <div className="hero-dots">
              {heroSlides.map((_, index) => (
                <button
                  key={index}
                  className={`hero-dot ${index === currentSlide ? 'active' : ''}`}
                  onClick={() => setCurrentSlide(index)}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SHOP BY ROOM */}
      {categoriesData?.data?.length > 0 && (
        <section className="shop-by-room-section">
          <div className="container">
            <h2 className="section-title shop-by-room-title">Shop by Category</h2>
            <div className="shop-by-room-grid">
              {categoriesData.data
                .filter((cat) => cat.slug !== 'clearance')
                .map((cat) => {
                  const imageUrl = CATEGORY_IMAGES[cat.slug];
                  const href = `/categories/${cat.slug}`;
                  return (
                    <Link key={cat.id} href={href} className="room-tile">
                      <div className="room-tile-image">
                        {imageUrl && (
                          <Image
                            src={imageUrl}
                            alt={cat.name}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            style={{ objectFit: 'cover' }}
                          />
                        )}
                        <div className="room-tile-overlay" />
                      </div>
                      <span className="room-tile-name">{cat.name}</span>
                    </Link>
                  );
                })}
            </div>
          </div>
        </section>
      )}

      {/* OFFER BAR */}
      {offerBar.enabled && offerBar.items.length > 0 && (
        <section className="social-proof-bar">
          <div className="container">
            <div className="proof-stats">
              {offerBar.items.map((item, i) => (
                <div key={i} className="proof-stat">
                  <div className="proof-number">{item.emoji}</div>
                  <div className="proof-label">{item.text}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TRENDING PRODUCTS */}
      <section className="product-section">
        <div className="container">
          <div className="section-header product-header">
            <h2 className="section-title">Trending Now</h2>
            <Link href="/products" className="section-link">View All</Link>
          </div>

          {featuredLoading ? (
            <div className="skeleton-carousel">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton-product-card">
                  <div className="skeleton-image"></div>
                  <div className="skeleton-content">
                    <div className="skeleton-text"></div>
                    <div className="skeleton-text short"></div>
                    <div className="skeleton-text price"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : featuredError ? (
            <div className="error-state">
              <div className="error-icon">⚠️</div>
              <p className="error-message">Unable to load trending products</p>
              <button className="error-retry-btn" onClick={() => refetchFeatured()}>Try Again</button>
            </div>
          ) : featuredProducts.length === 0 ? (
            <EmptyState
              icon="🔥"
              title="Trending Soon"
              description="Our trending products are being updated. New favorites coming your way!"
              actionText="Explore All Products"
              actionLink="/products"
            />
          ) : (
            <div className="product-carousel-wrapper">
              <button
                className="carousel-arrow carousel-arrow-left"
                onClick={() => scrollCarousel('left', 'products-scroll')}
                aria-label="Scroll trending products left"
              >‹</button>
              <div className="products-scroll" id="products-scroll">
                {featuredProducts.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
                ))}
              </div>
              <button
                className="carousel-arrow carousel-arrow-right"
                onClick={() => scrollCarousel('right', 'products-scroll')}
                aria-label="Scroll trending products right"
              >›</button>
            </div>
          )}
        </div>
      </section>

      {/* CUSTOMER SATISFACTION BAR */}
      {socialBar.enabled && socialBar.items.length > 0 && (
      <section className="social-media-bar">
        <div className="container">
          <div className="social-media-content">
            {socialBar.items.map((item, i) => (
              <div key={i} className="social-feature">
                <div className="social-feature-icon">{item.emoji}</div>
                <div className="social-feature-label">{item.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* NEW ARRIVALS */}
      <section className="product-section" style={{ background: '#fafaf8' }}>
        <div className="container">
          <div className="section-header product-header">
            <h2 className="section-title">New Arrivals</h2>
            <Link href="/products?filter=new" className="section-link">View All</Link>
          </div>

          {newLoading ? (
            <div className="skeleton-carousel">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton-product-card">
                  <div className="skeleton-image"></div>
                  <div className="skeleton-content">
                    <div className="skeleton-text"></div>
                    <div className="skeleton-text short"></div>
                    <div className="skeleton-text price"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : newError ? (
            <div className="error-state">
              <div className="error-icon">⚠️</div>
              <p className="error-message">Unable to load new arrivals</p>
              <button className="error-retry-btn" onClick={() => refetchNew()}>Try Again</button>
            </div>
          ) : newProducts.length === 0 ? (
            <EmptyState
              icon="✨"
              title="Fresh Arrivals Coming"
              description="We're adding new pieces to our collection. Stay tuned for exciting additions!"
              actionText="See Current Collection"
              actionLink="/products"
            />
          ) : (
            <div className="product-carousel-wrapper">
              <button
                className="carousel-arrow carousel-arrow-left"
                onClick={() => scrollCarousel('left', 'new-products-scroll')}
                aria-label="Scroll new arrivals left"
              >‹</button>
              <div className="products-scroll" id="new-products-scroll">
                {newProducts.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
                ))}
              </div>
              <button
                className="carousel-arrow carousel-arrow-right"
                onClick={() => scrollCarousel('right', 'new-products-scroll')}
                aria-label="Scroll new arrivals right"
              >›</button>
            </div>
          )}
        </div>
      </section>

      {/* BRAND STORY */}
      {brandStory.enabled && (
        <section className="brand-story-section">
          <div className="container">
            <div className="brand-story-content">
              <div className="brand-story-text">
                <h2 className="section-title" style={{ textAlign: 'left' }}>{brandStory.title}</h2>
                {brandStory.paragraph1 && (
                  <p className="brand-story-description">{brandStory.paragraph1}</p>
                )}
                {brandStory.paragraph2 && (
                  <p className="brand-story-description">{brandStory.paragraph2}</p>
                )}
                {brandStory.buttonText && (
                  <Link href={brandStory.buttonLink || '#'} className="btn" style={{ marginTop: '20px' }}>
                    {brandStory.buttonText}
                  </Link>
                )}
              </div>
              {brandStory.imageUrl && (
                <div className="brand-story-image">
                  <Image
                    src={brandStory.imageUrl}
                    alt={brandStory.title}
                    width={450}
                    height={600}
                    style={{ width: '100%', height: 'auto' }}
                  />
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </MainLayout>
  );
}

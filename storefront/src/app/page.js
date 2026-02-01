'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import MainLayout from '@/components/layout/MainLayout';
import ProductCard from '@/components/products/ProductCard';
import { useFeaturedProducts, useNewProducts, useParentCategories } from '@/lib/hooks';

// Empty State Component
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

  // Fetch data using hooks
  const { data: categoriesData, isLoading: categoriesLoading, error: categoriesError, refetch: refetchCategories } = useParentCategories();
  const { data: featuredData, isLoading: featuredLoading, error: featuredError, refetch: refetchFeatured } = useFeaturedProducts();
  const { data: newData, isLoading: newLoading, error: newError, refetch: refetchNew } = useNewProducts();

  // Extract data from response
  const categories = categoriesData?.data || [];
  const featuredProducts = featuredData?.data || [];
  const newProducts = newData?.data || [];

  // Hero carousel auto-advance with pause support
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 3);
    }, 7000); // Increased to 7 seconds for better readability
    return () => clearInterval(interval);
  }, [isPaused]);

  // Keyboard navigation for hero carousel
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        setCurrentSlide((prev) => (prev === 0 ? 2 : prev - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentSlide((prev) => (prev + 1) % 3);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Swipe gesture handlers for hero carousel
  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const swipeThreshold = 50;
    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        // Swipe left - go to next slide
        setCurrentSlide((prev) => (prev + 1) % 3);
      } else {
        // Swipe right - go to previous slide
        setCurrentSlide((prev) => (prev === 0 ? 2 : prev - 1));
      }
    }
  }, []);

  // Hero slides
  const heroSlides = [
    {
      title: "Quality Furniture, Carefully Selected",
      subtitle: "Handpicked pieces from trusted makers worldwide",
      cta: "Shop Collection",
      link: "/products",
      image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=2400&q=80"
    },
    {
      title: "New Arrivals Every Week",
      subtitle: "Discover the latest additions to our curated collection",
      cta: "See What's New",
      link: "/products?filter=new",
      image: "https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=2400&q=80"
    },
    {
      title: "Try Before You Buy with AR",
      subtitle: "See furniture in your space with augmented reality",
      cta: "Coming Soon",
      link: "#",
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=2400&q=80"
    }
  ];

  // Scroll carousel using native scroll
  const scrollCarousel = (direction, containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const scrollAmount = 300;
    container.scrollBy({
      left: direction === 'right' ? scrollAmount : -scrollAmount,
      behavior: 'smooth'
    });
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
            key={index}
            className={`hero-slide ${index === currentSlide ? 'active' : ''}`}
          >
            <Image
              src={slide.image}
              className="hero-bg"
              alt={slide.title}
              fill
              sizes="100vw"
              priority={index === 0}
            />
            <div className="hero-overlay"></div>
          </div>
        ))}

        <div className="hero-content">
          <h1 className="hero-title">{heroSlides[currentSlide].title}</h1>
          <p className="hero-subtitle">{heroSlides[currentSlide].subtitle}</p>
          <Link href={heroSlides[currentSlide].link} className="btn btn-hero">{heroSlides[currentSlide].cta}</Link>

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
        </div>
      </section>

      {/* CATEGORIES - FIXED WITH LINKS! */}
      <section className="categories-section">
        <div className="container">
          <div className="section-header category-header">
            <div>
              <h2 className="section-title">Explore Our Collections</h2>
            </div>
          </div>

          {categoriesLoading ? (
            <div className="skeleton-carousel">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton-category-card">
                  <div className="skeleton-image"></div>
                  <div className="skeleton-text"></div>
                </div>
              ))}
            </div>
          ) : categoriesError ? (
            <div className="error-state">
              <div className="error-icon">⚠️</div>
              <p className="error-message">Unable to load categories</p>
              <button className="error-retry-btn" onClick={() => refetchCategories()}>
                Try Again
              </button>
            </div>
          ) : categories.length === 0 ? (
            <EmptyState
              icon="🏠"
              title="No Collections Yet"
              description="We're curating amazing furniture collections for you. Check back soon!"
              actionText="Browse All Products"
              actionLink="/products"
            />
          ) : (
            <div className="category-carousel-wrapper">
              <button
                className="carousel-arrow carousel-arrow-left"
                onClick={() => scrollCarousel('left', 'categories-scroll')}
                aria-label="Scroll categories left"
              >‹</button>
              <div className="categories-scroll" id="categories-scroll">
                {categories.map((cat) => (
                  <Link
                    href={`/categories/${cat.slug}`}
                    key={cat.id}
                    className="subcategory-card"
                  >
                    <div className="subcategory-image">
                      <Image
                        src={cat.imageUrl}
                        alt={cat.name}
                        fill
                        sizes="(max-width: 640px) 50vw, 200px"
                      />
                    </div>
                    <h3 className="subcategory-name">{cat.name}</h3>
                  </Link>
                ))}
              </div>
              <button
                className="carousel-arrow carousel-arrow-right"
                onClick={() => scrollCarousel('right', 'categories-scroll')}
                aria-label="Scroll categories right"
              >›</button>
            </div>
          )}
        </div>
      </section>

      {/* OFFER BAR */}
      <section className="social-proof-bar">
        <div className="container">
          <div className="proof-stats">
            <div className="proof-stat">
              <div className="proof-number">🎉</div>
              <div className="proof-label">20% Off First Order</div>
            </div>
            <div className="proof-stat">
              <div className="proof-number">🚚</div>
              <div className="proof-label">Free Shipping Over $500</div>
            </div>
            <div className="proof-stat">
              <div className="proof-number">💳</div>
              <div className="proof-label">Buy Now, Pay Later</div>
            </div>
            <div className="proof-stat">
              <div className="proof-number">🔄</div>
              <div className="proof-label">30-Day Easy Returns</div>
            </div>
          </div>
        </div>
      </section>

      {/* TRENDING PRODUCTS - Using Featured */}
      <section className="product-section">
        <div className="container">
          <div className="section-header product-header">
            <div>
              <h2 className="section-title">Trending Now</h2>
            </div>
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
              <button className="error-retry-btn" onClick={() => refetchFeatured()}>
                Try Again
              </button>
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
      <section className="social-media-bar">
        <div className="container">
          <div className="social-media-content">
            <div className="social-feature">
              <div className="social-feature-icon">⭐</div>
              <div className="social-feature-label">4.8/5 Customer Rating</div>
            </div>
            <div className="social-feature">
              <div className="social-feature-icon">📈</div>
              <div className="social-feature-label">Trending Products</div>
            </div>
            <div className="social-feature">
              <div className="social-feature-icon">😊</div>
              <div className="social-feature-label">98% Satisfaction Rate</div>
            </div>
            <div className="social-feature">
              <div className="social-feature-icon">🏆</div>
              <div className="social-feature-label">Award-Winning Service</div>
            </div>
          </div>
        </div>
      </section>

      {/* NEW ARRIVALS */}
      <section className="product-section" style={{ background: '#fafaf8' }}>
        <div className="container">
          <div className="section-header product-header">
            <div>
              <h2 className="section-title">New Arrivals</h2>
            </div>
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
              <button className="error-retry-btn" onClick={() => refetchNew()}>
                Try Again
              </button>
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
      <section className="brand-story-section">
        <div className="container">
          <div className="brand-story-content">
            <div className="brand-story-text">
              <h2 className="section-title" style={{ textAlign: 'left' }}>Our Story</h2>
              <p className="brand-story-description">
                At LiviPoint, we believe your home should tell your story. That's why we've spent years building relationships
                with the world's finest furniture makers, bringing you pieces that combine timeless design with modern craftsmanship.
              </p>
              <p className="brand-story-description">
                Every item in our collection is carefully vetted for quality, sustainability, and style. We don't just sell furniture—we
                help you create spaces that inspire, comfort, and endure.
              </p>
              <Link href="/about" className="btn" style={{ marginTop: '20px' }}>Learn More About Us</Link>
            </div>
            <div className="brand-story-image">
              <Image
                src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80"
                alt="Our showroom"
                width={450}
                height={600}
                style={{ width: '100%', height: 'auto' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED IN / TRUST BADGES */}
      <section className="featured-in">
        <div className="container">
          <h3 className="featured-title">As Featured In</h3>
          <div className="featured-logos">
            <div className="featured-logo">ARCHITECTURAL DIGEST</div>
            <div className="featured-logo">ELLE DECOR</div>
            <div className="featured-logo">DWELL</div>
            <div className="featured-logo">INTERIOR DESIGN</div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
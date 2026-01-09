'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useFeaturedProducts, useNewProducts } from '@/lib/hooks';
import { useParentCategories } from '@/lib/hooks';
import { formatPrice } from '@/lib/utils';

// Product Card Component
function ProductCard({ product, index }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  
  return (
    <div className="product-card">
      <div className="product-image">
        {product.badge && (
          <span 
            className="badge" 
            style={product.badge === 'Sale' ? { background: 'var(--sale-color)', color: '#fff' } : {}}
          >
            {product.isNew ? 'New' : product.isOnSale ? 'Sale' : ''}
          </span>
        )}
        
        <button 
          className={`wishlist-btn ${isWishlisted ? 'active' : ''}`}
          onClick={() => setIsWishlisted(!isWishlisted)}
          aria-label="Add to wishlist"
        >
          <span className="heart-icon">{isWishlisted ? '❤' : '♡'}</span>
        </button>
        
        <div className="product-image-wrapper">
          <img 
            src={product.images[currentImageIndex]?.imageUrl || product.images[0]?.imageUrl} 
            alt={product.name}
            className="product-img"
          />
        </div>
        
        {product.images && product.images.length > 1 && (
          <div className="image-dots">
            {product.images.map((_, idx) => (
              <button
                key={idx}
                className={`image-dot ${idx === currentImageIndex ? 'active' : ''}`}
                onClick={() => setCurrentImageIndex(idx)}
                onMouseEnter={() => setCurrentImageIndex(idx)}
                aria-label={`View image ${idx + 1}`}
              />
            ))}
          </div>
        )}
        
        <div className="quick-view-overlay">
          <button className="quick-view-btn-enhanced">Quick View</button>
        </div>
      </div>
      
      <div className="product-info">
        <h3>{product.name}</h3>
        
        {product.variants && product.variants.length > 0 && (
          <div className="color-swatches">
            {product.variants.slice(0, 3).map((variant, idx) => (
              <div 
                key={variant.id}
                className={`color-swatch ${idx === 0 ? 'active' : ''}`}
                style={{ background: idx === 0 ? '#8b7355' : idx === 1 ? '#4a5568' : '#2d3748' }}
                title={variant.variantName}
              />
            ))}
          </div>
        )}
        
        {product.stockQuantity <= 5 && product.stockQuantity > 0 && (
          <p className="stock-indicator low-stock">Only {product.stockQuantity} left!</p>
        )}
        {product.stockQuantity > 5 && (
          <p className="stock-indicator in-stock">✓ In Stock</p>
        )}
        
        <div className={`product-price ${product.compareAtPrice ? 'sale' : ''}`}>
          {product.compareAtPrice && (
            <span className="old-price">{formatPrice(product.compareAtPrice)}</span>
          )}
          {formatPrice(product.price)}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  // Fetch data using hooks
  const { data: categoriesData, isLoading: categoriesLoading } = useParentCategories();
  const { data: featuredData, isLoading: featuredLoading } = useFeaturedProducts();
  const { data: newData, isLoading: newLoading } = useNewProducts();

  // Extract data from response
  const categories = categoriesData?.data || [];
  const featuredProducts = featuredData?.data || [];
  const newProducts = newData?.data || [];

  // Hero carousel auto-advance
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Track scroll position for back to top button
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hero slides
  const heroSlides = [
    {
      title: "Quality Furniture, Carefully Selected",
      subtitle: "Handpicked pieces from trusted makers worldwide",
      cta: "Shop Collection",
      image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=2400&q=80"
    },
    {
      title: "New Arrivals Every Week",
      subtitle: "Discover the latest additions to our curated collection",
      cta: "See What's New",
      image: "https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=2400&q=80"
    },
    {
      title: "Try Before You Buy with AR",
      subtitle: "See furniture in your space with augmented reality",
      cta: "Launch AR Preview",
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=2400&q=80"
    }
  ];

  const scrollCategories = (direction) => {
    const container = document.getElementById('category-scroll');
    container?.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' });
  };

  const scrollProducts = (direction) => {
    const container = document.getElementById('products-scroll');
    container?.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' });
  };

  return (
    <MainLayout transparentHeader={true}>
      {/* HERO CAROUSEL */}
      <section className="hero">
        {heroSlides.map((slide, index) => (
          <div 
            key={index}
            className={`hero-slide ${index === currentSlide ? 'active' : ''}`}
          >
            <img src={slide.image} className="hero-bg" alt={slide.title} />
            <div className="hero-overlay"></div>
          </div>
        ))}
        
        <div className="hero-content">
          <h1 className="hero-title">{heroSlides[currentSlide].title}</h1>
          <p className="hero-subtitle">{heroSlides[currentSlide].subtitle}</p>
          <a href="#" className="btn btn-hero">{heroSlides[currentSlide].cta}</a>
          
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
          
          <div className="hero-features-panel">
            <div className="hero-feature">
              <span className="hero-feature-icon">✓</span>
              <span className="hero-feature-text">Curated Selection</span>
            </div>
            <div className="hero-feature">
              <span className="hero-feature-icon">★</span>
              <span className="hero-feature-text">Quality Verified</span>
            </div>
            <div className="hero-feature">
              <span className="hero-feature-icon">◆</span>
              <span className="hero-feature-text">AR Preview</span>
            </div>
            <div className="hero-feature">
              <span className="hero-feature-icon">⚡</span>
              <span className="hero-feature-text">Fast Delivery</span>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="categories-section">
        <div className="container">
          <div className="section-header category-header">
            <div>
              <h2 className="section-title">Explore Our Collections</h2>
              <p className="section-subtitle">Discover the perfect pieces to bring your vision to life</p>
            </div>
          </div>
          
          {categoriesLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Loading categories...</div>
          ) : (
            <div className="category-carousel-wrapper">
              <button className="carousel-arrow carousel-arrow-left" onClick={() => scrollCategories('left')}>‹</button>
              <div className="category-scroll" id="category-scroll">
                {categories.map((cat) => (
                  <div className="cat-card" key={cat.id}>
                    <div className="cat-name-top">{cat.name}</div>
                    <img src={cat.imageUrl} alt={cat.name} />
                  </div>
                ))}
              </div>
              <button className="carousel-arrow carousel-arrow-right" onClick={() => scrollCategories('right')}>›</button>
            </div>
          )}
        </div>
      </section>

      {/* SOCIAL PROOF BAR */}
      <section className="social-proof-bar">
        <div className="container">
          <div className="proof-stats">
            <div className="proof-stat">
              <div className="proof-number">10,000+</div>
              <div className="proof-label">Happy Customers</div>
            </div>
            <div className="proof-stat">
              <div className="proof-number">5,000+</div>
              <div className="proof-label">Five-Star Reviews</div>
            </div>
            <div className="proof-stat">
              <div className="proof-number">99%</div>
              <div className="proof-label">Satisfaction Rate</div>
            </div>
            <div className="proof-stat">
              <div className="proof-number">24/7</div>
              <div className="proof-label">Customer Support</div>
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
              <p className="section-subtitle">Our most popular pieces this season</p>
            </div>
            <a href="#" className="section-link">View All</a>
          </div>
          
          {featuredLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Loading products...</div>
          ) : (
            <div className="product-carousel-wrapper">
              <button className="carousel-arrow carousel-arrow-left" onClick={() => scrollProducts('left')}>‹</button>
              <div className="products-scroll" id="products-scroll">
                {featuredProducts.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
                ))}
              </div>
              <button className="carousel-arrow carousel-arrow-right" onClick={() => scrollProducts('right')}>›</button>
            </div>
          )}
        </div>
      </section>

      {/* BRAND STORY */}
      <section className="brand-story-section">
        <div className="container">
          <div className="brand-story-content">
            <div className="brand-story-text">
              <h2 className="brand-story-title">Curated for Your Home</h2>
              <p className="brand-story-para">
                We believe finding the perfect furniture shouldn't be complicated. That's why we've done 
                the hard work for you—carefully selecting pieces from trusted suppliers and bringing them 
                together in one convenient place.
              </p>
              <p className="brand-story-para">
                Whether you're furnishing your first apartment or redesigning your entire home, we're here 
                to make quality furniture accessible and affordable. Browse our collection and discover 
                pieces you'll love.
              </p>
              <div className="brand-values">
                <div className="brand-value">
                  <div className="brand-value-icon">✓</div>
                  <div>
                    <h4>Thoughtfully Selected</h4>
                    <p>Every piece chosen for quality and design</p>
                  </div>
                </div>
                <div className="brand-value">
                  <div className="brand-value-icon">★</div>
                  <div>
                    <h4>Trusted Sources</h4>
                    <p>Working with reliable manufacturers</p>
                  </div>
                </div>
                <div className="brand-value">
                  <div className="brand-value-icon">◆</div>
                  <div>
                    <h4>Great Value</h4>
                    <p>Quality furniture at fair prices</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="brand-story-image">
              <img src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80" alt="Curated for Your Home" />
            </div>
          </div>
        </div>
      </section>

      {/* LIVE CHAT WIDGET */}
      <div className="chat-widget">
        <button className="chat-button" aria-label="Open chat">
          <span className="chat-icon">💬</span>
        </button>
      </div>

      {/* AS FEATURED IN SECTION */}
      <section className="featured-in">
        <div className="container">
          <h3 className="featured-title">As Featured In</h3>
          <div className="featured-logos">
            <div className="featured-logo">Architectural Digest</div>
            <div className="featured-logo">Dwell Magazine</div>
            <div className="featured-logo">Apartment Therapy</div>
            <div className="featured-logo">Elle Decor</div>
            <div className="featured-logo">Design Milk</div>
          </div>
        </div>
      </section>

      {/* BACK TO TOP BUTTON */}
      <button 
        className="back-to-top"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        style={{ 
          opacity: scrollY > 500 ? 1 : 0,
          pointerEvents: scrollY > 500 ? 'auto' : 'none'
        }}
        aria-label="Back to top"
      >
        <span className="back-to-top-icon">↑</span>
      </button>
    </MainLayout>
  );
}
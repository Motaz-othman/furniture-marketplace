'use client';

import React, { useState, useEffect } from 'react';

// Enhanced Product Card Component
function ProductCard({ product, index: cardIndex }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  
  return (
    <div className="product-card">
      <div className="product-image">
        {/* Badge */}
        {product.badge && (
          <span 
            className="badge" 
            style={product.badge === 'Sale' ? { background: 'var(--sale-color)', color: '#fff' } : {}}
          >
            {product.badge}
          </span>
        )}
        
        {/* Wishlist Heart */}
        <button 
          className={`wishlist-btn ${isWishlisted ? 'active' : ''}`}
          onClick={() => setIsWishlisted(!isWishlisted)}
          aria-label="Add to wishlist"
        >
          <span className="heart-icon">{isWishlisted ? '❤' : '♡'}</span>
        </button>
        
        {/* Multi-Image Gallery */}
        <div className="product-image-wrapper">
          <img 
            src={product.images[currentImageIndex]} 
            alt={product.name}
            className="product-img"
          />
        </div>
        
        {/* Image Dots Navigation */}
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
        
        {/* Quick View Overlay */}
        <div className="quick-view-overlay">
          <button className="quick-view-btn-enhanced">Quick View</button>
        </div>
      </div>
      
      <div className="product-info">
        <h3>{product.name}</h3>
        
        {/* Color Swatches */}
        {product.colors && product.colors.length > 0 && (
          <div className="color-swatches">
            {product.colors.map((color, idx) => (
              <div 
                key={idx}
                className={`color-swatch ${idx === 0 ? 'active' : ''}`}
                style={{ background: color }}
                title={`Color ${idx + 1}`}
              />
            ))}
          </div>
        )}
        
        {product.lowStock && <p className="stock-indicator low-stock">Only {product.lowStock} left!</p>}
        {!product.lowStock && product.inStock && <p className="stock-indicator in-stock">✓ {product.shipping}</p>}
        
        <div className={`product-price ${product.oldPrice ? 'sale' : ''}`}>
          {product.oldPrice && <span className="old-price">{product.oldPrice}</span>}
          {product.price}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

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

  // Category data
  const categories = [
    { name: 'Furniture', image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80' },
    { name: 'Rugs', image: 'https://images.unsplash.com/photo-1600166898405-da9535204843?auto=format&fit=crop&w=800&q=80' },
    { name: 'Lighting', image: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=800&q=80' },
    { name: 'Decor', image: 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=800&q=80' },
    { name: 'Bed + Bath', image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80' },
    { name: 'Outdoor', image: 'https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=800&q=80' },
    { name: 'Walls', image: 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?auto=format&fit=crop&w=800&q=80' },
    { name: 'Pillows + Throws', image: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80' }
  ];

  // Trending products with multiple images
  const trendingProducts = [
    { 
      name: 'Clementina Velvet Sofa', 
      price: '$2,498', 
      images: [
        'https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=800&q=80'
      ],
      badge: 'New', 
      inStock: true, 
      shipping: 'Ships in 2-3 days',
      colors: ['#8b7355', '#4a5568', '#2d3748']
    },
    { 
      name: 'Marlowe Accent Chair', 
      price: '$898', 
      images: [
        'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80'
      ],
      inStock: true, 
      shipping: 'Ships in 1-2 days',
      colors: ['#d4a373', '#8b6855']
    },
    { 
      name: 'Artisan Ceramic Vase', 
      price: '$89', 
      oldPrice: '$128', 
      images: [
        'https://images.unsplash.com/photo-1532323544230-7191fd51bc1b?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80'
      ],
      badge: 'Sale', 
      inStock: true, 
      shipping: 'Ships today'
    },
    { 
      name: 'Nora Hand-Knotted Rug', 
      price: '$598 - $1,298', 
      images: [
        'https://images.unsplash.com/photo-1600166898405-da9535204843?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1600607687644-c7171b42498b?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80'
      ],
      inStock: true, 
      lowStock: 3, 
      shipping: 'Ships in 3-5 days',
      colors: ['#8b7355', '#d4a373', '#4a5568']
    },
    { 
      name: 'Modern Floor Lamp', 
      price: '$349', 
      images: [
        'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=800&q=80'
      ],
      badge: 'New', 
      inStock: true, 
      shipping: 'Ships in 2-3 days'
    },
    { 
      name: 'Minimalist Coffee Table', 
      price: '$1,299', 
      images: [
        'https://images.unsplash.com/photo-1611269154421-4e27233ac5c7?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1586627776848-7b0b95b8f596?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=800&q=80'
      ],
      inStock: true, 
      shipping: 'Ships in 1-2 days',
      colors: ['#2d3748', '#8b7355']
    },
    { 
      name: 'Linen Throw Pillow Set', 
      price: '$119', 
      oldPrice: '$159', 
      images: [
        'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1631679706772-7b02ac83db46?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=800&q=80'
      ],
      badge: 'Sale', 
      inStock: true, 
      shipping: 'Ships today'
    },
    { 
      name: 'Wooden Wall Mirror', 
      price: '$428', 
      images: [
        'https://images.unsplash.com/photo-1618220924273-338d82d6b886?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=800&q=80'
      ],
      inStock: true, 
      lowStock: 2, 
      shipping: 'Ships in 2-3 days'
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
    <main>
      {/* ANNOUNCEMENT BAR */}
      <div className="announcement-bar">
        New Arrivals Weekly | Quality Furniture at Great Prices
      </div>

      {/* HEADER */}
      <header className="site-header">
        <div className="header-container">
          <a href="/" className="logo">Furnivo</a>
          <div className="search-box">
            <input type="text" placeholder="Search for furniture, rugs, lighting..." />
            <button>Search</button>
          </div>
          <div className="header-actions">
            <a href="#" className="action-link">Account</a>
            <a href="#" className="action-link">Cart (0)</a>
          </div>
        </div>
        <nav className="main-nav">
          <div className="nav-container">
            <ul className="nav-list">
              <li className="nav-item"><a href="#" className="nav-link">New</a></li>
              <li className="nav-item"><a href="#" className="nav-link">Furniture</a></li>
              <li className="nav-item"><a href="#" className="nav-link">Rugs</a></li>
              <li className="nav-item"><a href="#" className="nav-link">Lighting</a></li>
              <li className="nav-item"><a href="#" className="nav-link">Décor + Tabletop</a></li>
              <li className="nav-item"><a href="#" className="nav-link">Walls</a></li>
              <li className="nav-item"><a href="#" className="nav-link">Pillows + Throws</a></li>
              <li className="nav-item"><a href="#" className="nav-link">Bed + Bath</a></li>
              <li className="nav-item"><a href="#" className="nav-link">Outdoor</a></li>
              <li className="nav-item"><a href="#" className="nav-link sale-link">Sale</a></li>
            </ul>
          </div>
        </nav>
      </header>

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
          
          {/* Hero Carousel Dots */}
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
          
          {/* Enhanced Trust Features Panel */}
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
          <div className="category-carousel-wrapper">
            <button className="carousel-arrow carousel-arrow-left" onClick={() => scrollCategories('left')} aria-label="Previous">‹</button>
            <div className="category-scroll" id="category-scroll">
              {categories.map((cat) => (
                <div className="cat-card" key={cat.name}>
                  <div className="cat-img-wrapper"><img src={cat.image} alt={cat.name} /></div>
                  <h3 className="cat-title">{cat.name}</h3>
                </div>
              ))}
            </div>
            <button className="carousel-arrow carousel-arrow-right" onClick={() => scrollCategories('right')} aria-label="Next">›</button>
          </div>
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

      {/* TRENDING */}
      <section className="product-section">
        <div className="container">
          <div className="section-header product-header">
            <div><h2 className="section-title">Trending Now</h2><p className="section-subtitle">Curated favorites that everyone's loving this season</p></div>
            <a href="#" className="section-link">View All</a>
          </div>
          <div className="product-carousel-wrapper">
            <button className="carousel-arrow carousel-arrow-left" onClick={() => scrollProducts('left')} aria-label="Previous">‹</button>
            <div className="products-scroll" id="products-scroll">
              {trendingProducts.map((product, index) => (
                <ProductCard key={index} product={product} index={index} />
              ))}
            </div>
            <button className="carousel-arrow carousel-arrow-right" onClick={() => scrollProducts('right')} aria-label="Next">›</button>
          </div>
        </div>
      </section>

      {/* BRAND STORY */}
      <section className="brand-story-section">
        <div className="container">
          <div className="brand-story-content">
            <div className="brand-story-text">
              <h2 className="brand-story-title">Curated for Your Home</h2>
              <p className="brand-story-para">We believe finding the perfect furniture shouldn't be complicated. That's why we've done the hard work for you—carefully selecting pieces from trusted suppliers and bringing them together in one convenient place.</p>
              <p className="brand-story-para">Whether you're furnishing your first apartment or redesigning your entire home, we're here to make quality furniture accessible and affordable. Browse our collection and discover pieces you'll love.</p>
              <div className="brand-values">
                <div className="brand-value"><strong>Thoughtfully Selected</strong><span>Every piece chosen for quality and design</span></div>
                <div className="brand-value"><strong>Trusted Sources</strong><span>Working with reliable manufacturers</span></div>
                <div className="brand-value"><strong>Great Value</strong><span>Quality furniture at fair prices</span></div>
              </div>
            </div>
            <div className="brand-story-image">
              <img src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80" alt="Interior" />
            </div>
          </div>
        </div>
      </section>

      {/* LIVE CHAT WIDGET */}
      <div className="chat-widget">
        <button className="chat-button" aria-label="Open chat"><span className="chat-icon">💬</span></button>
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

      {/* FOOTER */}
      <footer>
        <div className="footer-grid">
          <div className="footer-col newsletter">
            <h4>Join the Inner Circle</h4>
            <p style={{ marginBottom: '16px', fontSize: '13px', color: '#ccc' }}>Get 10% off your first order and exclusive design tips.</p>
            <div style={{ display: 'flex' }}>
              <input type="email" placeholder="Enter your email" />
              <button>SIGN UP</button>
            </div>
          </div>
          {['Shop', 'Support', 'About'].map((col) => (
            <div className="footer-col" key={col}>
              <h4>{col}</h4>
              <ul><li>Link One</li><li>Link Two</li><li>Link Three</li><li>Link Four</li></ul>
            </div>
          ))}
        </div>
        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <p>© 2025 Furnivo. All rights reserved.</p>
            
            <div className="footer-trust">
              <div className="payment-methods">
                <span className="payment-label">We Accept:</span>
                <span className="payment-icon">VISA</span>
                <span className="payment-icon">MC</span>
                <span className="payment-icon">AMEX</span>
                <span className="payment-icon">PAYPAL</span>
              </div>
              <div className="security-badges">
                <span className="security-badge">🔒 SSL Encrypted</span>
                <span className="security-badge">✓ Secure Checkout</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

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
    </main>
  );
}
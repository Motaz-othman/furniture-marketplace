import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer>
      <div className="footer-grid">
        {/* Newsletter Column */}
        <div className="footer-col newsletter">
          <h4>Join the Inner Circle</h4>
          <p style={{ marginBottom: '16px', fontSize: '13px', color: '#ccc' }}>
            Get 10% off your first order and exclusive design tips.
          </p>
          <div style={{ display: 'flex' }}>
            <input type="email" placeholder="Enter your email" />
            <button>SIGN UP</button>
          </div>
        </div>

        {/* Shop Column */}
        <div className="footer-col">
          <h4>Shop</h4>
          <ul>
            <li><Link href="/products?category=living-room">Living Room</Link></li>
            <li><Link href="/products?category=bedroom">Bedroom</Link></li>
            <li><Link href="/products?category=dining-room">Dining Room</Link></li>
            <li><Link href="/products?category=office">Office</Link></li>
          </ul>
        </div>

        {/* Support Column */}
        <div className="footer-col">
          <h4>Support</h4>
          <ul>
            <li><Link href="/contact">Contact Us</Link></li>
            <li><Link href="/shipping">Shipping</Link></li>
            <li><Link href="/returns">Returns</Link></li>
            <li><Link href="/faq">FAQ</Link></li>
          </ul>
        </div>

        {/* About Column */}
        <div className="footer-col">
          <h4>About</h4>
          <ul>
            <li><Link href="/about">Our Story</Link></li>
            <li><Link href="/vendors">Become a Vendor</Link></li>
            <li><Link href="/careers">Careers</Link></li>
            <li><Link href="/blog">Blog</Link></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <p>© {currentYear} Furnivo. All rights reserved.</p>
          
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
  );
}
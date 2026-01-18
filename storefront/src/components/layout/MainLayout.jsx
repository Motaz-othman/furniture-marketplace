import Header from './Header';
import Footer from './Footer';
import MobileBottomNav from './MobileBottomNav';

export default function MainLayout({ children, transparentHeader = false }) {
  return (
    <>
      {/* Top Features Bar - Above Everything */}
      <div className="top-features-bar">
        <div className="container">
          <div className="top-features">
            <div className="top-feature">
              <span className="top-feature-icon">✓</span>
              <span className="top-feature-text">Curated Selection</span>
            </div>
            <div className="top-feature">
              <span className="top-feature-icon">★</span>
              <span className="top-feature-text">Quality Verified</span>
            </div>
            <div className="top-feature">
              <span className="top-feature-icon">🔒</span>
              <span className="top-feature-text">Secure Payment</span>
            </div>
            <div className="top-feature">
              <span className="top-feature-icon">◆</span>
              <span className="top-feature-text">AR Preview</span>
            </div>
            <div className="top-feature">
              <span className="top-feature-icon">⚡</span>
              <span className="top-feature-text">Fast Delivery</span>
            </div>
          </div>
        </div>
      </div>

      <Header transparent={transparentHeader} />
      <main>{children}</main>
      <Footer />

      {/* Mobile Bottom Navigation - Shows only on mobile */}
      <MobileBottomNav />
    </>
  );
}
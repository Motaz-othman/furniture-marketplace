import Header from './Header';
import Footer from './Footer';
import MobileBottomNav from './MobileBottomNav';

export default function MainLayout({ children, transparentHeader = false }) {
  return (
    <>
      <Header transparent={transparentHeader} />
      <main>{children}</main>
      <Footer />
      
      {/* Mobile Bottom Navigation - Shows only on mobile */}
      <MobileBottomNav />
    </>
  );
}
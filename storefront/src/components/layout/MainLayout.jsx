import Header from './Header';
import Footer from './Footer';
import MobileBottomNav from './MobileBottomNav';
import EmailVerificationBanner from './EmailVerificationBanner';

export default function MainLayout({ children, transparentHeader = false }) {
  return (
    <>
      <EmailVerificationBanner />
      <Header transparent={transparentHeader} />
      <main>{children}</main>
      <Footer />
      <MobileBottomNav />
    </>
  );
}

import Header from './Header';
import Footer from './Footer';

export default function MainLayout({ children, transparentHeader = false }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header transparent={transparentHeader} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
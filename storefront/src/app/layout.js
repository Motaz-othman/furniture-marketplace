import { Inter, Cormorant } from 'next/font/google';
import './globals.css';

// Import organized CSS files
import '../styles/header.css';
import '../styles/hero.css';
import '../styles/categories.css';
import '../styles/products.css';
import '../styles/filters.css';
import '../styles/product-listing.css';
import '../styles/product-detail.css';
import '../styles/footer.css';
import '../styles/mobile.css';
import '../styles/category-page.css';
import '../styles/responsive.css';

import { QueryProvider } from '@/lib/hooks/QueryProvider';

// Load Inter font (Lulu & Georgia body style)
const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

// Load Cormorant font (Elegant headings)
const cormorant = Cormorant({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
});

export const metadata = {
  title: 'Furnivo - Quality Furniture Store',
  description: 'Discover carefully selected furniture for your home',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`}>
      <body className={inter.className}>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
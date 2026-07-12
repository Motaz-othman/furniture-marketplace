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
import '../styles/coming-soon.css';
import '../styles/auth.css';
import '../styles/account.css';
import '../styles/responsive.css';
import '../styles/cart.css';
import '../styles/checkout.css';

import { QueryProvider } from '@/lib/hooks/QueryProvider';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { WishlistProvider } from '@/context/WishlistContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Toaster } from 'react-hot-toast';

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://livipoint.com'),
  title: {
    default: 'LiviPoint - Quality Furniture Store',
    template: '%s | LiviPoint',
  },
  description: 'Discover carefully selected furniture for your home. Premium sofas, beds, dining sets, and more with free shipping on orders over $500.',
  keywords: ['furniture', 'home decor', 'sofas', 'beds', 'dining tables', 'living room', 'bedroom furniture'],
  authors: [{ name: 'LiviPoint' }],
  creator: 'LiviPoint',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://livipoint.com',
    siteName: 'LiviPoint',
    title: 'LiviPoint - Quality Furniture Store',
    description: 'Discover carefully selected furniture for your home. Premium sofas, beds, dining sets, and more.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'LiviPoint Furniture Store',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LiviPoint - Quality Furniture Store',
    description: 'Discover carefully selected furniture for your home.',
    images: ['/og-image.jpg'],
  },
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://livipoint.com';

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'LiviPoint',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description: 'Premium furniture store delivering quality sofas, beds, dining sets, and more to homes across Georgia.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`} data-scroll-behavior="smooth">
      <body className={inter.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <QueryProvider>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
                <Toaster
                  position="top-center"
                  toastOptions={{
                    duration: 3000,
                    style: { fontSize: '14px' },
                  }}
                  containerProps={{ 'aria-live': 'polite', 'aria-atomic': 'true', role: 'status' }}
                />
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
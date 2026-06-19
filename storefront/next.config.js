/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === 'production';
const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://furniture-marketplace-backend.onrender.com/api';
const backendOrigin = new URL(backendUrl).origin;

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' js.stripe.com",
  "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
  "font-src 'self' fonts.gstatic.com",
  "img-src 'self' data: blob: res.cloudinary.com images.unsplash.com *.s3.amazonaws.com *.s3.us-east-1.amazonaws.com *.stripe.com",
  `connect-src 'self' ${backendOrigin} api.stripe.com`,
  "frame-src js.stripe.com hooks.stripe.com *.youtube-nocookie.com player.vimeo.com",
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
].join('; ');

const nextConfig = {
  allowedDevOrigins: ['192.168.1.247'],
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['lucide-react', '@tanstack/react-query'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '*.s3.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '*.s3.us-east-1.amazonaws.com',
      },
      // Allow all HTTPS images in dev so vendor CDN URLs (not yet migrated to S3)
      // don't block testing. Production always requires explicit allowlist above.
      ...(!isProd ? [{ protocol: 'https', hostname: '**' }] : []),
    ],
  },
  async headers() {
    // Only apply security headers in production — CSP interferes with Next.js dev tools
    if (!isProd) return [];

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;

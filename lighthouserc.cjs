// Lighthouse CI config — run with: npm run lighthouse (from /storefront)
// Measures Core Web Vitals against a running server.
// Set LIGHTHOUSE_URL to override the target (default: http://localhost:3001).
//
// DEV-MODE BASELINE (2026-07-15, Next.js dev server):
//   Homepage:  perf=32  a11y=95  bp=100  seo=100  LCP=40s  CLS=0.209  TBT=1450ms
//   PDP:       perf=20  a11y=89  bp=100  seo=92   LCP=35s  CLS=0.361  TBT=2790ms
//
// Production scores will be significantly better (minified bundles, image cache).
// CLS on PDP was 0.361 — fixed by seeding React Query initialData from RSC so
// the client component skips the loading spinner on first render.
// Target thresholds below are for a production build.

const BASE = process.env.LIGHTHOUSE_URL || 'http://localhost:3001';

module.exports = {
  ci: {
    collect: {
      urls: [
        BASE + '/',
        BASE + '/products',
      ],
      numberOfRuns: 1,
      settings: {
        chromeFlags: '--headless --no-sandbox',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      },
    },
    assert: {
      // Thresholds for a production build — tighten as scores improve.
      assertions: {
        'categories:performance':      ['warn', { minScore: 0.6 }],
        'categories:accessibility':    ['error', { minScore: 0.9 }],
        'categories:best-practices':   ['error', { minScore: 0.9 }],
        'categories:seo':              ['error', { minScore: 0.9 }],
        'cumulative-layout-shift':     ['warn', { maxNumericValue: 0.1 }],
        'largest-contentful-paint':    ['warn', { maxNumericValue: 4000 }],
        'first-contentful-paint':      ['warn', { maxNumericValue: 2000 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};

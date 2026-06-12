const isDev = process.env.NODE_ENV === 'development';

// To add a real monitoring service (e.g. Sentry), replace the stubs below:
// import * as Sentry from '@sentry/nextjs';
// In the error handler: Sentry.captureException(args[0]);

export const logger = {
  // Always log errors — Vercel captures these in its log dashboard
  error: (...args) => {
    console.error(...args);
  },
  warn: (...args) => { if (isDev) console.warn(...args); },
  info: (...args) => { if (isDev) console.info(...args); },
};

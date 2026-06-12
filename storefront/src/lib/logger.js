const isDev = process.env.NODE_ENV === 'development';

// To add a real monitoring service (e.g. Sentry), replace the stubs below:
// import * as Sentry from '@sentry/nextjs';
// In the error handler: Sentry.captureException(args[0]);

export const logger = {
  // Dev: console.warn keeps errors visible without triggering the Next.js overlay
  // Prod: console.error is captured by Vercel's log dashboard
  error: (...args) => {
    if (isDev) {
      console.warn('[error]', ...args);
    } else {
      console.error(...args);
    }
  },
  warn: (...args) => { if (isDev) console.warn(...args); },
  info: (...args) => { if (isDev) console.info(...args); },
};

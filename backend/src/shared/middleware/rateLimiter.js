import rateLimit from 'express-rate-limit';

const isDevelopment = process.env.NODE_ENV !== 'production';

// General API rate limiter - Very lenient in development
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 10000 : 100, // 10000 in dev, 100 in production
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDevelopment, // Skip entirely in development
});

// Strict limiter for auth routes - Slightly more lenient in development
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 50 : 5, // 50 in dev, 5 in production
  message: 'Too many login attempts, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: () => isDevelopment, // Skip entirely in development
});

// Create/modify limiter - More lenient in development
export const createLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDevelopment ? 100 : 10, // 100 in dev, 10 in production
  message: 'Too many requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDevelopment, // Skip entirely in development
});
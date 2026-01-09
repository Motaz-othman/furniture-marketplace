/**
 * Classname Utility
 * Combines classnames with tailwind-merge for Tailwind CSS
 */

import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combine classnames and merge Tailwind classes
 * @param {...any} inputs - Class names to combine
 * @returns {string} Combined class string
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
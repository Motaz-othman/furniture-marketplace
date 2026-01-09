/**
 * Utility Functions
 * Common helper functions used throughout the app
 */

/**
 * Format price to currency string
 * @param {number} price - Price in cents or dollars
 * @param {string} currency - Currency symbol (default: $)
 * @returns {string} Formatted price (e.g., "$2,498")
 */
export function formatPrice(price, currency = '$') {
    if (typeof price !== 'number' || isNaN(price)) {
      return `${currency}0`;
    }
    
    // Format with commas
    const formatted = price.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    
    return `${currency}${formatted}`;
  }
  
  /**
   * Calculate discount percentage
   * @param {number} originalPrice - Original price
   * @param {number} salePrice - Sale price
   * @returns {number} Discount percentage
   */
  export function calculateDiscount(originalPrice, salePrice) {
    if (!originalPrice || !salePrice || originalPrice <= salePrice) {
      return 0;
    }
    
    const discount = ((originalPrice - salePrice) / originalPrice) * 100;
    return Math.round(discount);
  }
  
  /**
   * Format date to readable string
   * @param {string|Date} date - Date to format
   * @param {string} format - Format type ('short', 'long', 'relative')
   * @returns {string} Formatted date
   */
  export function formatDate(date, format = 'short') {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      return '';
    }
    
    if (format === 'short') {
      // Jan 15, 2024
      return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    
    if (format === 'long') {
      // January 15, 2024
      return dateObj.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
    
    if (format === 'relative') {
      // "2 days ago", "3 weeks ago"
      return getRelativeTime(dateObj);
    }
    
    return dateObj.toLocaleDateString();
  }
  
  /**
   * Get relative time string
   * @param {Date} date - Date to compare
   * @returns {string} Relative time (e.g., "2 days ago")
   */
  function getRelativeTime(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'just now';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
      return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
    }
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
      return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
    }
    
    const diffInYears = Math.floor(diffInMonths / 12);
    return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`;
  }
  
  /**
   * Generate slug from string
   * @param {string} str - String to convert
   * @returns {string} URL-friendly slug
   */
  export function generateSlug(str) {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces/underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }
  
  /**
   * Truncate text to specified length
   * @param {string} text - Text to truncate
   * @param {number} maxLength - Maximum length
   * @param {string} suffix - Suffix to add (default: "...")
   * @returns {string} Truncated text
   */
  export function truncateText(text, maxLength, suffix = '...') {
    if (!text || text.length <= maxLength) {
      return text;
    }
    
    return text.substring(0, maxLength).trim() + suffix;
  }
  
  /**
   * Check if product is in stock
   * @param {number} stockQuantity - Stock quantity
   * @param {number} threshold - Low stock threshold (default: 5)
   * @returns {Object} Stock status
   */
  export function getStockStatus(stockQuantity, threshold = 5) {
    if (stockQuantity === 0) {
      return {
        inStock: false,
        lowStock: false,
        status: 'out-of-stock',
        message: 'Out of Stock',
      };
    }
    
    if (stockQuantity <= threshold) {
      return {
        inStock: true,
        lowStock: true,
        status: 'low-stock',
        message: `Only ${stockQuantity} left!`,
      };
    }
    
    return {
      inStock: true,
      lowStock: false,
      status: 'in-stock',
      message: 'In Stock',
    };
  }
  
  /**
   * Calculate cart total
   * @param {Array} items - Cart items
   * @returns {Object} Totals
   */
  export function calculateCartTotal(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return {
        subtotal: 0,
        shipping: 0,
        tax: 0,
        total: 0,
      };
    }
    
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
    
    // Calculate shipping (free over $500)
    const shipping = subtotal >= 500 ? 0 : 50;
    
    // Calculate tax (8% for example)
    const tax = subtotal * 0.08;
    
    const total = subtotal + shipping + tax;
    
    return {
      subtotal,
      shipping,
      tax,
      total,
    };
  }
  
  /**
   * Format rating to stars
   * @param {number} rating - Rating value (0-5)
   * @returns {string} Star representation
   */
  export function formatRating(rating) {
    if (typeof rating !== 'number' || rating < 0 || rating > 5) {
      return '☆☆☆☆☆';
    }
    
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return '★'.repeat(fullStars) + 
           (hasHalfStar ? '½' : '') + 
           '☆'.repeat(emptyStars);
  }
  
  /**
   * Debounce function
   * @param {Function} func - Function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Debounced function
   */
  export function debounce(func, delay = 300) {
    let timeoutId;
    
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  }
  
  /**
   * Deep clone object
   * @param {*} obj - Object to clone
   * @returns {*} Cloned object
   */
  export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }
    
    if (obj instanceof Array) {
      return obj.map(item => deepClone(item));
    }
    
    if (obj instanceof Object) {
      const clonedObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
  }
  
  /**
   * Check if value is empty
   * @param {*} value - Value to check
   * @returns {boolean} True if empty
   */
  export function isEmpty(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }
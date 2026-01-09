/**
 * @typedef {Object} CartItem
 * @property {string} id
 * @property {string} productId
 * @property {import('./product').Product} product
 * @property {string} [variantId]
 * @property {import('./product').ProductVariant} [variant]
 * @property {number} quantity
 * @property {number} price
 */

/**
 * @typedef {Object} Cart
 * @property {string} id
 * @property {CartItem[]} items
 * @property {number} subtotal
 * @property {number} total
 */

export {};
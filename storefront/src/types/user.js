/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} email
 * @property {string} firstName
 * @property {string} lastName
 * @property {'CUSTOMER'|'VENDOR'|'ADMIN'} role
 * @property {string} [phone]
 * @property {string} createdAt
 */

/**
 * @typedef {Object} AuthResponse
 * @property {string} token
 * @property {User} user
 */

/**
 * @typedef {Object} Address
 * @property {string} id
 * @property {string} userId
 * @property {string} addressType
 * @property {string} streetAddress
 * @property {string} city
 * @property {string} state
 * @property {string} postalCode
 * @property {string} country
 * @property {boolean} isDefault
 */

export {};
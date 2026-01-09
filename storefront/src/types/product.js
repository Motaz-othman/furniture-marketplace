/**
 * @typedef {Object} Product
 * @property {string} id
 * @property {string} name
 * @property {string} slug
 * @property {string} description
 * @property {number} price
 * @property {number} [compareAtPrice]
 * @property {string} categoryId
 * @property {Category} [category]
 * @property {string} sku
 * @property {number} stockQuantity
 * @property {boolean} isFeatured
 * @property {boolean} isNew
 * @property {boolean} isOnSale
 * @property {string} status
 * @property {ProductImage[]} images
 * @property {ProductVariant[]} [variants]
 * @property {number} [rating]
 * @property {number} [totalReviews]
 */

/**
 * @typedef {Object} ProductImage
 * @property {string} id
 * @property {string} productId
 * @property {string} imageUrl
 * @property {string} [altText]
 * @property {number} displayOrder
 * @property {boolean} isPrimary
 */

/**
 * @typedef {Object} ProductVariant
 * @property {string} id
 * @property {string} productId
 * @property {string} variantName
 * @property {string} variantType
 * @property {number} priceAdjustment
 * @property {string} sku
 * @property {number} stockQuantity
 */

/**
 * @typedef {Object} Category
 * @property {string} id
 * @property {string} name
 * @property {string} slug
 * @property {string} [description]
 * @property {string} [imageUrl]
 * @property {number} displayOrder
 */

export {};
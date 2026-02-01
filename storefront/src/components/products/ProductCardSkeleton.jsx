'use client';

// Product Card Skeleton for loading states
export function ProductCardSkeleton() {
  return (
    <div className="product-card-skeleton">
      <div className="skeleton skeleton-image" />
      <div className="skeleton-content">
        <div className="skeleton skeleton-title" />
        <div className="skeleton-swatches">
          <div className="skeleton skeleton-swatch" />
          <div className="skeleton skeleton-swatch" />
          <div className="skeleton skeleton-swatch" />
        </div>
        <div className="skeleton skeleton-stock" />
        <div className="skeleton skeleton-price" />
      </div>
    </div>
  );
}

// Category Card Skeleton for loading states
export function CategoryCardSkeleton() {
  return (
    <div className="category-card-skeleton">
      <div className="skeleton skeleton-cat-image" />
      <div className="skeleton skeleton-cat-name" />
      <div className="skeleton skeleton-cat-count" />
    </div>
  );
}

// Products Grid Skeleton (multiple cards)
export function ProductsGridSkeleton({ count = 8 }) {
  return (
    <div className="products-grid-skeleton">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

// Subcategories Grid Skeleton
export function SubcategoriesGridSkeleton({ count = 5 }) {
  return (
    <div className="subcategories-grid-skeleton">
      {Array.from({ length: count }).map((_, index) => (
        <CategoryCardSkeleton key={index} />
      ))}
    </div>
  );
}

export default ProductCardSkeleton;

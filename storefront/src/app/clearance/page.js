'use client';

import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import ProductCard from '@/components/products/ProductCard';
import { ProductsGridSkeleton } from '@/components/products/ProductCardSkeleton';
import { useSaleProducts } from '@/lib/hooks';

export default function ClearancePage() {
  const { data, isLoading, error, refetch } = useSaleProducts();
  const products = data?.data || [];

  return (
    <MainLayout>
      <div className="products-page">
        <div className="products-container">
          <div className="products-header">
            <div className="products-header-left">
              <h1 className="products-title">Clearance</h1>
              <p className="products-subtitle">Discounted pieces — updated automatically</p>
            </div>
          </div>

          <main className="products-main-full">
            {isLoading ? (
              <ProductsGridSkeleton count={8} />
            ) : error ? (
              <div className="products-empty">
                <p>Unable to load clearance products</p>
                <button className="clear-filters-btn" onClick={() => refetch()}>
                  Try Again
                </button>
              </div>
            ) : products.length === 0 ? (
              <div className="products-empty">
                <p>No clearance items right now. Check back soon!</p>
                <Link href="/products" className="clear-filters-btn">
                  Browse All Products
                </Link>
              </div>
            ) : (
              <div className="products-grid">
                {products.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </MainLayout>
  );
}

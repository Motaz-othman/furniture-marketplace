import { ProductsGridSkeleton } from '@/components/products/ProductCardSkeleton';
import MainLayout from '@/components/layout/MainLayout';

export default function Loading() {
  return (
    <MainLayout>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ height: '32px', width: '200px', background: '#f0f0f0', borderRadius: '4px', marginBottom: '32px' }} />
        <ProductsGridSkeleton />
      </div>
    </MainLayout>
  );
}

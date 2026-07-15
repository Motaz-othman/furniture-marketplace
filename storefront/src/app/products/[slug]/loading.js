import MainLayout from '@/components/layout/MainLayout';

export default function ProductDetailLoading() {
  return (
    <MainLayout>
      <div className="product-detail-skeleton" aria-hidden="true" style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '24px',
      }}>
        {/* Breadcrumb */}
        <div style={{ height: '16px', width: '240px', background: 'var(--skeleton-color, #f0f0f0)', borderRadius: '4px', marginBottom: '32px' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px' }}>
          {/* Left: image gallery */}
          <div style={{ aspectRatio: '4/5', background: 'var(--skeleton-color, #f0f0f0)', borderRadius: '8px' }} />

          {/* Right: product info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ height: '32px', width: '80%', background: 'var(--skeleton-color, #f0f0f0)', borderRadius: '4px' }} />
            <div style={{ height: '28px', width: '140px', background: 'var(--skeleton-color, #f0f0f0)', borderRadius: '4px' }} />
            <div style={{ height: '16px', width: '100%', background: 'var(--skeleton-color, #f0f0f0)', borderRadius: '4px', marginTop: '16px' }} />
            <div style={{ height: '16px', width: '90%', background: 'var(--skeleton-color, #f0f0f0)', borderRadius: '4px' }} />
            <div style={{ height: '16px', width: '75%', background: 'var(--skeleton-color, #f0f0f0)', borderRadius: '4px' }} />
            <div style={{ height: '52px', width: '100%', background: 'var(--skeleton-color, #f0f0f0)', borderRadius: '8px', marginTop: '24px' }} />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

import MainLayout from '@/components/layout/MainLayout';

export default function Loading() {
  return (
    <MainLayout>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ height: '36px', width: '180px', background: '#f0f0f0', borderRadius: '4px', marginBottom: '32px' }} />
        <div style={{ display: 'flex', gap: '32px' }}>
          <div style={{ width: '200px', flexShrink: 0 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ height: '40px', background: '#f0f0f0', borderRadius: '6px', marginBottom: '8px' }} />
            ))}
          </div>
          <div style={{ flex: 1 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: '60px', background: '#f0f0f0', borderRadius: '6px', marginBottom: '16px' }} />
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

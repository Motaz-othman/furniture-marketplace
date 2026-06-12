import MainLayout from '@/components/layout/MainLayout';

export default function Loading() {
  return (
    <MainLayout>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px', display: 'grid', gridTemplateColumns: '1fr 380px', gap: '40px' }}>
        <div>
          <div style={{ height: '32px', width: '160px', background: '#f0f0f0', borderRadius: '4px', marginBottom: '32px' }} />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: '52px', background: '#f0f0f0', borderRadius: '6px', marginBottom: '16px' }} />
          ))}
        </div>
        <div style={{ background: '#fafafa', borderRadius: '8px', padding: '24px' }}>
          <div style={{ height: '24px', width: '140px', background: '#f0f0f0', borderRadius: '4px', marginBottom: '24px' }} />
          {[1, 2].map((i) => (
            <div key={i} style={{ height: '16px', background: '#f0f0f0', borderRadius: '4px', marginBottom: '12px' }} />
          ))}
        </div>
      </div>
    </MainLayout>
  );
}

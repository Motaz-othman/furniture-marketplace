import MainLayout from '@/components/layout/MainLayout';

export default function Loading() {
  return (
    <MainLayout>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ height: '36px', width: '120px', background: '#f0f0f0', borderRadius: '4px', marginBottom: '32px' }} />
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '20px 0', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ width: '80px', height: '80px', background: '#f0f0f0', borderRadius: '8px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: '18px', width: '60%', background: '#f0f0f0', borderRadius: '4px', marginBottom: '8px' }} />
              <div style={{ height: '14px', width: '30%', background: '#f0f0f0', borderRadius: '4px' }} />
            </div>
            <div style={{ height: '20px', width: '80px', background: '#f0f0f0', borderRadius: '4px' }} />
          </div>
        ))}
      </div>
    </MainLayout>
  );
}

import MainLayout from '@/components/layout/MainLayout';
import ComingSoon from '@/components/ui/ComingSoon';

export const metadata = {
  title: 'My Orders - LiviPoint',
  description: 'Track your orders',
};

export default function OrdersPage() {
  return (
    <MainLayout>
      <ComingSoon
        title="My Orders"
        icon="📦"
      />
    </MainLayout>
  );
}

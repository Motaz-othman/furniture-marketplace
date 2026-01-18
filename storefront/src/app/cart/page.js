import MainLayout from '@/components/layout/MainLayout';
import ComingSoon from '@/components/ui/ComingSoon';

export const metadata = {
  title: 'Shopping Cart - LiviPoint',
  description: 'Your shopping cart',
};

export default function CartPage() {
  return (
    <MainLayout>
      <ComingSoon
        title="Shopping Cart"
        icon="🛒"
      />
    </MainLayout>
  );
}

import MainLayout from '@/components/layout/MainLayout';
import ComingSoon from '@/components/ui/ComingSoon';

export const metadata = {
  title: 'Sale - LiviPoint',
  description: 'Special offers and discounts',
};

export default function SalePage() {
  return (
    <MainLayout>
      <ComingSoon
        title="Sale"
        icon="🔥"
      />
    </MainLayout>
  );
}

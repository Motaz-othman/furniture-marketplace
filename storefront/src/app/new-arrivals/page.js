import MainLayout from '@/components/layout/MainLayout';
import ComingSoon from '@/components/ui/ComingSoon';

export const metadata = {
  title: 'New Arrivals - LiviPoint',
  description: 'Discover our latest furniture',
};

export default function NewArrivalsPage() {
  return (
    <MainLayout>
      <ComingSoon
        title="New Arrivals"
        icon="✨"
      />
    </MainLayout>
  );
}

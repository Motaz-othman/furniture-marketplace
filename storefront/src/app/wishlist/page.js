import MainLayout from '@/components/layout/MainLayout';
import ComingSoon from '@/components/ui/ComingSoon';

export const metadata = {
  title: 'Wishlist - LiviPoint',
  description: 'Your saved items',
};

export default function WishlistPage() {
  return (
    <MainLayout>
      <ComingSoon
        title="Wishlist"
        icon="❤️"
      />
    </MainLayout>
  );
}

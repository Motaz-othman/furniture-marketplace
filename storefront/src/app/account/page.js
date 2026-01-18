import MainLayout from '@/components/layout/MainLayout';
import ComingSoon from '@/components/ui/ComingSoon';

export const metadata = {
  title: 'My Account - LiviPoint',
  description: 'Manage your account',
};

export default function AccountPage() {
  return (
    <MainLayout>
      <ComingSoon
        title="My Account"
        icon="👤"
      />
    </MainLayout>
  );
}

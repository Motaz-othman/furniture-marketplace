import MainLayout from '@/components/layout/MainLayout';
import ComingSoon from '@/components/ui/ComingSoon';

export const metadata = { title: 'Become a Vendor - LiviPoint' };

export default function VendorsPage() {
  return <MainLayout><ComingSoon title="Become a Vendor" icon="🤝" /></MainLayout>;
}

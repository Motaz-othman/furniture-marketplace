import MainLayout from '@/components/layout/MainLayout';
import ComingSoon from '@/components/ui/ComingSoon';

export const metadata = { title: 'Our Story - LiviPoint' };

export default function AboutPage() {
  return <MainLayout><ComingSoon title="Our Story" icon="🏡" /></MainLayout>;
}

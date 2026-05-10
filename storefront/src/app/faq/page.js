import MainLayout from '@/components/layout/MainLayout';
import ComingSoon from '@/components/ui/ComingSoon';

export const metadata = { title: 'FAQ - LiviPoint' };

export default function FaqPage() {
  return <MainLayout><ComingSoon title="Frequently Asked Questions" icon="❓" /></MainLayout>;
}

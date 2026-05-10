import MainLayout from '@/components/layout/MainLayout';
import ComingSoon from '@/components/ui/ComingSoon';

export const metadata = { title: 'Contact Us - LiviPoint' };

export default function ContactPage() {
  return <MainLayout><ComingSoon title="Contact Us" icon="📬" /></MainLayout>;
}

import MainLayout from '@/components/layout/MainLayout';
import ComingSoon from '@/components/ui/ComingSoon';

export const metadata = { title: 'Blog - LiviPoint' };

export default function BlogPage() {
  return <MainLayout><ComingSoon title="Blog" icon="✍️" /></MainLayout>;
}

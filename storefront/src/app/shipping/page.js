import MainLayout from '@/components/layout/MainLayout';
import ComingSoon from '@/components/ui/ComingSoon';

export const metadata = { title: 'Shipping - LiviPoint' };

export default function ShippingPage() {
  return <MainLayout><ComingSoon title="Shipping Information" icon="🚚" /></MainLayout>;
}

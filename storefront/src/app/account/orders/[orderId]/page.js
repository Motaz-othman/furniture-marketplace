import OrderDetailContent from './OrderDetailContent';

export const metadata = { title: 'Order Details' };

export default async function OrderDetailPage({ params }) {
  const { orderId } = await params;
  return <OrderDetailContent orderId={orderId} />;
}

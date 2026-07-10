import ReturnContent from './ReturnContent';

export const metadata = {
  title: 'Request Return',
};

export default async function ReturnPage({ params }) {
  const { orderId } = await params;
  return <ReturnContent orderId={orderId} />;
}

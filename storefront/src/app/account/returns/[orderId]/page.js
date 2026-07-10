import ReturnContent from './ReturnContent';

export const metadata = {
  title: 'Request Return',
};

export default function ReturnPage({ params }) {
  return <ReturnContent orderId={params.orderId} />;
}

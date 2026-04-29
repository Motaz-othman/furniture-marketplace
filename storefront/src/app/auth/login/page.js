import { Suspense } from 'react';
import LoginContent from './LoginContent';

export const metadata = {
  title: 'Sign In',
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

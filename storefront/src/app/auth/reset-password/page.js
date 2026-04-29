import { Suspense } from 'react';
import ResetPasswordContent from './ResetPasswordContent';

export const metadata = {
  title: 'Reset Password',
};

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}

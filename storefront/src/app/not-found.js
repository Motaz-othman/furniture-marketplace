import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';

export default function NotFound() {
  return (
    <MainLayout>
      <div className="coming-soon-container">
        <div className="coming-soon-content">
          <Link href="/" className="coming-soon-logo">
            LiviPoint
          </Link>
          <span className="coming-soon-badge">Coming Soon</span>
          <span className="coming-soon-icon">🔍</span>
          <h1 className="coming-soon-title">Page Not Found</h1>
          <p className="coming-soon-text">
            The page you're looking for doesn't exist or is still under construction.
          </p>
          <Link href="/" className="coming-soon-btn">
            Back to Home
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}

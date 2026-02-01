'use client';

import Link from 'next/link';
import { ArrowLeft } from '@/components/ui/Icons';

export default function ComingSoon({ title, icon }) {
  return (
    <div className="coming-soon-container">
      <div className="coming-soon-content">
        {icon && <span className="coming-soon-icon">{icon}</span>}
        <h1 className="coming-soon-title">{title}</h1>
        <p className="coming-soon-text">
          We're working hard to bring you this feature. Stay tuned!
        </p>
        <Link href="/" className="coming-soon-btn">
          <ArrowLeft size={18} />
          <span>Back to Home</span>
        </Link>
      </div>
    </div>
  );
}

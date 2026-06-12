'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSettings } from '@/lib/api/settings';
import { logger } from '@/lib/logger';

export default function AnnouncementBar() {
  const [bar, setBar] = useState(null);

  useEffect(() => {
    getSettings()
      .then(s => { if (s?.announcementBar) setBar(s.announcementBar); })
      .catch(err => logger.error('Settings fetch failed:', err));
  }, []);

  if (!bar?.enabled || !bar?.items?.length) return null;

  return (
    <div className="bg-taupe text-white text-center py-2 px-4 text-sm">
      {bar.items.map((item, i) => (
        <span key={i}>
          {i > 0 && <span className="mx-2">|</span>}
          {item.link ? (
            <Link href={item.link} className="underline cursor-pointer hover:opacity-80">
              {item.text}
            </Link>
          ) : (
            <span>{item.text}</span>
          )}
        </span>
      ))}
    </div>
  );
}

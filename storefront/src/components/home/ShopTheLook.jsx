'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export default function ShopTheLook() {
  const [activeHotspot, setActiveHotspot] = useState(null);

  const hotspots = [
    {
      id: 1,
      top: '35%',
      left: '50%',
      product: {
        name: 'The Arbor Table',
        price: '$1,895',
        link: '/products/arbor-table',
      },
    },
    {
      id: 2,
      top: '55%',
      left: '30%',
      product: {
        name: 'Wishbone Chair',
        price: '$425',
        link: '/products/wishbone-chair',
      },
    },
    {
      id: 3,
      top: '20%',
      left: '48%',
      product: {
        name: 'Rattan Pendant',
        price: '$320',
        link: '/products/rattan-pendant',
      },
    },
  ];

  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-serif text-4xl md:text-5xl text-center mb-12">
          Shop The Look
        </h2>

        <div className="relative rounded-md overflow-hidden">
          <Image
            src="/images/shop-the-look.jpg"
            alt="Dining Room"
            width={1400}
            height={800}
            className="w-full h-auto object-cover"
          />

          {/* Hotspots */}
          {hotspots.map((hotspot) => (
            <div key={hotspot.id}>
              {/* Hotspot Button */}
              <button
                className="absolute w-8 h-8 bg-white rounded-full shadow-card flex items-center justify-center cursor-pointer animate-pulse hover:scale-110 transition"
                style={{ top: hotspot.top, left: hotspot.left }}
                onClick={() =>
                  setActiveHotspot(activeHotspot === hotspot.id ? null : hotspot.id)
                }
              >
                <span className="w-3 h-3 bg-accent rounded-full" />
              </button>

              {/* Tooltip */}
              {activeHotspot === hotspot.id && (
                <div
                  className="absolute bg-white rounded-md shadow-card p-4 flex items-center gap-4 min-w-[240px] z-10"
                  style={{
                    top: `calc(${hotspot.top} + 40px)`,
                    left: hotspot.left,
                    transform: 'translateX(-50%)',
                  }}
                >
                  <div className="w-16 h-16 bg-beige rounded-md" />
                  <div className="flex-1">
                    <p className="font-semibold">{hotspot.product.name}</p>
                    <p className="text-muted">{hotspot.product.price}</p>
                  </div>
                  <Link
                    href={hotspot.product.link}
                    className="text-accent hover:text-accent-hover transition"
                  >
                    <ChevronRight size={20} />
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
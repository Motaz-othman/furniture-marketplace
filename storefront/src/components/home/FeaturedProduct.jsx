'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { RotateCcw, Star, ChevronRight } from 'lucide-react';

import { Leaf, Truck, Shield, CalendarCheck } from 'lucide-react';

export default function FeaturedProduct() {
  const [selectedColor, setSelectedColor] = useState('oatmeal');

  const colors = [
    { id: 'oatmeal', name: 'Oatmeal Linen', hex: '#D9D0C1' },
    { id: 'terracotta', name: 'Terracotta', hex: '#A86A4D' },
    { id: 'sage', name: 'Sage', hex: '#7A8270' },
    { id: 'charcoal', name: 'Charcoal', hex: '#4A4A4A' },
  ];

  return (
    <section className="py-16 bg-beige">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Top Features */}
        <div className="hidden lg:flex justify-center gap-12 mb-12 text-xs text-muted">
          <div className="flex items-center gap-2">
            <Leaf size={16} />
            <span>Sustainably Sourced Materials</span>
          </div>
          <div className="flex items-center gap-2">
            <Truck size={16} />
            <span>Fast, Easy Delivery Setup Available</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield size={16} />
            <span>10-Year Craftsmanship Warranty</span>
          </div>
          <div className="flex items-center gap-2">
            <CalendarCheck size={16} />
            <span>100-Day In-Home Trial</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Image */}
          <div className="relative">
            <div className="relative aspect-square rounded-lg overflow-hidden bg-white shadow-card">
              <Image
                src="/images/featured-sofa.jpg"
                alt="Jasper Modular Sofa"
                fill
                className="object-cover"
              />
              
              {/* 360 Button */}
              <button className="absolute top-4 right-4 bg-white/95 backdrop-blur px-4 py-2 rounded-full flex items-center gap-2 text-xs font-medium text-charcoal shadow-card hover:bg-white transition">
                <RotateCcw size={14} />
                360°
              </button>
            </div>
          </div>

          {/* Content */}
          <div>
            <p className="text-xs text-muted uppercase tracking-wider mb-2">The Jasper Modular Sofa</p>
            
            <h2 className="font-serif text-3xl md:text-4xl mb-4">
              Meet the Jasper<br />Modular Sofa
            </h2>

            <p className="text-sm text-muted mb-6 leading-relaxed">
              The Jasper Modular Sofa combines timeless design with unparalleled flexibility. Its premium, reversible 
              cushions, performance fabric upholstery, and modular 
              sections allow you to create a sofa that fits your space, 
              your style, and your life perfectly.
            </p>

            {/* Price */}
            <p className="text-xl font-medium mb-6">$95.00</p>

            {/* Color Selector */}
            <div className="mb-8">
              <p className="text-xs text-muted mb-3">
                Color: {colors.find(c => c.id === selectedColor)?.name}
              </p>
              <div className="flex gap-3">
                {colors.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => setSelectedColor(color.id)}
                    className={`w-8 h-8 rounded-full transition ${
                      selectedColor === color.id
                        ? 'ring-2 ring-charcoal ring-offset-2'
                        : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: color.hex }}
                  />
                ))}
              </div>
            </div>

            {/* CTA */}
            <Link
              href="/products/jasper-sofa"
              className="inline-flex items-center gap-2 bg-header-dark hover:bg-olive/90 text-white px-6 py-3 rounded text-sm font-medium transition"
            >
              Customize Your Order
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
import { Leaf, Truck, Shield, CalendarCheck } from 'lucide-react';

export default function TrustTicker() {
  const items = [
    { icon: Leaf, label: 'Sustainably Sourced', sublabel: 'Materials' },
    { icon: Truck, label: 'Flat-Rate White', sublabel: 'Glove Delivery' },
    { icon: Shield, label: '10-Year Craftsmanship', sublabel: 'Warranty' },
    { icon: CalendarCheck, label: '100-Day', sublabel: 'In-Home Trial' },
  ];

  return (
    <section className="bg-cream py-5 border-b border-border-light">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between overflow-x-auto gap-4">
          {/* Trust Badge */}
          <div className="flex-shrink-0 flex items-center gap-2 px-4 py-1.5 border border-charcoal/30 rounded-full">
            <span className="text-xs font-semibold text-charcoal tracking-wide">Trust Ticker</span>
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px h-8 bg-border-light" />

          {/* Items */}
          <div className="flex items-center gap-8 lg:gap-12">
            {items.map((item, index) => (
              <div key={index} className="flex items-center gap-2.5 flex-shrink-0">
                <item.icon size={18} strokeWidth={1.5} className="text-charcoal" />
                <div className="text-xs text-charcoal">
                  <span className="font-medium">{item.label}</span>
                  <br />
                  <span className="text-muted">{item.sublabel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
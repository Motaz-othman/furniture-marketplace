import Link from 'next/link';
import Image from 'next/image';

export default function Hero() {
  return (
    <section className="relative h-[85vh] min-h-[600px] max-h-[900px] pt-[88px]">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/images/hero.jpg"
          alt="Living Room"
          fill
          className="object-cover"
          priority
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/30 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative h-full flex items-center">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full">
          <div className="max-w-xl text-white">
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl mb-6 leading-[1.1]">
              The Art of<br />Staying In
            </h1>
            <p className="text-base md:text-lg mb-10 opacity-90 leading-relaxed max-w-md">
              Discover our new Autumn collection—handcrafted pieces designed for comfort and built to last.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/products"
                className="bg-accent hover:bg-accent-hover text-white px-7 py-3.5 rounded text-sm font-medium transition"
              >
                Shop the New Collection
              </Link>
              <Link
                href="/lookbook"
                className="bg-transparent border border-white text-white px-7 py-3.5 rounded text-sm font-medium hover:bg-white hover:text-charcoal transition"
              >
                Explore the Lookbook
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
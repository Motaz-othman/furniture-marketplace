import Image from 'next/image';
import Link from 'next/link';

export default function Categories() {
  const categories = [
    {
      id: 'living',
      title: 'The Living Room',
      image: '/images/hero.jpg',
      link: '/products?room=living',
    },
    {
      id: 'dining',
      title: 'The Dining Hall',
      image: '/images/shop-the-look.jpg',
      link: '/products?room=dining',
    },
    {
      id: 'bedroom',
      title: 'The Sanctuary',
      subtitle: '(Bedroom)',
      image: '/images/featured-sofa.jpg',
      link: '/products?room=bedroom',
    },
    {
      id: 'office',
      title: 'The Home Office',
      image: '/images/texture.jpg',
      link: '/products?room=office',
    },
  ];

  return (
    <section className="py-16 bg-cream">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <h2 className="font-serif text-3xl md:text-4xl text-center mb-12">
          Define Your Space
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={category.link}
              className="group relative aspect-[3/4] rounded-lg overflow-hidden"
            >
              <Image
                src={category.image}
                alt={category.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Title */}
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <h3 className="font-serif text-lg leading-tight">
                  {category.title}
                </h3>
                {category.subtitle && (
                  <span className="text-sm opacity-80">{category.subtitle}</span>
                )}
              </div>

              {/* View Collection Button */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                <span className="bg-white/95 text-charcoal px-4 py-2 rounded text-xs font-medium shadow-card">
                  View Collection
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
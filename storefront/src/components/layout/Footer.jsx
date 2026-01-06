import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-taupe text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <h3 className="font-serif text-2xl font-semibold mb-4">Furnivo</h3>
            <p className="text-white/70 text-sm leading-relaxed">
              Handcrafted furniture designed for comfort and built to last.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h4 className="font-semibold mb-4">Shop</h4>
            <ul className="space-y-3 text-sm text-white/70">
              <li>
                <Link href="/products?room=living-room" className="hover:text-white transition">
                  Living Room
                </Link>
              </li>
              <li>
                <Link href="/products?room=bedroom" className="hover:text-white transition">
                  Bedroom
                </Link>
              </li>
              <li>
                <Link href="/products?room=dining" className="hover:text-white transition">
                  Dining
                </Link>
              </li>
              <li>
                <Link href="/products?room=office" className="hover:text-white transition">
                  Office
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-3 text-sm text-white/70">
              <li>
                <Link href="/contact" className="hover:text-white transition">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white transition">
                  FAQs
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="hover:text-white transition">
                  Shipping Info
                </Link>
              </li>
              <li>
                <Link href="/returns" className="hover:text-white transition">
                  Returns
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-semibold mb-4">Stay Updated</h4>
            <p className="text-sm text-white/70 mb-4">
              Subscribe for exclusive offers and design inspiration.
            </p>
            <form className="flex gap-2">
              <input
                type="email"
                placeholder="Your email"
                className="flex-1 px-4 py-2 rounded-md bg-white/10 border border-white/20 text-white placeholder:text-white/50 text-sm focus:outline-none focus:border-white/40"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-md text-sm font-medium transition"
              >
                Join
              </button>
            </form>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-white/50">
            © {new Date().getFullYear()} Furnivo. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-white/50">
            <Link href="/privacy" className="hover:text-white transition">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white transition">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
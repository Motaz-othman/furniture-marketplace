export default function Newsletter() {
    return (
      <section className="py-12 bg-header-dark">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-white">
              <h3 className="font-serif text-2xl mb-1">Join the Inner Circle</h3>
              <p className="text-sm text-white/70">
                Get 15% off your first order + exclusive design tips delivered weekly.
              </p>
            </div>
            
            <form className="flex w-full md:w-auto gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 md:w-72 px-4 py-3 rounded bg-white/10 border border-white/20 text-white placeholder:text-white/50 text-sm focus:outline-none focus:border-white/50"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded text-sm font-medium transition"
              >
                Sign Up Now
              </button>
            </form>
          </div>
        </div>
      </section>
    );
  }
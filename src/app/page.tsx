import StationSearch from '@/components/StationSearch';
import TrainSearch from '@/components/TrainSearch';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Rail<span className="text-blue-600">Info</span>
            </span>
          </div>
          <nav className="flex items-center gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            <a href="#" className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100">
              Search
            </a>
            <a href="#" className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100">
              Live Map
            </a>
            <a href="#" className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100">
              Routes
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex flex-1 flex-col">
        <section className="relative overflow-hidden py-16 sm:py-24">
          {/* Background decoration */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-1/4 -top-1/4 h-96 w-96 rounded-full bg-blue-400/10 blur-3xl" />
            <div className="absolute -bottom-1/4 -right-1/4 h-96 w-96 rounded-full bg-orange-400/10 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl dark:text-zinc-100">
                Track Indian Railways
                <span className="mt-2 block bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
                  in Real Time
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
                Search stations, find trains, check live running status, and discover routes between any two stations across India&apos;s vast railway network.
              </p>
            </div>

            {/* Search Cards */}
            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              {/* Station Search Card */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-zinc-900/50">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40">
                    <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      Find Stations
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Search by name or station code
                    </p>
                  </div>
                </div>
                <StationSearch 
                  label="Station" 
                  placeholder="e.g. New Delhi, NDLS, Mumbai..."
                />
              </div>

              {/* Train Search Card */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-zinc-900/50">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/40">
                    <svg className="h-6 w-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      Find Trains
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Search by train number or name
                    </p>
                  </div>
                </div>
                <TrainSearch 
                  label="Train" 
                  placeholder="e.g. 12301, Rajdhani, Shatabdi..."
                />
              </div>
            </div>

            {/* Trains Between Stations Card */}
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-zinc-900/50">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-orange-100 dark:from-blue-900/40 dark:to-orange-900/40">
                  <svg className="h-6 w-6 text-zinc-700 dark:text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Trains Between Stations
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Find all trains running between two stations
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <StationSearch 
                  label="From Station" 
                  placeholder="Origin station..."
                />
                <StationSearch 
                  label="To Station" 
                  placeholder="Destination station..."
                />
              </div>
              <button
                type="button"
                className="mt-4 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
              >
                Search Trains
              </button>
            </div>

            {/* Stats Section */}
            <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: 'Stations', value: '10,000+', icon: '🚉' },
                { label: 'Trains', value: '15,000+', icon: '🚂' },
                { label: 'Routes', value: '65,000+', icon: '🛤️' },
                { label: 'Daily Updates', value: '24/7', icon: '⏱️' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-zinc-200 bg-white/50 px-4 py-5 text-center backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/50"
                >
                  <div className="text-2xl">{stat.icon}</div>
                  <div className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {stat.value}
                  </div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-8 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-5xl px-4 text-center text-sm text-zinc-500 dark:text-zinc-400 sm:px-6">
          <p>
            Built with Next.js • Data from Indian Railways •{' '}
            <a href="#" className="font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100">
              View on GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

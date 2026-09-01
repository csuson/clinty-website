import { Link } from 'react-router-dom'
import HeroStatsCharts from './HeroStatsCharts'

export default function Hero() {
  return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-teal-400/10 text-teal-500 border border-teal-400/20 rounded-full px-4 py-1.5 text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            AI agents built for small business
          </div>

          <h1 className="font-serif text-5xl md:text-7xl leading-[1.1] text-navy-900 mb-6">
            Clinty AI helps small businesses reach their{' '}
            <em className="text-teal-500 not-italic">full potential</em>.
          </h1>

          <p className="text-lg md:text-xl text-navy-600 leading-relaxed mb-10 max-w-2xl">
            Dedicated AI agents manage email, calendars, WhatsApp, and paid advertising — while
            delivering appointment booking, product discovery, and customer support across the
            channels your customers already use.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-16">
            <Link
              to="/sign-up"
              className="inline-flex items-center justify-center gap-2 bg-navy-900 text-cream font-medium px-6 py-3.5 rounded-xl hover:bg-navy-800 transition-colors"
            >
              Start Free Trial
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 border border-navy-900/15 text-navy-900 font-medium px-6 py-3.5 rounded-xl hover:bg-navy-900/5 transition-colors"
            >
              See How It Works
            </a>
          </div>
        </div>

        <HeroStatsCharts />
      </div>
    </section>
  )
}

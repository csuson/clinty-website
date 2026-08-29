import { Link } from 'react-router-dom'

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
            Email, WhatsApp, inventory, scheduling, and your calendar —{' '}
            <em className="text-teal-500 not-italic">handled for you</em>.
          </h1>

          <p className="text-lg md:text-xl text-navy-600 leading-relaxed mb-10 max-w-2xl">
            Clinty’s AI agent replies on email and WhatsApp, checks live inventory, books
            appointments, and manages your calendar — so you can focus on the work that actually
            matters.
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {[
            { value: '15+ hrs', label: 'saved per week', sub: 'on messaging & scheduling' },
            { value: '$28K', label: 'avg. annual savings', sub: 'for a 5-person team' },
            { value: '< 2 min', label: 'response time', sub: 'email, WhatsApp & inventory' },
            { value: '94%', label: 'scheduling accuracy', sub: 'zero double-bookings' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-2xl p-5 md:p-6 border border-navy-900/5 shadow-sm"
            >
              <div className="text-2xl md:text-3xl font-bold text-navy-900 mb-1">{stat.value}</div>
              <div className="text-sm font-medium text-navy-900">{stat.label}</div>
              <div className="text-xs text-navy-600 mt-1">{stat.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

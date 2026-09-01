const testimonials = [
  {
    quote:
      'I was spending 2 hours every morning just on emails. Clinty cut that to 10 minutes. I actually have time to see clients now.',
    name: 'Sarah Mitchell',
    role: 'Owner, Mitchell Dental',
    savings: '$32K saved/year',
  },
  {
    quote:
      'We went from missing 3-4 appointments a week to zero no-shows. The automatic reminders and easy rescheduling changed everything.',
    name: 'James Park',
    role: 'Founder, Park Legal Group',
    savings: '18 hrs saved/week',
  },
  {
    quote:
      'The ROI was obvious within the first month. We\'re a 4-person salon and Clinty pays for itself 15 times over.',
    name: 'Elena Rodriguez',
    role: 'Owner, Bloom Salon & Spa',
    savings: '940% ROI',
  },
]

export default function Stats() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-serif text-4xl md:text-5xl text-navy-900 mb-4">
            Trusted by <em className="text-teal-500 not-italic">500+</em> small businesses
          </h2>
          <p className="text-navy-600 text-lg">
            From dental offices to law firms to salons — business owners are reclaiming
            their time with Clinty.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl border border-navy-900/5 p-8 flex flex-col"
            >
              <div className="text-navy-600 leading-relaxed mb-6 flex-1">
                &ldquo;{t.quote}&rdquo;
              </div>
              <div>
                <div className="font-semibold text-navy-900">{t.name}</div>
                <div className="text-sm text-navy-600">{t.role}</div>
                <div className="text-xs font-semibold text-teal-500 mt-2">{t.savings}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: '2.1M+', label: 'Emails handled' },
            { value: '340K+', label: 'Appointments booked' },
            { value: '3', label: 'Ad platforms supported' },
            { value: '99.7%', label: 'Uptime' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-bold text-navy-900">{stat.value}</div>
              <div className="text-sm text-navy-600 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

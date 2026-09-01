const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
    title: 'Multi-Platform Ad Campaigns',
    description:
      'Draft Google Ads, Meta, and Yelp campaigns from one brief. Set your monthly budget, split spend across channels, review AI-generated copy, and publish paused campaigns when you approve.',
    savings: 'Google, Meta & Yelp',
    color: 'teal',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Smart Email Responses',
    description:
      'Your AI agent reads, understands, and replies to customer emails in your brand voice — handling inquiries, follow-ups, and FAQs without you lifting a finger.',
    savings: 'Saves ~8 hrs/week',
    color: 'teal',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Automated Scheduling',
    description:
      'Customers book appointments directly via email conversations. The agent checks your calendar, proposes times, confirms bookings, and sends reminders.',
    savings: 'Saves ~5 hrs/week',
    color: 'amber',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Calendar Management',
    description:
      'Reschedules, cancellations, and buffer times are handled automatically. Syncs with Google Calendar, Outlook, and Apple Calendar in real time.',
    savings: 'Saves ~3 hrs/week',
    color: 'teal',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    title: 'Online Inventory Lookup',
    description:
      'Customers ask what’s in stock and your agent checks live inventory from Shopify, Square, and more — then replies with availability, sizes, and pricing instantly.',
    savings: 'Fewer “do you have this?” emails',
    color: 'teal',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    title: 'Integrated WhatsApp Messaging',
    description:
      'Meet customers where they already are. Clinty reads and replies on WhatsApp with the same business context, tone, and booking rules as your email agent.',
    savings: 'One agent, every channel',
    color: 'amber',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    title: 'Customer Follow-ups',
    description:
      'Never let a lead go cold. The agent sends personalized follow-ups, collects feedback after appointments, and nurtures relationships on autopilot.',
    savings: 'Recovers ~12% more leads',
    color: 'amber',
  },
]

const colorMap = {
  teal: {
    bg: 'bg-teal-400/10',
    text: 'text-teal-500',
    border: 'border-teal-400/20',
  },
  amber: {
    bg: 'bg-amber-400/10',
    text: 'text-amber-500',
    border: 'border-amber-400/20',
  },
}

export default function Features() {
  return (
    <section id="features" className="py-24 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-serif text-4xl md:text-5xl text-navy-900 mb-4">
            Communication, operations, and{' '}
            <em className="text-teal-500 not-italic">paid media</em>
          </h2>
          <p className="text-navy-600 text-lg">
            From inbox replies to multi-platform ad campaigns — Clinty keeps every channel
            on-brand and on schedule without extra tools or headcount.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature) => {
            const colors = colorMap[feature.color as keyof typeof colorMap]
            return (
              <div
                key={feature.title}
                className="group rounded-2xl border border-navy-900/5 p-8 hover:border-navy-900/10 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className={`${colors.bg} ${colors.text} p-3 rounded-xl shrink-0`}>
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-navy-900 mb-2">{feature.title}</h3>
                    <p className="text-navy-600 leading-relaxed mb-4">{feature.description}</p>
                    <span
                      className={`inline-block text-xs font-semibold ${colors.text} ${colors.bg} ${colors.border} border rounded-full px-3 py-1`}
                    >
                      {feature.savings}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

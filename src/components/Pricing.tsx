import { Link } from 'react-router-dom'

const plans = [
  {
    name: 'Starter',
    price: 29,
    description: 'Perfect for solopreneurs and 1-2 person teams.',
    features: [
      '1 AI agent',
      'Up to 50 emails/day',
      'Campaign drafts (Google, Meta, Yelp)',
      'Calendar sync (1 calendar)',
      'Appointment scheduling',
      'Email in your brand voice',
      'Basic analytics',
    ],
    cta: 'Start 30-Day Free Trial',
    popular: false,
  },
  {
    name: 'Growth',
    price: 59,
    description: 'For growing teams that need more capacity.',
    features: [
      '3 AI agents',
      'Unlimited emails',
      'Multi-platform ad publish (paused)',
      'Multi-calendar sync',
      'Smart follow-ups',
      'Custom booking rules',
      'Priority support',
      'Advanced ROI dashboard',
    ],
    cta: 'Start 30-Day Free Trial',
    popular: true,
  },
  {
    name: 'Business',
    price: 99,
    description: 'Full power for established small businesses.',
    features: [
      'Unlimited AI agents',
      'Unlimited emails',
      'Full ad campaign management',
      'Team calendar management',
      'CRM integrations',
      'Custom workflows',
      'Dedicated account manager',
      'SLA guarantee',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
]

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-teal-400/10 text-teal-600 border border-teal-400/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            30-day free trial on every plan
          </div>
          <h2 className="font-serif text-4xl md:text-5xl text-navy-900 mb-4">
            Pays for itself in <em className="text-amber-500 not-italic">week one</em>
          </h2>
          <p className="text-navy-600 text-lg">
            Try Clinty free for 30 days. No credit card required. Cancel anytime
            before your trial ends.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-8 flex flex-col ${
                plan.popular
                  ? 'bg-navy-900 text-cream ring-2 ring-teal-400 relative'
                  : 'bg-white border border-navy-900/5'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-400 text-navy-900 text-xs font-bold px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              <h3 className="text-xl font-semibold mb-1">{plan.name}</h3>
              <p className={`text-sm mb-6 ${plan.popular ? 'text-cream/60' : 'text-navy-600'}`}>
                {plan.description}
              </p>
              <div className="mb-6">
                <div
                  className={`text-xs font-semibold mb-2 ${
                    plan.popular ? 'text-teal-400' : 'text-teal-500'
                  }`}
                >
                  Free for 30 days
                </div>
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className={`text-sm ${plan.popular ? 'text-cream/60' : 'text-navy-600'}`}>
                  /month after trial
                </span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <svg
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        plan.popular ? 'text-teal-400' : 'text-teal-500'
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className={plan.popular ? 'text-cream/80' : 'text-navy-600'}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                to="/sign-up"
                className={`block text-center font-medium px-6 py-3 rounded-xl transition-colors ${
                  plan.popular
                    ? 'bg-teal-400 text-navy-900 hover:bg-teal-300'
                    : 'bg-navy-900 text-cream hover:bg-navy-800'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

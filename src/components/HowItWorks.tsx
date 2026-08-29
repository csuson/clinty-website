const steps = [
  {
    number: '01',
    title: 'Connect your tools',
    description:
      'Link your email, WhatsApp, inventory, and calendar in under 5 minutes. Clinty integrates with Gmail, Shopify, Square, and more.',
    time: '5 min setup',
  },
  {
    number: '02',
    title: 'Train your agent',
    description:
      'Tell Clinty about your business — services, tone of voice, booking rules, and availability. The agent learns your preferences instantly.',
    time: '10 min onboarding',
  },
  {
    number: '03',
    title: 'Let it run',
    description:
      'Your AI agent starts handling emails and scheduling appointments immediately. Review its work anytime, or let it run fully autonomous.',
    time: 'Saves 15+ hrs/week',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6 bg-navy-900 text-cream">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-serif text-4xl md:text-5xl mb-4">
            Live in <em className="text-teal-400 not-italic">15 minutes</em>
          </h2>
          <p className="text-cream/60 text-lg">
            No engineers required. No complex integrations. Just connect, configure, and go.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={step.number} className="relative">
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[calc(100%+1rem)] w-[calc(100%-2rem)] h-px bg-cream/10" />
              )}
              <div className="text-teal-400 font-mono text-sm mb-4">{step.number}</div>
              <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
              <p className="text-cream/60 leading-relaxed mb-4">{step.description}</p>
              <span className="inline-block text-xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-3 py-1">
                {step.time}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-navy-800 rounded-2xl p-8 md:p-12 border border-cream/5">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-semibold mb-4">Before vs. After Clinty</h3>
              <p className="text-cream/60 leading-relaxed">
                See the difference automation makes for a typical small business owner
                handling 25 emails and 15 appointments per week.
              </p>
            </div>
            <div className="space-y-4">
              <BeforeAfterRow task="Reply to customer inquiry" before="45 min" after="< 2 min" />
              <BeforeAfterRow task="Check product availability" before="15 min" after="Instant" />
              <BeforeAfterRow task="Answer WhatsApp message" before="20 min" after="< 1 min" />
              <BeforeAfterRow task="Schedule new appointment" before="20 min" after="Automatic" />
              <BeforeAfterRow task="Send appointment reminder" before="10 min" after="Automatic" />
              <BeforeAfterRow task="Handle reschedule request" before="30 min" after="< 1 min" />
              <BeforeAfterRow task="Follow up after appointment" before="15 min" after="Automatic" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function BeforeAfterRow({
  task,
  before,
  after,
}: {
  task: string
  before: string
  after: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-cream/80 flex-1">{task}</span>
      <span className="text-red-400/80 line-through shrink-0">{before}</span>
      <span className="text-teal-400 font-semibold shrink-0">{after}</span>
    </div>
  )
}

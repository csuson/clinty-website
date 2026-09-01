import { Link } from 'react-router-dom'
import { FacebookIcon, GoogleAdsIcon } from './IntegrationIcons'

function YelpIcon({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#FF1A1A" />
      <path
        fill="#fff"
        d="M12.05 5.5 9.2 14.8c-.15.45.35.85.75.6l1.55-.95 1.55.95c.4.25.9-.15.75-.6L11.35 5.5c-.1-.3-.5-.3-.6 0zm-4.1 2.2L4.5 16.1c-.2.55.35 1.05.85.75L8 15.5v3.25c0 .55.65.85 1.05.45l2.2-2.2-4.3-9.3zm8.1 0-4.3 9.3 2.2 2.2c.4.4 1.05.1 1.05-.45V15.5l2.65 1.35c.5.3 1.05-.2.85-.75l-3.45-8.4z"
      />
    </svg>
  )
}

const platforms = [
  {
    name: 'Google Ads',
    icon: GoogleAdsIcon,
    iconBg: 'bg-[#4285F4]/10',
    description: 'Search and display campaigns with keywords, ad copy, and budget split from one brief.',
  },
  {
    name: 'Meta Ads',
    icon: FacebookIcon,
    iconBg: 'bg-blue-50',
    description: 'Facebook and Instagram campaigns with audiences, creatives, and paused launch in Ads Manager.',
  },
  {
    name: 'Yelp Ads',
    icon: YelpIcon,
    iconBg: 'bg-red-50',
    description: 'Local search campaigns for businesses that live on Yelp — drafted and scheduled from Clinty.',
  },
]

const steps = [
  {
    title: 'Describe your business',
    description: 'Enter your offer, locations, monthly budget, and goals. Clinty loads your saved business background.',
  },
  {
    title: 'AI drafts every platform',
    description: 'One campaign brief generates tailored plans for Google, Meta, and Yelp — with budget split across channels.',
  },
  {
    title: 'Review, approve, publish paused',
    description: 'You stay in control. Approve the draft, then publish paused campaigns to each ad platform when ready.',
  },
]

export default function AdCampaigns() {
  return (
    <section id="ad-campaigns" className="py-24 px-6 bg-gradient-to-b from-white to-cream">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-[#4285F4]/10 text-[#3367d6] border border-[#4285F4]/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            Google, Meta & Yelp — from one workflow
          </div>
          <h2 className="font-serif text-4xl md:text-5xl text-navy-900 mb-4">
            Create and manage ad campaigns{' '}
            <em className="text-teal-500 not-italic">across every channel</em>
          </h2>
          <p className="text-navy-600 text-lg leading-relaxed">
            Clinty&apos;s campaign AI drafts search, social, and local ads from your business brief.
            Connect your platforms once, set your monthly budget, approve the plan, and publish
            paused campaigns when you&apos;re ready to go live.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {platforms.map((platform) => {
            const Icon = platform.icon
            return (
              <div
                key={platform.name}
                className="rounded-2xl border border-navy-900/5 bg-white p-6 shadow-sm"
              >
                <div className={`w-12 h-12 rounded-xl ${platform.iconBg} flex items-center justify-center mb-4`}>
                  <Icon />
                </div>
                <h3 className="text-lg font-semibold text-navy-900 mb-2">{platform.name}</h3>
                <p className="text-sm text-navy-600 leading-relaxed">{platform.description}</p>
              </div>
            )
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start mb-12">
          <div className="rounded-2xl bg-navy-900 text-cream p-8 md:p-10">
            <h3 className="text-2xl font-semibold mb-6">How campaign management works</h3>
            <ol className="space-y-6">
              {steps.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-400/20 text-teal-300 text-sm font-semibold">
                    {index + 1}
                  </span>
                  <div>
                    <h4 className="font-semibold mb-1">{step.title}</h4>
                    <p className="text-cream/60 text-sm leading-relaxed">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-navy-900/5 bg-white p-6">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-teal-500 mb-3">
                Included in every plan
              </h4>
              <ul className="space-y-3 text-sm text-navy-600">
                {[
                  'Multi-platform campaign wizard with monthly budget slider',
                  'Configurable budget split across Google, Meta, and Yelp',
                  'AI-generated ad copy, keywords, and audience targeting',
                  'OAuth connect for Google Ads and Meta publish credentials',
                  'Paused-by-default publishing — nothing goes live without approval',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl bg-teal-400/10 border border-teal-400/20 p-6">
              <p className="text-sm text-navy-900 leading-relaxed">
                <span className="font-semibold">You approve every launch.</span> Campaigns are created
                in a paused state on Google Ads, Meta, and Yelp so you can review targeting, copy,
                and spend before turning them on.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link
            to="/account/google-ads"
            className="inline-flex items-center gap-2 bg-navy-900 text-cream font-medium px-6 py-3.5 rounded-xl hover:bg-navy-800 transition-colors"
          >
            Open campaign builder
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
          <p className="text-sm text-navy-600 mt-3">
            Connect ad platforms in{' '}
            <Link to="/account/integrations" className="text-teal-600 hover:underline">
              Integrations
            </Link>{' '}
            before publishing live campaigns.
          </p>
        </div>
      </div>
    </section>
  )
}

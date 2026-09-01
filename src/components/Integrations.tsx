import { Link } from 'react-router-dom'
import {
  ExcelIcon,
  FacebookIcon,
  GmailIcon,
  GoogleAdsIcon,
  GoogleCalendarIcon,
  GoogleDocsIcon,
  InstagramIcon,
  MessengerIcon,
  MicrosoftCalendarIcon,
  OutlookIcon,
  QuickBooksIcon,
  ShopifyIcon,
  SquareIcon,
  WhatsAppIcon,
} from './IntegrationIcons'

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

const integrations = [
  {
    name: 'Google Ads',
    category: 'Advertising',
    description: 'Draft and publish paused search and display campaigns from your Clinty brief.',
    icon: GoogleAdsIcon,
    iconBg: 'bg-[#4285F4]/10',
  },
  {
    name: 'Meta Ads',
    category: 'Advertising',
    description: 'Create Facebook and Instagram campaigns with OAuth connect and ad account pickers.',
    icon: FacebookIcon,
    iconBg: 'bg-blue-50',
  },
  {
    name: 'Yelp Ads',
    category: 'Advertising',
    description: 'Manage local Yelp ad programs alongside Google and Meta from one workflow.',
    icon: YelpIcon,
    iconBg: 'bg-red-50',
  },
  {
    name: 'Gmail',
    category: 'Email',
    description: 'Read, draft, and send customer emails in your voice.',
    icon: GmailIcon,
    iconBg: 'bg-red-50',
  },
  {
    name: 'Google Calendar',
    category: 'Calendar',
    description: 'Check availability, book lessons, and manage scheduling.',
    icon: GoogleCalendarIcon,
    iconBg: 'bg-blue-50',
  },
  {
    name: 'Square',
    category: 'Bookings',
    description: 'Sync Square Appointments for availability and bookings.',
    icon: SquareIcon,
    iconBg: 'bg-navy-900',
    iconClass: 'text-cream',
  },
  {
    name: 'Microsoft Excel',
    category: 'Spreadsheets',
    description: 'Import rosters, pricing, and lesson data from spreadsheets.',
    icon: ExcelIcon,
    iconBg: 'bg-emerald-50',
  },
  {
    name: 'Microsoft Outlook',
    category: 'Email',
    description:
      'Handle Outlook inboxes and customer threads automatically. Works with Microsoft 365 and Outlook.com mailboxes.',
    icon: OutlookIcon,
    iconBg: 'bg-sky-50',
  },
  {
    name: 'Microsoft Calendar',
    category: 'Calendar',
    description: 'Propose times and confirm appointments from Outlook Calendar.',
    icon: MicrosoftCalendarIcon,
    iconBg: 'bg-sky-50',
  },
  {
    name: 'Google Docs',
    category: 'Documents',
    description: 'Pull policies, FAQs, and templates into agent replies.',
    icon: GoogleDocsIcon,
    iconBg: 'bg-blue-50',
  },
  {
    name: 'WhatsApp',
    category: 'Messaging',
    description: 'Reply to customer WhatsApp chats with the same AI agent.',
    icon: WhatsAppIcon,
    iconBg: 'bg-[#25D366]/10',
    iconClass: 'w-7 h-7 text-[#25D366]',
  },
  {
    name: 'Facebook',
    category: 'Social',
    description: 'Respond to Page messages and comments from one unified inbox.',
    icon: FacebookIcon,
    iconBg: 'bg-blue-50',
  },
  {
    name: 'Messenger',
    category: 'Social',
    description: 'Handle Facebook Messenger conversations with automated replies.',
    icon: MessengerIcon,
    iconBg: 'bg-purple-50',
  },
  {
    name: 'Instagram',
    category: 'Social',
    description: 'Answer Instagram DMs and customer questions in your brand voice.',
    icon: InstagramIcon,
    iconBg: 'bg-pink-50',
  },
  {
    name: 'Shopify',
    category: 'E-commerce',
    description: 'Answer order questions and product inquiries from your store.',
    icon: ShopifyIcon,
    iconBg: 'bg-lime-50',
  },
  {
    name: 'QuickBooks',
    category: 'Accounting',
    description: 'Reference invoices, payments, and billing context in replies.',
    icon: QuickBooksIcon,
    iconBg: 'bg-green-50',
  },
]

export default function Integrations() {
  return (
    <section id="integrations" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-serif text-4xl md:text-5xl text-navy-900 mb-4">
            Plugs into the tools you <em className="text-teal-500 not-italic">already</em> use
          </h2>
          <p className="text-navy-600 text-lg">
            Clinty connects your ad platforms, inbox, social channels, calendar, bookings, and
            business documents — so your AI agent and campaign tools work in one stack.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {integrations.map((integration) => {
            const Icon = integration.icon
            return (
              <div
                key={integration.name}
                className="rounded-2xl border border-navy-900/5 bg-white p-6 hover:border-navy-900/10 hover:shadow-md transition-all"
              >
                <div
                  className={`w-12 h-12 rounded-xl ${integration.iconBg} flex items-center justify-center mb-4`}
                >
                  <Icon className={integration.iconClass ?? 'w-7 h-7'} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-500 mb-1">
                  {integration.category}
                </p>
                <h3 className="text-lg font-semibold text-navy-900 mb-2">{integration.name}</h3>
                <p className="text-sm text-navy-600 leading-relaxed">{integration.description}</p>
              </div>
            )
          })}
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/account/integrations"
            className="inline-flex items-center gap-2 bg-navy-900 text-cream font-medium px-6 py-3 rounded-xl hover:bg-navy-800 transition-colors"
          >
            Connect your tools
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <p className="text-sm text-navy-600 mt-3">
            Google Ads, Meta, Yelp, Gmail, Outlook, Square, Shopify, WhatsApp, and more are available in your account settings.
          </p>
        </div>
      </div>
    </section>
  )
}

import { useEffect, useState } from 'react'
import GmailIntegration from './GmailIntegration'
import GoogleAdsIntegration from './GoogleAdsIntegration'
import OutlookIntegration from './OutlookIntegration'
import YahooIntegration from './YahooIntegration'
import ShopifyIntegration from './ShopifyIntegration'
import SquareIntegration from './SquareIntegration'
import StripeIntegration from './StripeIntegration'
import WhatsAppIntegration from './WhatsAppIntegration'

export type IntegrationId =
  | 'gmail'
  | 'outlook'
  | 'yahoo'
  | 'square'
  | 'stripe'
  | 'shopify'
  | 'whatsapp'
  | 'ad-campaigns'

function integrationFromSearchParams(params: URLSearchParams): IntegrationId | null {
  if (params.get('connected') || params.get('gmail_error')) return 'gmail'
  if (params.get('outlook_connected') || params.get('outlook_error')) return 'outlook'
  if (params.get('yahoo_connected') || params.get('yahoo_error')) return 'yahoo'
  if (params.get('square_connected') || params.get('square_error')) return 'square'
  if (params.get('stripe_connected') || params.get('stripe_error')) return 'stripe'
  if (params.get('shopify_connected') || params.get('shopify_error')) return 'shopify'
  if (params.get('whatsapp_connected')) return 'whatsapp'
  if (
    params.get('google_ads_connected')
    || params.get('google_ads_oauth_connected')
    || params.get('google_ads_oauth_error')
    || params.get('meta_ads_connected')
    || params.get('meta_ads_error')
  ) {
    return 'ad-campaigns'
  }
  return null
}

export default function Integrations() {
  const [expandedId, setExpandedId] = useState<IntegrationId | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const fromCallback = integrationFromSearchParams(params)
    if (fromCallback) {
      setExpandedId(fromCallback)
    }
  }, [])

  function toggle(id: IntegrationId) {
    setExpandedId((current) => (current === id ? null : id))
  }

  return (
    <div className="space-y-3">
      <GmailIntegration
        expanded={expandedId === 'gmail'}
        onToggle={() => toggle('gmail')}
      />
      <OutlookIntegration
        expanded={expandedId === 'outlook'}
        onToggle={() => toggle('outlook')}
      />
      <YahooIntegration
        expanded={expandedId === 'yahoo'}
        onToggle={() => toggle('yahoo')}
      />
      <SquareIntegration
        expanded={expandedId === 'square'}
        onToggle={() => toggle('square')}
      />
      <StripeIntegration
        expanded={expandedId === 'stripe'}
        onToggle={() => toggle('stripe')}
      />
      <ShopifyIntegration
        expanded={expandedId === 'shopify'}
        onToggle={() => toggle('shopify')}
      />
      <WhatsAppIntegration
        expanded={expandedId === 'whatsapp'}
        onToggle={() => toggle('whatsapp')}
      />
      <GoogleAdsIntegration
        expanded={expandedId === 'ad-campaigns'}
        onToggle={() => toggle('ad-campaigns')}
      />
    </div>
  )
}

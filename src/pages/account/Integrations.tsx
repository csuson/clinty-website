import { useEffect, useState } from 'react'
import GmailIntegration from './GmailIntegration'
import GoogleAdsIntegration from './GoogleAdsIntegration'
import OutlookIntegration from './OutlookIntegration'
import ShopifyIntegration from './ShopifyIntegration'
import SquareIntegration from './SquareIntegration'
import WhatsAppIntegration from './WhatsAppIntegration'

export type IntegrationId =
  | 'gmail'
  | 'outlook'
  | 'square'
  | 'shopify'
  | 'whatsapp'
  | 'ad-campaigns'

function integrationFromSearchParams(params: URLSearchParams): IntegrationId | null {
  if (params.get('connected') || params.get('gmail_error')) return 'gmail'
  if (params.get('outlook_connected') || params.get('outlook_error')) return 'outlook'
  if (params.get('square_connected') || params.get('square_error')) return 'square'
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
      <SquareIntegration
        expanded={expandedId === 'square'}
        onToggle={() => toggle('square')}
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

import GmailIntegration from './GmailIntegration'
import GoogleAdsIntegration from './GoogleAdsIntegration'
import OutlookIntegration from './OutlookIntegration'
import ShopifyIntegration from './ShopifyIntegration'
import SquareIntegration from './SquareIntegration'
import WhatsAppIntegration from './WhatsAppIntegration'

export default function Integrations() {
  return (
    <div className="space-y-6">
      <GmailIntegration />
      <OutlookIntegration />
      <SquareIntegration />
      <ShopifyIntegration />
      <WhatsAppIntegration />
      <GoogleAdsIntegration />
    </div>
  )
}

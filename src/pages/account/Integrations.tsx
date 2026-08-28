import GmailIntegration from './GmailIntegration'
import SquareIntegration from './SquareIntegration'
import WhatsAppIntegration from './WhatsAppIntegration'
import YahooIntegration from './YahooIntegration'

export default function Integrations() {
  return (
    <div className="space-y-6">
      <GmailIntegration />
      <YahooIntegration />
      <SquareIntegration />
      <WhatsAppIntegration />
    </div>
  )
}

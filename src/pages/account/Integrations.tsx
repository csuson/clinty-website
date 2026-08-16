import GmailIntegration from './GmailIntegration'
import SquareIntegration from './SquareIntegration'
import YahooIntegration from './YahooIntegration'

export default function Integrations() {
  return (
    <div className="space-y-6">
      <GmailIntegration />
      <YahooIntegration />
      <SquareIntegration />
    </div>
  )
}

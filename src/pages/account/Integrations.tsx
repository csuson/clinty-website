import GmailIntegration from './GmailIntegration'
import SquareIntegration from './SquareIntegration'

export default function Integrations() {
  return (
    <div className="space-y-6">
      <GmailIntegration />
      <SquareIntegration />
    </div>
  )
}

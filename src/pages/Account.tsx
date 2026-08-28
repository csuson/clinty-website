import { Navigate, Route, Routes } from 'react-router-dom'
import AccountLayout from './account/AccountLayout'
import AccountSettings from './account/AccountSettings'
import ApiKeys from './account/ApiKeys'
import Billing from './account/Billing'
import GmailCallback from './account/GmailCallback'
import Integrations from './account/Integrations'
import SquareCallback from './account/SquareCallback'
import WhatsAppLogin from './account/WhatsAppLogin'
import YahooCallback from './account/YahooCallback'

export default function Account() {
  return (
    <Routes>
      <Route element={<AccountLayout />}>
        <Route index element={<AccountSettings />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="integrations/whatsapp" element={<WhatsAppLogin />} />
        <Route path="integrations/gmail/callback" element={<GmailCallback />} />
        <Route path="integrations/square/callback" element={<SquareCallback />} />
        <Route path="integrations/yahoo/callback" element={<YahooCallback />} />
        <Route path="billing" element={<Billing />} />
        <Route path="api-keys" element={<ApiKeys />} />
      </Route>
      <Route path="*" element={<Navigate to="/account" replace />} />
    </Routes>
  )
}

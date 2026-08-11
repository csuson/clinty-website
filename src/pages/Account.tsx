import { Navigate, Route, Routes } from 'react-router-dom'
import AccountLayout from './account/AccountLayout'
import AccountSettings from './account/AccountSettings'
import ApiKeys from './account/ApiKeys'
import Billing from './account/Billing'
import GmailCallback from './account/GmailCallback'
import GmailIntegration from './account/GmailIntegration'

export default function Account() {
  return (
    <Routes>
      <Route element={<AccountLayout />}>
        <Route index element={<AccountSettings />} />
        <Route path="integrations" element={<GmailIntegration />} />
        <Route path="integrations/gmail/callback" element={<GmailCallback />} />
        <Route path="billing" element={<Billing />} />
        <Route path="api-keys" element={<ApiKeys />} />
      </Route>
      <Route path="*" element={<Navigate to="/account" replace />} />
    </Routes>
  )
}

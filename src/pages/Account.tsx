import { Navigate, Route, Routes } from 'react-router-dom'
import AccountLayout from './account/AccountLayout'
import AccountSettings from './account/AccountSettings'
import Analytics from './account/Analytics'
import ApiKeys from './account/ApiKeys'
import Billing from './account/Billing'
import GmailCallback from './account/GmailCallback'
import GoogleAds from './account/GoogleAds'
import GoogleAdsOAuthCallback from './account/GoogleAdsOAuthCallback'
import Integrations from './account/Integrations'
import MetaAdsCallback from './account/MetaAdsCallback'
import OutlookCallback from './account/OutlookCallback'
import Prompts from './account/Prompts'
import ShopifyCallback from './account/ShopifyCallback'
import SquareCallback from './account/SquareCallback'
import WhatsAppLogin from './account/WhatsAppLogin'

export default function Account() {
  return (
    <Routes>
      <Route element={<AccountLayout />}>
        <Route index element={<AccountSettings />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="integrations/whatsapp" element={<WhatsAppLogin />} />
        <Route path="integrations/gmail/callback" element={<GmailCallback />} />
        <Route path="integrations/google-ads/callback" element={<GoogleAdsOAuthCallback />} />
        <Route path="integrations/meta/callback" element={<MetaAdsCallback />} />
        <Route path="integrations/outlook/callback" element={<OutlookCallback />} />
        <Route path="integrations/square/callback" element={<SquareCallback />} />
        <Route path="integrations/shopify/callback" element={<ShopifyCallback />} />
        <Route path="prompts" element={<Prompts />} />
        <Route path="google-ads" element={<GoogleAds />} />
        <Route path="billing" element={<Billing />} />
        <Route path="api-keys" element={<ApiKeys />} />
      </Route>
      <Route path="*" element={<Navigate to="/account" replace />} />
    </Routes>
  )
}

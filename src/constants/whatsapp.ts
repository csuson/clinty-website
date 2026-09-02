/** WhatsApp Web (Baileys gateway) — configured via Supabase Edge Function secrets. */

export function isWhatsAppWebConfigured(): boolean {
  // Gateway URL is server-side only; the UI is always available when Supabase is configured.
  return true
}

export const WHATSAPP_LOGIN_PATH = '/account/integrations/whatsapp'

export const WHATSAPP_POLL_MS = 2500

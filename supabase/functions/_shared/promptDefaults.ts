/** Keep response tone in sync with src/constants/responseTones.ts */

export const DEFAULT_RESPONSE_TONE = 'warm_informal'

export type ResolvedUserPrompts = {
  background: string
  calendar_preference: string
  default_footer: string
  promotions: string
  payment_links: string
  response_tone: string
  whatsapp_response_tone: string | null
  response_preferences: string
  whatsapp_response_preferences: string
}

export function resolveUserPrompts(
  row: {
    background?: string | null
    calendar_preference?: string | null
    default_footer?: string | null
    promotions?: string | null
    payment_links?: string | null
    response_tone?: string | null
    whatsapp_response_tone?: string | null
    response_preferences?: string | null
    whatsapp_response_preferences?: string | null
  } | null,
): ResolvedUserPrompts {
  const responseTone = row?.response_tone?.trim() || DEFAULT_RESPONSE_TONE
  const whatsappTone = row?.whatsapp_response_tone?.trim() || null

  return {
    background: row?.background?.trim() ?? '',
    calendar_preference: row?.calendar_preference?.trim() ?? '',
    default_footer: row?.default_footer?.trim() ?? '',
    promotions: row?.promotions?.trim() ?? '',
    payment_links: row?.payment_links?.trim() ?? '',
    response_tone: responseTone,
    whatsapp_response_tone: whatsappTone,
    response_preferences: row?.response_preferences?.trim() ?? '',
    whatsapp_response_preferences: row?.whatsapp_response_preferences?.trim() ?? '',
  }
}

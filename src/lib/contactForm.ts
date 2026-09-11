import { supabase } from './supabase'
import { getFunctionErrorMessage } from './supabaseFunctions'

export type ContactFormPayload = {
  name: string
  email: string
  company: string
  inquiryType: string
  message: string
  website?: string
}

export async function submitContactForm(payload: ContactFormPayload): Promise<void> {
  if (!supabase) {
    throw new Error('Contact form is unavailable. Please message us on WhatsApp instead.')
  }

  const result = await supabase.functions.invoke('contact-form', {
    body: payload,
  })

  if (result.error || (result.data && typeof result.data === 'object' && 'error' in result.data && result.data.error)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }
}

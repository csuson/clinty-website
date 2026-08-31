import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js'

/** Extract the real error message from a Supabase Edge Function response. */
export async function getFunctionErrorMessage(
  error: unknown,
  data: unknown,
): Promise<string> {
  if (data && typeof data === 'object') {
    if ('error' in data && typeof data.error === 'string' && data.error) {
      return data.error
    }
    if ('message' in data && typeof data.message === 'string' && data.message) {
      return data.message
    }
  }

  if (error instanceof FunctionsFetchError) {
    const cause = error.context instanceof Error
      ? error.context.message
      : typeof error.context === 'string'
        ? error.context
        : null
    if (cause && /aborted|timeout/i.test(cause)) {
      return 'WhatsApp login timed out before Clinty finished talking to your gateway. Try again — the QR code may still appear after a few seconds. If it keeps failing, check that your gateway URL is reachable and responding quickly.'
    }
    if (cause && cause !== error.message) {
      return `Could not reach the Edge Function (${cause}). Check your connection, sign in again, or try refreshing the page.`
    }
    return 'Could not reach the Edge Function. Check your connection, sign in again, or try refreshing the page.'
  }

  if (error instanceof FunctionsRelayError) {
    return 'The Edge Function relay failed. Try again in a moment.'
  }

  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json()
      if (body && typeof body === 'object') {
        if ('error' in body && typeof body.error === 'string') return body.error
        if ('message' in body && typeof body.message === 'string') return body.message
      }
    } catch {
      // fall through
    }
    return `Edge Function failed (${error.context.status})`
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Unexpected error calling Edge Function'
}

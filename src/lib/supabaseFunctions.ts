import { FunctionsHttpError } from '@supabase/supabase-js'

/** Extract the real error message from a Supabase Edge Function response. */
export async function getFunctionErrorMessage(
  error: unknown,
  data: unknown,
): Promise<string> {
  if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
    return data.error
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

import type { ApiKey, GmailToken, Profile } from '../types/database'
import { supabase } from './supabase'
import { getFunctionErrorMessage } from './supabaseFunctions'

export type AdminApiKey = ApiKey & { user_email: string | null }
export type AdminGmailToken = GmailToken & { user_email: string | null }

export type AdminData = {
  users: Profile[]
  apiKeys: AdminApiKey[]
  gmailTokens: AdminGmailToken[]
}

export async function fetchAdminData(): Promise<AdminData> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('admin-data')

  if (result.error || (result.data && typeof result.data === 'object' && 'error' in result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }

  return result.data as AdminData
}

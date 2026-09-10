import {
  agentBehaviorFromRow,
  agentBehaviorToUserDbPayload,
  defaultAgentBehaviorSettings,
  type AgentBehaviorSettings,
} from '../components/AgentBehaviorFields'
import type { AgentSettings } from '../types/database'
import { getFunctionErrorMessage } from './supabaseFunctions'
import { supabase } from './supabase'

const BEHAVIOR_COLUMNS =
  'id, auto_book_scheduling, auto_respond_instruction, auto_respond_scheduling, auto_respond_whatsapp, auto_respond_catalog, auto_respond_personal, email_ignore_personal, whatsapp_ignore_personal, thread_message_cap, whatsapp_thread_message_cap, daily_incoming_email_limit, daily_incoming_email_timezone, daily_incoming_whatsapp_limit'

export type UserAgentBehaviorRecord = {
  id: string | null
  settings: AgentBehaviorSettings
}

export type SaveUserAgentBehaviorResult = {
  id: string
  assistantReloaded: boolean
  assistantReloadError?: string
}

export async function fetchUserAgentBehavior(userId: string): Promise<UserAgentBehaviorRecord> {
  if (!supabase) {
    return { id: null, settings: defaultAgentBehaviorSettings() }
  }

  const { data, error } = await supabase
    .from('agent_settings')
    .select(BEHAVIOR_COLUMNS)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)

  return {
    id: data?.id ?? null,
    settings: agentBehaviorFromRow(data as AgentSettings | null),
  }
}

export async function saveUserAgentBehavior(
  userId: string,
  recordId: string | null,
  settings: AgentBehaviorSettings,
): Promise<SaveUserAgentBehaviorResult> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const payload = agentBehaviorToUserDbPayload(settings)

  if (recordId) {
    const { data, error } = await supabase
      .from('agent_settings')
      .update(payload)
      .eq('id', recordId)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!data?.id) throw new Error('Agent settings were not saved.')

    const reload = await reloadAssistantRuntime()
    return { id: data.id, ...reload }
  }

  const { data, error } = await supabase
    .from('agent_settings')
    .insert({
      user_id: userId,
      name: 'Agent',
      ...payload,
    })
    .select('id')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data?.id) throw new Error('Agent settings were not saved.')

  const reload = await reloadAssistantRuntime()
  return { id: data.id, ...reload }
}

async function reloadAssistantRuntime(): Promise<{
  assistantReloaded: boolean
  assistantReloadError?: string
}> {
  if (!supabase) {
    return { assistantReloaded: false, assistantReloadError: 'Supabase is not configured.' }
  }

  const result = await supabase.functions.invoke('reload-assistant-runtime')

  if (result.error || (result.data && typeof result.data === 'object' && 'error' in result.data)) {
    return {
      assistantReloaded: false,
      assistantReloadError: await getFunctionErrorMessage(result.error, result.data),
    }
  }

  const data = result.data as {
    assistant_reloaded?: boolean
    assistant_reload_error?: string
  }

  return {
    assistantReloaded: Boolean(data.assistant_reloaded),
    assistantReloadError: data.assistant_reload_error,
  }
}

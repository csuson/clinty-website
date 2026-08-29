import {
  DEFAULT_PROMPT_BACKGROUND,
  DEFAULT_PROMPT_CALENDAR_PREFERENCE,
  DEFAULT_PROMPT_FOOTER,
} from '../constants/promptDefaults'
import type { UserPrompts } from '../types/database'
import { getFunctionErrorMessage } from './supabaseFunctions'
import { supabase } from './supabase'

export type PromptFields = {
  background: string
  calendarPreference: string
  defaultFooter: string
}

export function defaultPromptFields(): PromptFields {
  return {
    background: DEFAULT_PROMPT_BACKGROUND,
    calendarPreference: DEFAULT_PROMPT_CALENDAR_PREFERENCE,
    defaultFooter: DEFAULT_PROMPT_FOOTER,
  }
}

function toPromptFields(row: UserPrompts | null): PromptFields {
  const defaults = defaultPromptFields()
  if (!row) return defaults

  return {
    background: row.background ?? defaults.background,
    calendarPreference: row.calendar_preference ?? defaults.calendarPreference,
    defaultFooter: row.default_footer ?? defaults.defaultFooter,
  }
}

export async function fetchUserPrompts(userId: string): Promise<PromptFields> {
  if (!supabase) return defaultPromptFields()

  const { data, error } = await supabase
    .from('user_prompts')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return toPromptFields(data as UserPrompts | null)
}

export async function saveUserPrompts(userId: string, prompts: PromptFields): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const { error } = await supabase.from('user_prompts').upsert({
    user_id: userId,
    background: prompts.background,
    calendar_preference: prompts.calendarPreference,
    default_footer: prompts.defaultFooter,
  })

  if (error) throw new Error(error.message)
}

export async function generateBackgroundFromWebsite(websiteUrl: string): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('generate-prompt-background', {
    body: { url: websiteUrl },
    timeout: 120_000,
  })

  if (result.error || hasFunctionFailure(result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }

  const background = result.data && typeof result.data === 'object'
    ? (result.data as { background?: unknown }).background
    : null

  if (typeof background !== 'string' || !background.trim()) {
    throw new Error('Background generation returned no content')
  }

  return background.trim()
}

function hasFunctionFailure(data: unknown): boolean {
  if (data === null || typeof data !== 'object') return false
  const row = data as Record<string, unknown>
  if ('background' in row) return false
  return typeof row.error === 'string' && row.error.length > 0
}

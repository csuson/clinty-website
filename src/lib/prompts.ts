import {
  DEFAULT_PROMPT_BACKGROUND,
  DEFAULT_PROMPT_CALENDAR_PREFERENCE,
  DEFAULT_PROMPT_FOOTER,
} from '../constants/promptDefaults'
import {
  DEFAULT_RESPONSE_TONE,
  isResponseTonePreset,
  WHATSAPP_SAME_AS_EMAIL,
} from '../constants/responseTones'
import type { UserPrompts } from '../types/database'
import { getFunctionErrorMessage } from './supabaseFunctions'
import { supabase } from './supabase'

export type PromptFields = {
  background: string
  calendarPreference: string
  defaultFooter: string
  responseTone: string
  whatsappResponseTone: string
}

export function defaultPromptFields(): PromptFields {
  return {
    background: DEFAULT_PROMPT_BACKGROUND,
    calendarPreference: DEFAULT_PROMPT_CALENDAR_PREFERENCE,
    defaultFooter: DEFAULT_PROMPT_FOOTER,
    responseTone: DEFAULT_RESPONSE_TONE,
    whatsappResponseTone: WHATSAPP_SAME_AS_EMAIL,
  }
}

function toPromptFields(row: UserPrompts | null): PromptFields {
  const defaults = defaultPromptFields()
  if (!row) return defaults

  const responseTone = row.response_tone?.trim() || defaults.responseTone
  const whatsappTone = row.whatsapp_response_tone?.trim()

  return {
    background: row.background ?? defaults.background,
    calendarPreference: row.calendar_preference ?? defaults.calendarPreference,
    defaultFooter: row.default_footer ?? defaults.defaultFooter,
    responseTone,
    whatsappResponseTone: whatsappTone || WHATSAPP_SAME_AS_EMAIL,
  }
}

export function serializeResponseToneForSave(
  selectValue: string,
  customText: string,
): string {
  if (selectValue === 'custom') {
    return customText.trim() || DEFAULT_RESPONSE_TONE
  }
  return selectValue.trim() || DEFAULT_RESPONSE_TONE
}

export function serializeWhatsappResponseToneForSave(
  selectValue: string,
  customText: string,
): string | null {
  if (selectValue === WHATSAPP_SAME_AS_EMAIL) {
    return null
  }
  if (selectValue === 'custom') {
    const trimmed = customText.trim()
    return trimmed || null
  }
  return selectValue.trim() || null
}

export function responseToneSelectValue(stored: string): string {
  const trimmed = stored.trim()
  if (!trimmed) return DEFAULT_RESPONSE_TONE
  return isResponseTonePreset(trimmed) ? trimmed : 'custom'
}

export function responseToneCustomText(stored: string): string {
  const trimmed = stored.trim()
  if (!trimmed || isResponseTonePreset(trimmed)) return ''
  return trimmed
}

export function whatsappToneSelectValue(stored: string): string {
  if (!stored.trim()) return WHATSAPP_SAME_AS_EMAIL
  return responseToneSelectValue(stored)
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

  const whatsappTone = prompts.whatsappResponseTone.trim()

  const { error } = await supabase.from('user_prompts').upsert({
    user_id: userId,
    background: prompts.background,
    calendar_preference: prompts.calendarPreference,
    default_footer: prompts.defaultFooter,
    response_tone: prompts.responseTone.trim() || DEFAULT_RESPONSE_TONE,
    whatsapp_response_tone: whatsappTone ? whatsappTone : null,
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

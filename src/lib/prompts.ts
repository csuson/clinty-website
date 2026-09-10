import {
  DEFAULT_PROMPT_BACKGROUND,
  DEFAULT_PROMPT_CALENDAR_PREFERENCE,
  DEFAULT_PROMPT_FOOTER,
  DEFAULT_PROMPT_PROMOTIONS,
} from '../constants/promptDefaults'
import {
  DEFAULT_RESPONSE_TONE,
  isResponseTonePreset,
  WHATSAPP_SAME_AS_EMAIL,
} from '../constants/responseTones'
import type { UserPrompts } from '../types/database'
import type { AiTokenUsage } from './aiUsage'
import { fetchWebsiteTextViaAssistant, reloadUserEmailAssistant } from './emailAssistantReload'
import { getFunctionErrorMessage } from './supabaseFunctions'
import { supabase } from './supabase'
import {
  buildWebsiteTextFromHtml,
  collectWebsiteTextFromBrowser,
  formatWebsiteTextPages,
  isLocalOrPrivateWebsiteUrl,
  normalizeWebsiteUrl,
  readWebsiteHtmlFile,
} from './websiteTextExtract'

export type PromptFields = {
  background: string
  calendarPreference: string
  defaultFooter: string
  promotions: string
  responseTone: string
  whatsappResponseTone: string
}

export function defaultPromptFields(): PromptFields {
  return {
    background: DEFAULT_PROMPT_BACKGROUND,
    calendarPreference: DEFAULT_PROMPT_CALENDAR_PREFERENCE,
    defaultFooter: DEFAULT_PROMPT_FOOTER,
    promotions: DEFAULT_PROMPT_PROMOTIONS,
    responseTone: DEFAULT_RESPONSE_TONE,
    whatsappResponseTone: WHATSAPP_SAME_AS_EMAIL,
  }
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toPromptFields(row: UserPrompts | null): PromptFields {
  if (!row) return defaultPromptFields()

  const responseTone = row.response_tone?.trim() || DEFAULT_RESPONSE_TONE
  const whatsappTone = row.whatsapp_response_tone?.trim()

  return {
    background: row.background?.trim() ?? '',
    calendarPreference: row.calendar_preference?.trim() ?? '',
    defaultFooter: row.default_footer?.trim() ?? '',
    promotions: row.promotions?.trim() ?? '',
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
    .select(
      'user_id, background, calendar_preference, default_footer, promotions, response_tone, whatsapp_response_tone',
    )
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return toPromptFields(data as UserPrompts | null)
}

export type SaveUserPromptsResult = {
  assistantReloaded: boolean
  assistantReloadError?: string
}

export async function saveUserPrompts(userId: string, prompts: PromptFields): Promise<SaveUserPromptsResult> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const row = {
    user_id: userId,
    background: emptyToNull(prompts.background),
    calendar_preference: emptyToNull(prompts.calendarPreference),
    default_footer: emptyToNull(prompts.defaultFooter),
    promotions: emptyToNull(prompts.promotions),
    response_tone: prompts.responseTone.trim() || DEFAULT_RESPONSE_TONE,
    whatsapp_response_tone: emptyToNull(prompts.whatsappResponseTone),
  }

  const { data: updated, error: updateError } = await supabase
    .from('user_prompts')
    .update({
      background: row.background,
      calendar_preference: row.calendar_preference,
      default_footer: row.default_footer,
      promotions: row.promotions,
      response_tone: row.response_tone,
      whatsapp_response_tone: row.whatsapp_response_tone,
    })
    .eq('user_id', userId)
    .select('response_tone, promotions')
    .maybeSingle()

  if (updateError) throw new Error(updateError.message)

  if (!updated) {
    const { data: inserted, error: insertError } = await supabase
      .from('user_prompts')
      .insert(row)
      .select('response_tone, promotions')
      .maybeSingle()

    if (insertError) throw new Error(insertError.message)
    if (!inserted) {
      throw new Error('Prompts were not saved.')
    }
    if (
      inserted.response_tone !== row.response_tone ||
      (inserted.promotions ?? '') !== (row.promotions ?? '')
    ) {
      throw new Error('Prompts were not saved.')
    }
    return reloadEmailAssistantRuntime(userId)
  }

  if (
    updated.response_tone !== row.response_tone ||
    (updated.promotions ?? '') !== (row.promotions ?? '')
  ) {
    throw new Error('Prompts were not saved.')
  }

  return reloadEmailAssistantRuntime(userId)
}

async function reloadEmailAssistantRuntime(userId: string): Promise<SaveUserPromptsResult> {
  return reloadUserEmailAssistant(userId)
}

export type GenerateBackgroundOptions = {
  userId?: string
  htmlFile?: File | null
}

export async function generateBackgroundFromWebsite(
  websiteUrl: string,
  options: GenerateBackgroundOptions = {},
): Promise<{ background: string; usage?: AiTokenUsage }> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const siteUrl = normalizeWebsiteUrl(websiteUrl.trim())
  if (!siteUrl) {
    throw new Error('Enter a valid website URL (https://example.com)')
  }

  const body: { url: string; website_text?: string } = { url: siteUrl.href }
  const websiteText = await resolveWebsiteTextForGeneration(siteUrl, options)
  if (websiteText) {
    body.website_text = websiteText
  }

  const result = await supabase.functions.invoke('generate-prompt-background', {
    body,
    timeout: 120_000,
  })

  if (result.error || hasFunctionFailure(result.data)) {
    throw new Error(await getFunctionErrorMessage(result.error, result.data))
  }

  const background = result.data && typeof result.data === 'object'
    ? (result.data as { background?: unknown; usage?: AiTokenUsage }).background
    : null
  const usage = result.data && typeof result.data === 'object'
    ? (result.data as { usage?: AiTokenUsage }).usage
    : undefined

  if (typeof background !== 'string' || !background.trim()) {
    throw new Error('Background generation returned no content')
  }

  return { background: background.trim(), usage }
}

async function resolveWebsiteTextForGeneration(
  siteUrl: URL,
  options: GenerateBackgroundOptions,
): Promise<string | null> {
  if (options.htmlFile) {
    const html = await readWebsiteHtmlFile(options.htmlFile)
    return buildWebsiteTextFromHtml(html, siteUrl.href)
  }

  if (!isLocalOrPrivateWebsiteUrl(siteUrl)) {
    return null
  }

  const pages = await collectWebsiteTextFromBrowser(siteUrl)
  if (pages.length) {
    return formatWebsiteTextPages(pages)
  }

  if (options.userId) {
    const assistantFetch = await fetchWebsiteTextViaAssistant(options.userId, siteUrl.href)
    if (assistantFetch.ok && assistantFetch.websiteText) {
      return assistantFetch.websiteText.slice(0, 28_000)
    }
  }

  throw new Error(
    'Could not read that local site automatically. Open the page in your browser, choose File → Save As → Webpage, HTML only, then upload the saved file below.',
  )
}

function hasFunctionFailure(data: unknown): boolean {
  if (data === null || typeof data !== 'object') return false
  const row = data as Record<string, unknown>
  if ('background' in row) return false
  return typeof row.error === 'string' && row.error.length > 0
}

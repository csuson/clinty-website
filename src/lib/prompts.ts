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
  formatWebsiteTextForGeneration,
  isLocalOrPrivateWebsiteUrl,
  normalizeWebsiteUrl,
  readWebsiteHtmlFile,
} from './websiteTextExtract'

export type PromptFields = {
  background: string
  calendarPreference: string
  defaultFooter: string
  promotions: string
  paymentLinks: string
  responsePreferences: string
  whatsappResponsePreferences: string
  responseTone: string
  whatsappResponseTone: string
}

export function defaultPromptFields(): PromptFields {
  return {
    background: '',
    calendarPreference: '',
    defaultFooter: '',
    promotions: '',
    paymentLinks: '',
    responsePreferences: '',
    whatsappResponsePreferences: '',
    responseTone: DEFAULT_RESPONSE_TONE,
    whatsappResponseTone: WHATSAPP_SAME_AS_EMAIL,
  }
}

/** Trimmed non-empty string, or null so Supabase clears the column. */
export function promptTextToDb(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const USER_PROMPTS_WRITE_SELECT =
  'background, calendar_preference, default_footer, promotions, payment_links, response_preferences, whatsapp_response_preferences, response_tone, whatsapp_response_tone'

type UserPromptsWriteRow = {
  user_id: string
  background: string | null
  calendar_preference: string | null
  default_footer: string | null
  promotions: string | null
  payment_links: string | null
  response_preferences: string | null
  whatsapp_response_preferences: string | null
  response_tone: string
  whatsapp_response_tone: string | null
}

type SavedUserPromptsRow = Pick<
  UserPrompts,
  | 'background'
  | 'calendar_preference'
  | 'default_footer'
  | 'promotions'
  | 'payment_links'
  | 'response_preferences'
  | 'whatsapp_response_preferences'
  | 'response_tone'
  | 'whatsapp_response_tone'
>

function normalizeDbText(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function savedUserPromptsMatch(saved: SavedUserPromptsRow | null, expected: UserPromptsWriteRow): boolean {
  if (!saved) return false

  return (
    normalizeDbText(saved.background) === expected.background &&
    normalizeDbText(saved.calendar_preference) === expected.calendar_preference &&
    normalizeDbText(saved.default_footer) === expected.default_footer &&
    normalizeDbText(saved.promotions) === expected.promotions &&
    normalizeDbText(saved.payment_links) === expected.payment_links &&
    normalizeDbText(saved.response_preferences) === expected.response_preferences &&
    normalizeDbText(saved.whatsapp_response_preferences) === expected.whatsapp_response_preferences &&
    normalizeDbText(saved.response_tone) === expected.response_tone &&
    normalizeDbText(saved.whatsapp_response_tone) === expected.whatsapp_response_tone
  )
}

export function buildUserPromptsWriteRow(userId: string, prompts: PromptFields): UserPromptsWriteRow {
  return {
    user_id: userId,
    background: promptTextToDb(prompts.background),
    calendar_preference: promptTextToDb(prompts.calendarPreference),
    default_footer: promptTextToDb(prompts.defaultFooter),
    promotions: promptTextToDb(prompts.promotions),
    payment_links: promptTextToDb(prompts.paymentLinks),
    response_preferences: promptTextToDb(prompts.responsePreferences),
    whatsapp_response_preferences: promptTextToDb(prompts.whatsappResponsePreferences),
    response_tone: prompts.responseTone.trim() || DEFAULT_RESPONSE_TONE,
    whatsapp_response_tone: promptTextToDb(prompts.whatsappResponseTone),
  }
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
    paymentLinks: row.payment_links?.trim() ?? '',
    responsePreferences: row.response_preferences?.trim() ?? '',
    whatsappResponsePreferences: row.whatsapp_response_preferences?.trim() ?? '',
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
      'user_id, background, calendar_preference, default_footer, promotions, payment_links, response_preferences, whatsapp_response_preferences, response_tone, whatsapp_response_tone',
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

  const row = buildUserPromptsWriteRow(userId, prompts)

  const { data: updated, error: updateError } = await supabase
    .from('user_prompts')
    .update({
      background: row.background,
      calendar_preference: row.calendar_preference,
      default_footer: row.default_footer,
      promotions: row.promotions,
      payment_links: row.payment_links,
      response_preferences: row.response_preferences,
      whatsapp_response_preferences: row.whatsapp_response_preferences,
      response_tone: row.response_tone,
      whatsapp_response_tone: row.whatsapp_response_tone,
    })
    .eq('user_id', userId)
    .select(USER_PROMPTS_WRITE_SELECT)
    .maybeSingle()

  if (updateError) throw new Error(updateError.message)

  if (!updated) {
    const { data: inserted, error: insertError } = await supabase
      .from('user_prompts')
      .insert(row)
      .select(USER_PROMPTS_WRITE_SELECT)
      .maybeSingle()

    if (insertError) throw new Error(insertError.message)
    if (!savedUserPromptsMatch(inserted as SavedUserPromptsRow | null, row)) {
      throw new Error('Prompts were not saved.')
    }
    return reloadEmailAssistantRuntime(userId)
  }

  if (!savedUserPromptsMatch(updated as SavedUserPromptsRow | null, row)) {
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
    return await buildWebsiteTextFromHtml(html, siteUrl.href)
  }

  if (!isLocalOrPrivateWebsiteUrl(siteUrl)) {
    return null
  }

  const crawl = await collectWebsiteTextFromBrowser(siteUrl)
  if (crawl.pages.length) {
    return formatWebsiteTextForGeneration(crawl.pages, crawl.faqs)
  }

  if (options.userId) {
    const assistantFetch = await fetchWebsiteTextViaAssistant(options.userId, siteUrl.href)
    if (assistantFetch.ok && assistantFetch.websiteText) {
      return assistantFetch.websiteText.slice(0, 40_000)
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

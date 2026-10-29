/**
 * Booking recovery gateway infrastructure helpers (multi-tenant routing).
 */

import type { WebsiteInfrastructure } from './websiteInfrastructure.ts'

export type BookingRecoveryConnectionRow = {
  user_id: string
  langgraph_url?: string | null
  langgraph_api_key?: string | null
  square_merchant_id?: string | null
  webhook_token?: string | null
  webhook_secret?: string | null
  wix_instance_id?: string | null
  wix_site_id?: string | null
  enabled?: boolean | null
  updated_at?: string | null
}

export type BookingRecoveryUrls = {
  squareWebhookUrl: string
  googleWebhookUrl: string
  wixWebhookUrl: string
}

export type AppsScriptConnectUrls = {
  connectUrl: string
  statusUrl: string
  disconnectUrl: string
}

export const BOOKING_RECOVERY_SELECT =
  'user_id, langgraph_url, langgraph_api_key, square_merchant_id, webhook_token, webhook_secret, wix_instance_id, wix_site_id, enabled, updated_at'

function trim(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeBaseUrl(value: unknown): string {
  return trim(value).replace(/\/$/, '')
}

export function emptyToNull(value: unknown): string | null {
  if (value === undefined || value === null) return null
  const trimmed = String(value).trim()
  return trimmed.length > 0 ? trimmed : null
}

export function normalizeLanggraphUrl(value: unknown): string | null {
  const normalized = normalizeBaseUrl(value)
  return normalized || null
}

export function generateWebhookToken(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Full gateway (Square + Wix). */
export function resolveBookingRecoveryGatewayUrl(
  websiteSettings: WebsiteInfrastructure,
): string {
  return (
    normalizeBaseUrl(websiteSettings.booking_recovery_gateway_url) ||
    normalizeBaseUrl(Deno.env.get('BOOKING_RECOVERY_GATEWAY_URL'))
  )
}

/**
 * Google-only gateway for Apps Script POSTs.
 * Falls back to the full gateway URL when unset (single-host deployments).
 */
export function resolveBookingRecoveryGoogleGatewayUrl(
  websiteSettings: WebsiteInfrastructure,
): string {
  return (
    normalizeBaseUrl(websiteSettings.booking_recovery_google_gateway_url) ||
    normalizeBaseUrl(Deno.env.get('BOOKING_RECOVERY_GOOGLE_GATEWAY_URL')) ||
    resolveBookingRecoveryGatewayUrl(websiteSettings)
  )
}

/**
 * Normalize a deployed Apps Script Web App URL.
 * Strips query/hash, trailing slash, and multi-login `/macros/u/N/` segments that cause
 * Google's "Sorry, unable to open the file at this time" error.
 */
export function normalizeAppsScriptWebAppUrl(value: unknown): string {
  let url = trim(value)
  if (!url) return ''
  // Drop accidental connect/status query strings pasted from a prior link.
  const q = url.indexOf('?')
  if (q >= 0) url = url.slice(0, q)
  const h = url.indexOf('#')
  if (h >= 0) url = url.slice(0, h)
  url = url.replace(/\/$/, '')
  // https://script.google.com/macros/u/1/s/…/exec → …/macros/s/…/exec
  url = url.replace(/\/macros\/u\/\d+\//i, '/macros/')
  return url
}

export function resolveAppsScriptWebAppUrl(
  websiteSettings: WebsiteInfrastructure,
): string {
  return (
    normalizeAppsScriptWebAppUrl(websiteSettings.booking_recovery_apps_script_web_app_url) ||
    normalizeAppsScriptWebAppUrl(Deno.env.get('BOOKING_RECOVERY_APPS_SCRIPT_WEB_APP_URL'))
  )
}

export function resolveAppsScriptConnectSecret(
  websiteSettings: WebsiteInfrastructure,
): string {
  return (
    trim(websiteSettings.booking_recovery_apps_script_connect_secret) ||
    trim(Deno.env.get('BOOKING_RECOVERY_APPS_SCRIPT_CONNECT_SECRET'))
  )
}

export function buildRecoveryUrls(
  bases: { fullGatewayBase: string; googleGatewayBase: string } | string,
  webhookToken: string | null | undefined,
): BookingRecoveryUrls {
  // Back-compat: single string = use for Square, Google, and Wix.
  const full =
    typeof bases === 'string'
      ? normalizeBaseUrl(bases)
      : normalizeBaseUrl(bases.fullGatewayBase)
  const google =
    typeof bases === 'string'
      ? full
      : normalizeBaseUrl(bases.googleGatewayBase) || full
  const token = trim(webhookToken)
  return {
    squareWebhookUrl: full ? `${full}/v1/square` : '',
    googleWebhookUrl: google && token ? `${google}/v1/google/${token}` : '',
    wixWebhookUrl: full ? `${full}/v1/wix` : '',
  }
}

export function buildAppsScriptConnectUrls(
  webAppUrl: string,
  connectSecret: string,
  webhookToken: string | null | undefined,
): AppsScriptConnectUrls {
  const base = normalizeAppsScriptWebAppUrl(webAppUrl)
  const secret = trim(connectSecret)
  const token = trim(webhookToken)
  if (!base || !secret || !token) {
    return { connectUrl: '', statusUrl: '', disconnectUrl: '' }
  }
  const q = (action: string) =>
    `${base}?action=${encodeURIComponent(action)}&token=${encodeURIComponent(token)}&s=${encodeURIComponent(secret)}`
  return {
    connectUrl: q('connect'),
    statusUrl: q('status'),
    disconnectUrl: q('disconnect'),
  }
}

/**
 * Keep booking_recovery_connections.langgraph_url aligned with agent_settings.url.
 * Creates a row when missing so gateway routing stays ready after admin agent save.
 */
export async function syncBookingRecoveryLanggraphUrlFromAgent(
  admin: { from: (table: string) => any },
  userId: string,
  agentUrl: unknown,
): Promise<void> {
  const langgraphUrl = normalizeLanggraphUrl(agentUrl)
  if (!userId || !langgraphUrl) return

  const { data: existing } = await admin
    .from('booking_recovery_connections')
    .select('user_id, webhook_token')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    const { error } = await admin
      .from('booking_recovery_connections')
      .update({ langgraph_url: langgraphUrl })
      .eq('user_id', userId)
    if (error) {
      console.warn(
        `Failed to sync booking recovery langgraph_url for user ${userId}:`,
        error.message ?? error,
      )
    }
    return
  }

  const { error } = await admin.from('booking_recovery_connections').insert({
    user_id: userId,
    langgraph_url: langgraphUrl,
    webhook_token: generateWebhookToken(),
    enabled: true,
  })
  if (error) {
    console.warn(
      `Failed to create booking_recovery_connections for user ${userId}:`,
      error.message ?? error,
    )
  }
}

export async function ensureBookingRecoveryRow(
  admin: { from: (table: string) => any },
  userId: string,
  options?: {
    squareMerchantId?: string | null
    wixInstanceId?: string | null
    wixSiteId?: string | null
    langgraphUrl?: string | null
    langgraphApiKey?: string | null
  },
): Promise<BookingRecoveryConnectionRow | null> {
  if (!userId) return null

  const { data: existing } = await admin
    .from('booking_recovery_connections')
    .select(BOOKING_RECOVERY_SELECT)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    const patch: Record<string, unknown> = {}
    if (options?.squareMerchantId !== undefined) {
      patch.square_merchant_id = emptyToNull(options.squareMerchantId)
    }
    if (options?.wixInstanceId !== undefined) {
      patch.wix_instance_id = emptyToNull(options.wixInstanceId)
    }
    if (options?.wixSiteId !== undefined) {
      patch.wix_site_id = emptyToNull(options.wixSiteId)
    }
    if (options?.langgraphUrl !== undefined && normalizeLanggraphUrl(options.langgraphUrl)) {
      patch.langgraph_url = normalizeLanggraphUrl(options.langgraphUrl)
    }
    if (options?.langgraphApiKey !== undefined) {
      patch.langgraph_api_key = emptyToNull(options.langgraphApiKey)
    }
    if (Object.keys(patch).length === 0) {
      return existing as BookingRecoveryConnectionRow
    }
    const { data: updated, error } = await admin
      .from('booking_recovery_connections')
      .update(patch)
      .eq('user_id', userId)
      .select(BOOKING_RECOVERY_SELECT)
      .single()
    if (error) {
      console.warn(`Failed to update booking_recovery_connections for ${userId}:`, error.message)
      return existing as BookingRecoveryConnectionRow
    }
    return updated as BookingRecoveryConnectionRow
  }

  let langgraphUrl =
    normalizeLanggraphUrl(options?.langgraphUrl) || ''
  if (!langgraphUrl) {
    const { data: agent } = await admin
      .from('agent_settings')
      .select('url')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    langgraphUrl = normalizeLanggraphUrl(agent?.url) || ''
  }

  const row = {
    user_id: userId,
    langgraph_url: langgraphUrl,
    langgraph_api_key: emptyToNull(options?.langgraphApiKey) ?? null,
    square_merchant_id: emptyToNull(options?.squareMerchantId) ?? null,
    wix_instance_id: emptyToNull(options?.wixInstanceId) ?? null,
    wix_site_id: emptyToNull(options?.wixSiteId) ?? null,
    webhook_token: generateWebhookToken(),
    enabled: true,
  }

  const { data: inserted, error } = await admin
    .from('booking_recovery_connections')
    .insert(row)
    .select(BOOKING_RECOVERY_SELECT)
    .single()

  if (error) {
    console.warn(`Failed to insert booking_recovery_connections for ${userId}:`, error.message)
    return null
  }
  return inserted as BookingRecoveryConnectionRow
}

export async function clearBookingRecoverySquareMerchant(
  admin: { from: (table: string) => any },
  userId: string,
): Promise<void> {
  if (!userId) return
  const { error } = await admin
    .from('booking_recovery_connections')
    .update({ square_merchant_id: null })
    .eq('user_id', userId)
  if (error) {
    console.warn(`Failed to clear square_merchant_id for ${userId}:`, error.message)
  }
}

export function publicBookingRecoveryView(row: BookingRecoveryConnectionRow | null | undefined) {
  if (!row) return null
  return {
    user_id: row.user_id,
    langgraph_url: row.langgraph_url ?? '',
    has_langgraph_api_key: Boolean(trim(row.langgraph_api_key)),
    square_merchant_id: row.square_merchant_id ?? null,
    webhook_token: row.webhook_token ?? null,
    has_webhook_secret: Boolean(trim(row.webhook_secret)),
    wix_instance_id: row.wix_instance_id ?? null,
    wix_site_id: row.wix_site_id ?? null,
    enabled: row.enabled !== false,
    updated_at: row.updated_at ?? null,
  }
}

export async function clearBookingRecoveryWixIds(
  admin: { from: (table: string) => any },
  userId: string,
): Promise<void> {
  if (!userId) return
  const { error } = await admin
    .from('booking_recovery_connections')
    .update({ wix_instance_id: null, wix_site_id: null })
    .eq('user_id', userId)
  if (error) {
    console.warn(`Failed to clear Wix recovery ids for ${userId}:`, error.message)
  }
}

type AdminClient = {
  from: (table: string) => {
    select: (columns: string) => Record<string, any>
  }
}

export type AssistantAnalyticsResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; status: number; error: string }

export type AssistantReloadPayload = {
  shopify_store_domain?: string
  shopify_storefront_token?: string
  shopify_token_type?: string
  clear_shopify?: boolean
}

export type AssistantReloadResult = {
  ok: boolean
  detail?: string
  assistantUrl?: string | null
}

export async function notifyEmailAssistantRuntimeReload(
  admin: AdminClient,
  userId: string,
  payload: AssistantReloadPayload = {},
): Promise<AssistantReloadResult> {
  const assistantUrl = await resolveAssistantUrl(admin, userId)
  if (!assistantUrl) {
    return {
      ok: false,
      assistantUrl: null,
      detail: 'Set the LangGraph URL in Admin → Agent Settings.',
    }
  }

  const apiKey = await resolveAssistantApiKey(admin, userId)
  if (!apiKey) {
    return {
      ok: false,
      assistantUrl,
      detail: 'No Clinty API key is linked for this account.',
    }
  }

  if (isLoopbackUrl(assistantUrl)) {
    return {
      ok: false,
      assistantUrl,
      detail: 'Assistant URL is local. The browser will resume it after save.',
    }
  }

  const lastError = await postAssistantReload(assistantUrl, apiKey, payload)
  if (!lastError) {
    return { ok: true, assistantUrl }
  }

  return { ok: false, assistantUrl, detail: lastError }
}

function isLoopbackUrl(assistantUrl: string): boolean {
  try {
    const host = new URL(assistantUrl).hostname
    return host === 'localhost' || host === '127.0.0.1' || host === '::1'
  } catch {
    return false
  }
}

async function postAssistantReload(
  assistantUrl: string,
  apiKey: string,
  payload: AssistantReloadPayload,
): Promise<string | null> {
  try {
    const response = await fetch(`${assistantUrl}/runtime/reload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'X-Clinty-Api-Key': apiKey,
        'X-Api-Key': apiKey,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4_000),
    })

    if (response.ok) return null

    const body = await response.json().catch(() => ({})) as { detail?: string; error?: string }
    return typeof body.detail === 'string'
      ? body.detail
      : typeof body.error === 'string'
        ? body.error
        : `Assistant returned ${response.status}`
  } catch (err) {
    return err instanceof Error ? err.message : 'Could not reach the email assistant.'
  }
}

export async function fetchAssistantAnalytics(
  admin: AdminClient,
  userId: string,
  endpoint: 'summary' | 'inbound',
  days: number,
): Promise<AssistantAnalyticsResult> {
  const assistantUrl = await resolveAssistantUrl(admin, userId)
  if (!assistantUrl) {
    return {
      ok: false,
      status: 400,
      error: 'Assistant deployment URL is not configured. Ask your Clinty admin to set the LangGraph URL in Agent Settings.',
    }
  }

  const apiKey = await resolveAssistantApiKey(admin, userId)
  if (!apiKey) {
    return {
      ok: false,
      status: 400,
      error: 'No Clinty API key found. Generate one under Account → API Keys and link it in Agent Settings.',
    }
  }

  const keyFormatError = validateAssistantApiKeyFormat(apiKey)
  if (keyFormatError) {
    return { ok: false, status: 400, error: keyFormatError }
  }

  const path = endpoint === 'summary' ? '/analytics/summary' : '/analytics/inbound'
  const response = await fetch(`${assistantUrl}${path}?days=${days}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'X-Clinty-Api-Key': apiKey,
      'X-Api-Key': apiKey,
      Accept: 'application/json',
    },
  })

  const payload = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok) {
    const detail = typeof payload.detail === 'string'
      ? payload.detail
      : typeof payload.error === 'string'
        ? payload.error
        : `Assistant returned ${response.status}`
    const hint = /invalid or missing api key/i.test(detail)
      ? ' Confirm the Clinty API key linked in Agent Settings matches a live key from Account → API Keys. If you edited the key in Admin, paste the full clinty_sk_… value (not a masked preview).'
      : ''
    return {
      ok: false,
      status: response.status === 401 ? 401 : 502,
      error: `${detail}${hint}`,
    }
  }

  return { ok: true, data: payload }
}

export function validateAssistantApiKeyFormat(apiKey: string): string | null {
  if (apiKey.includes('•') || apiKey.includes('…')) {
    return 'The linked Clinty API key looks masked or incomplete. In Admin → Agent Settings, paste the full clinty_sk_… key from Account → API Keys.'
  }
  if (!apiKey.startsWith('clinty_sk_')) {
    return 'The linked Clinty API key has an invalid format. Generate a new key under Account → API Keys and link it in Agent Settings.'
  }
  return null
}

export async function resolveAssistantUrl(admin: AdminClient, userId: string): Promise<string | null> {
  const { data } = await admin
    .from('agent_settings')
    .select('url')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return normalizeBaseUrl(data?.url) || null
}

export async function resolveAssistantApiKey(admin: AdminClient, userId: string): Promise<string | null> {
  const { data: settings } = await admin
    .from('agent_settings')
    .select('clinty_api_key_id')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (typeof settings?.clinty_api_key_id === 'string' && settings.clinty_api_key_id) {
    const { data: keyRow } = await admin
      .from('api_keys')
      .select('key_secret')
      .eq('id', settings.clinty_api_key_id)
      .eq('user_id', userId)
      .is('revoked_at', null)
      .maybeSingle()

    const linked = typeof keyRow?.key_secret === 'string' ? keyRow.key_secret.trim() : ''
    if (linked) return linked
  }

  const { data } = await admin
    .from('api_keys')
    .select('key_secret')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .not('key_secret', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const key = typeof data?.key_secret === 'string' ? data.key_secret.trim() : ''
  return key || null
}

function normalizeBaseUrl(raw: unknown): string {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) return ''

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    const url = new URL(withProtocol)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return ''
    return `${url.protocol}//${url.host}${url.pathname.replace(/\/$/, '')}`
  } catch {
    return ''
  }
}

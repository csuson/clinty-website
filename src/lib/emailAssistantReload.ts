import { supabase } from './supabase'

export function normalizeAssistantBaseUrl(raw: unknown): string {
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

async function resolveAssistantApiKeyForUser(
  userId: string,
  linkedKeyId: string | null | undefined,
): Promise<string | null> {
  if (!supabase) return null

  if (typeof linkedKeyId === 'string' && linkedKeyId) {
    const { data: linked } = await supabase
      .from('api_keys')
      .select('key_secret')
      .eq('id', linkedKeyId)
      .eq('user_id', userId)
      .is('revoked_at', null)
      .maybeSingle()

    const secret = typeof linked?.key_secret === 'string' ? linked.key_secret.trim() : ''
    if (secret) return secret
  }

  const { data: latest } = await supabase
    .from('api_keys')
    .select('key_secret')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .not('key_secret', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const key = typeof latest?.key_secret === 'string' ? latest.key_secret.trim() : ''
  return key || null
}

export async function fetchUserAssistantRuntime(userId: string): Promise<{
  assistantUrl: string | null
  apiKey: string | null
  detail?: string
}> {
  if (!supabase) {
    return { assistantUrl: null, apiKey: null, detail: 'Supabase is not configured.' }
  }

  const { data: settings, error: settingsError } = await supabase
    .from('agent_settings')
    .select('url, clinty_api_key_id')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (settingsError) {
    return { assistantUrl: null, apiKey: null, detail: settingsError.message }
  }

  const assistantUrl = normalizeAssistantBaseUrl(settings?.url)
  if (!assistantUrl) {
    return {
      assistantUrl: null,
      apiKey: null,
      detail: 'Set the LangGraph URL in Admin → Agent Settings.',
    }
  }

  const apiKey = await resolveAssistantApiKeyForUser(userId, settings?.clinty_api_key_id)
  if (!apiKey) {
    return {
      assistantUrl,
      apiKey: null,
      detail: 'No Clinty API key is linked for this account.',
    }
  }

  return { assistantUrl, apiKey }
}

export async function postAssistantRuntimeReload(
  assistantUrl: string,
  apiKey: string,
  payload: Record<string, unknown> = {},
): Promise<{ ok: boolean; detail?: string }> {
  try {
    await fetch(`${assistantUrl}/ok`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    })
  } catch {
    // Wake can fail on a cold start; still try reload.
  }

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
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { detail?: string; error?: string }
      return {
        ok: false,
        detail: body.detail ?? body.error ?? `Assistant returned ${response.status}`,
      }
    }
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error ? err.message : `Could not reach ${assistantUrl}`,
    }
  }
}

export async function reloadUserEmailAssistant(
  userId: string,
  payload: Record<string, unknown> = {},
): Promise<{ assistantReloaded: boolean; assistantReloadError?: string }> {
  const runtime = await fetchUserAssistantRuntime(userId)
  if (!runtime.assistantUrl || !runtime.apiKey) {
    return {
      assistantReloaded: false,
      assistantReloadError: runtime.detail ?? 'Assistant runtime is not configured.',
    }
  }

  const result = await postAssistantRuntimeReload(runtime.assistantUrl, runtime.apiKey, payload)
  return {
    assistantReloaded: result.ok,
    assistantReloadError: result.ok ? undefined : result.detail,
  }
}

export async function fetchWebsiteTextViaAssistant(
  userId: string,
  targetUrl: string,
): Promise<{ ok: boolean; websiteText?: string; detail?: string }> {
  const runtime = await fetchUserAssistantRuntime(userId)
  if (!runtime.assistantUrl || !runtime.apiKey) {
    return { ok: false, detail: runtime.detail }
  }

  try {
    const response = await fetch(`${runtime.assistantUrl}/runtime/fetch-website`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${runtime.apiKey}`,
        'X-Clinty-Api-Key': runtime.apiKey,
        'X-Api-Key': runtime.apiKey,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: targetUrl }),
    })

    if (response.status === 404) {
      return { ok: false, detail: 'Assistant website fetch is not available on this deployment.' }
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { detail?: string; error?: string }
      return {
        ok: false,
        detail: body.detail ?? body.error ?? `Assistant returned ${response.status}`,
      }
    }

    const data = await response.json().catch(() => ({})) as { website_text?: unknown }
    const websiteText = typeof data.website_text === 'string' ? data.website_text.trim() : ''
    if (!websiteText) {
      return { ok: false, detail: 'Assistant returned no website text.' }
    }

    return { ok: true, websiteText }
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error ? err.message : `Could not reach ${runtime.assistantUrl}`,
    }
  }
}

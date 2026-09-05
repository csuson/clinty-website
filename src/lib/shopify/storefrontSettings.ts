import { supabase } from '../supabase'
import { getFunctionErrorMessage } from '../supabaseFunctions'

export type ShopifyStorefrontSaveResult = {
  shopDomain: string
  assistantUrl?: string | null
  assistantReloaded: boolean
  assistantReloadError?: string
}

export async function saveShopifyStorefront(input: {
  shopDomain: string
  storefrontToken: string
  tokenType?: 'public' | 'private'
}): Promise<ShopifyStorefrontSaveResult> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('shopify-storefront-token', {
    body: {
      shop_domain: input.shopDomain,
      storefront_token: input.storefrontToken,
      token_type: input.tokenType ?? 'public',
    },
  })

  const data = result.data as {
    error?: string
    success?: boolean
    shop_domain?: string
    assistant_url?: string | null
    assistant_reloaded?: boolean
    assistant_reload_error?: string
  } | null
  if (result.error || data?.error) {
    throw new Error(await getFunctionErrorMessage(result.error, data))
  }

  const browserReload = await pingEmailAssistantFromBrowser(data?.assistant_url, {
    shopify_store_domain: input.shopDomain,
    shopify_storefront_token: input.storefrontToken,
    shopify_token_type: input.tokenType ?? 'public',
  })

  return {
    shopDomain: data?.shop_domain ?? input.shopDomain,
    assistantUrl: data?.assistant_url,
    assistantReloaded: Boolean(data?.assistant_reloaded) || browserReload.ok,
    assistantReloadError: data?.assistant_reloaded || browserReload.ok
      ? undefined
      : browserReload.detail ?? data?.assistant_reload_error,
  }
}

export function resolveBrowserAssistantUrl(fromServer?: string | null): string | null {
  const url = fromServer?.trim().replace(/\/$/, '')
  return url || null
}

export async function pingEmailAssistantFromBrowser(
  fromServer?: string | null,
  payload: Record<string, string | boolean> = {},
): Promise<{ ok: boolean; detail?: string }> {
  const assistantUrl = resolveBrowserAssistantUrl(fromServer)
  if (!assistantUrl) {
    return { ok: false, detail: 'Set the LangGraph URL in Admin → Agent Settings.' }
  }

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

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export type WebsiteInfrastructure = {
  whatsapp_web_gateway_url: string
  whatsapp_web_login_api_key: string
  whatsapp_web_debug: string
  whatsapp_web_auth_backend: string
  whatsapp_web_auth_bucket: string
  whatsapp_web_auth_storage_prefix: string
  whatsapp_web_auth_dir: string
  whatsapp_web_langgraph_url: string
  google_client_id: string
  google_client_secret: string
}

export type WebsiteSettings = WebsiteInfrastructure & {
  supabase_url: string
  supabase_anon_key: string
  supabase_service_role: string
  openai_api_key: string
}

type WebsiteInfrastructureRow = {
  whatsapp_web_gateway_url?: string | null
  whatsapp_web_login_api_key?: string | null
  whatsapp_web_debug?: string | null
  whatsapp_web_auth_backend?: string | null
  whatsapp_web_auth_bucket?: string | null
  whatsapp_web_auth_storage_prefix?: string | null
  whatsapp_web_auth_dir?: string | null
  whatsapp_web_langgraph_url?: string | null
  google_client_id?: string | null
  google_client_secret?: string | null
}

function trim(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function loadWebsiteSettingsFromEdgeEnv(): WebsiteSettings {
  return {
    supabase_url: Deno.env.get('SUPABASE_URL') ?? '',
    supabase_anon_key: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    supabase_service_role: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    openai_api_key: Deno.env.get('OPENAI_API_KEY') ?? '',
    whatsapp_web_gateway_url: (Deno.env.get('WHATSAPP_WEB_GATEWAY_URL') ?? '').replace(/\/$/, ''),
    whatsapp_web_login_api_key:
      Deno.env.get('WHATSAPP_WEB_LOGIN_API_KEY') ??
      Deno.env.get('CLINTY_API_KEY') ??
      '',
    whatsapp_web_debug: Deno.env.get('WHATSAPP_WEB_DEBUG') ?? '1',
    whatsapp_web_auth_backend: Deno.env.get('WHATSAPP_WEB_AUTH_BACKEND') ?? 'supabase',
    whatsapp_web_auth_bucket: Deno.env.get('WHATSAPP_WEB_AUTH_BUCKET') ?? 'whatsapp-web-auth',
    whatsapp_web_auth_storage_prefix: Deno.env.get('WHATSAPP_WEB_AUTH_STORAGE_PREFIX') ?? 'default',
    whatsapp_web_auth_dir: Deno.env.get('WHATSAPP_WEB_AUTH_DIR') ?? '/tmp/whatsapp-web-auth',
    whatsapp_web_langgraph_url: (Deno.env.get('WHATSAPP_WEB_LANGGRAPH_URL') ?? '').replace(/\/$/, ''),
    google_client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
    google_client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
  }
}

function mergeInfrastructure(
  fromEnv: WebsiteInfrastructure,
  row: WebsiteInfrastructureRow | null | undefined,
): WebsiteInfrastructure {
  if (!row) return fromEnv

  return {
    whatsapp_web_gateway_url:
      trim(row.whatsapp_web_gateway_url).replace(/\/$/, '') || fromEnv.whatsapp_web_gateway_url,
    whatsapp_web_login_api_key:
      trim(row.whatsapp_web_login_api_key) || fromEnv.whatsapp_web_login_api_key,
    whatsapp_web_debug: trim(row.whatsapp_web_debug) || fromEnv.whatsapp_web_debug,
    whatsapp_web_auth_backend: trim(row.whatsapp_web_auth_backend) || fromEnv.whatsapp_web_auth_backend,
    whatsapp_web_auth_bucket: trim(row.whatsapp_web_auth_bucket) || fromEnv.whatsapp_web_auth_bucket,
    whatsapp_web_auth_storage_prefix:
      trim(row.whatsapp_web_auth_storage_prefix) || fromEnv.whatsapp_web_auth_storage_prefix,
    whatsapp_web_auth_dir: trim(row.whatsapp_web_auth_dir) || fromEnv.whatsapp_web_auth_dir,
    whatsapp_web_langgraph_url:
      trim(row.whatsapp_web_langgraph_url).replace(/\/$/, '') || fromEnv.whatsapp_web_langgraph_url,
    google_client_id: trim(row.google_client_id) || fromEnv.google_client_id,
    google_client_secret: trim(row.google_client_secret) || fromEnv.google_client_secret,
  }
}

export async function loadWebsiteSettings(
  admin: SupabaseClient,
): Promise<WebsiteSettings> {
  const fromEnv = loadWebsiteSettingsFromEdgeEnv()
  const { data } = await admin
    .from('website_infrastructure')
    .select(
      'whatsapp_web_gateway_url, whatsapp_web_login_api_key, whatsapp_web_debug, whatsapp_web_auth_backend, whatsapp_web_auth_bucket, whatsapp_web_auth_storage_prefix, whatsapp_web_auth_dir, whatsapp_web_langgraph_url, google_client_id, google_client_secret',
    )
    .eq('id', 1)
    .maybeSingle()

  const infrastructure = mergeInfrastructure(fromEnv, data)
  return {
    supabase_url: fromEnv.supabase_url,
    supabase_anon_key: fromEnv.supabase_anon_key,
    supabase_service_role: fromEnv.supabase_service_role,
    openai_api_key: fromEnv.openai_api_key,
    ...infrastructure,
  }
}

export async function saveWebsiteInfrastructure(
  admin: SupabaseClient,
  input: Partial<WebsiteInfrastructure> & {
    whatsapp_web_login_api_key?: string | null
    google_client_secret?: string | null
  },
  options?: { keepExistingApiKey?: boolean; keepExistingGoogleSecret?: boolean },
): Promise<WebsiteInfrastructure> {
  const current = await loadWebsiteSettings(admin)
  const next: WebsiteInfrastructure = {
    whatsapp_web_gateway_url:
      input.whatsapp_web_gateway_url !== undefined
        ? trim(input.whatsapp_web_gateway_url).replace(/\/$/, '')
        : current.whatsapp_web_gateway_url,
    whatsapp_web_login_api_key: current.whatsapp_web_login_api_key,
    whatsapp_web_debug:
      input.whatsapp_web_debug !== undefined
        ? trim(input.whatsapp_web_debug) || '1'
        : current.whatsapp_web_debug,
    whatsapp_web_auth_backend:
      input.whatsapp_web_auth_backend !== undefined
        ? trim(input.whatsapp_web_auth_backend) || 'supabase'
        : current.whatsapp_web_auth_backend,
    whatsapp_web_auth_bucket:
      input.whatsapp_web_auth_bucket !== undefined
        ? trim(input.whatsapp_web_auth_bucket) || 'whatsapp-web-auth'
        : current.whatsapp_web_auth_bucket,
    whatsapp_web_auth_storage_prefix:
      input.whatsapp_web_auth_storage_prefix !== undefined
        ? trim(input.whatsapp_web_auth_storage_prefix) || 'default'
        : current.whatsapp_web_auth_storage_prefix,
    whatsapp_web_auth_dir:
      input.whatsapp_web_auth_dir !== undefined
        ? trim(input.whatsapp_web_auth_dir) || '/tmp/whatsapp-web-auth'
        : current.whatsapp_web_auth_dir,
    whatsapp_web_langgraph_url:
      input.whatsapp_web_langgraph_url !== undefined
        ? trim(input.whatsapp_web_langgraph_url).replace(/\/$/, '')
        : current.whatsapp_web_langgraph_url,
    google_client_id:
      input.google_client_id !== undefined
        ? trim(input.google_client_id)
        : current.google_client_id,
    google_client_secret: current.google_client_secret,
  }

  if (input.whatsapp_web_login_api_key !== undefined && !options?.keepExistingApiKey) {
    next.whatsapp_web_login_api_key = trim(input.whatsapp_web_login_api_key)
  }

  if (input.google_client_secret !== undefined && !options?.keepExistingGoogleSecret) {
    next.google_client_secret = trim(input.google_client_secret)
  }

  const { error } = await admin.from('website_infrastructure').upsert({
    id: 1,
    ...next,
    updated_at: new Date().toISOString(),
  })

  if (error) {
    throw new Error(error.message)
  }

  return next
}

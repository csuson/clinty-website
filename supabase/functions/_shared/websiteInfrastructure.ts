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
  booking_recovery_gateway_url: string
  booking_recovery_google_gateway_url: string
  booking_recovery_apps_script_web_app_url: string
  booking_recovery_apps_script_connect_secret: string
  google_client_id: string
  google_client_secret: string
  wix_app_id: string
  wix_app_secret: string
  wix_webhook_public_key: string
  wix_app_install_url: string
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
  booking_recovery_gateway_url?: string | null
  booking_recovery_google_gateway_url?: string | null
  booking_recovery_apps_script_web_app_url?: string | null
  booking_recovery_apps_script_connect_secret?: string | null
  google_client_id?: string | null
  google_client_secret?: string | null
  wix_app_id?: string | null
  wix_app_secret?: string | null
  wix_webhook_public_key?: string | null
  wix_app_install_url?: string | null
}

const INFRASTRUCTURE_SELECT =
  'whatsapp_web_gateway_url, whatsapp_web_login_api_key, whatsapp_web_debug, whatsapp_web_auth_backend, whatsapp_web_auth_bucket, whatsapp_web_auth_storage_prefix, whatsapp_web_auth_dir, whatsapp_web_langgraph_url, booking_recovery_gateway_url, booking_recovery_google_gateway_url, booking_recovery_apps_script_web_app_url, booking_recovery_apps_script_connect_secret, google_client_id, google_client_secret, wix_app_id, wix_app_secret, wix_webhook_public_key, wix_app_install_url'

function trim(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** Keep Apps Script /exec URLs free of multi-login /u/N/ segments and pasted query strings. */
function normalizeAppsScriptWebAppUrl(value: unknown): string {
  let url = trim(value)
  if (!url) return ''
  const q = url.indexOf('?')
  if (q >= 0) url = url.slice(0, q)
  const h = url.indexOf('#')
  if (h >= 0) url = url.slice(0, h)
  url = url.replace(/\/$/, '')
  url = url.replace(/\/macros\/u\/\d+\//i, '/macros/')
  return url
}

/** Published Clinty Cancel Booking Recovery share install link (App Market). */
export const CLINTY_WIX_APP_SHARE_URL = 'https://wix.to/9PIMeWM'

/**
 * App ID for Clinty Cancel Booking Recovery.
 * Verified: https://wix.to/9PIMeWM → /app-market/install/1f88c5af-e254-44fb-917f-49bed77b8632
 */
export const CLINTY_WIX_APP_ID = '1f88c5af-e254-44fb-917f-49bed77b8632'

/**
 * Stable App Market install page (same destination as the share link).
 * Do not use /installer/install or /app-installer — those fail for this unlisted app.
 */
export function buildDefaultWixInstallUrl(_appId?: string | null): string {
  return `https://www.wix.com/app-market/install/${CLINTY_WIX_APP_ID}`
}

/** Resolve install URL for the shared Clinty Wix app (published market listing). */
export function resolveWixAppInstallUrl(settings: {
  wix_app_id?: string | null
  wix_app_install_url?: string | null
}): string {
  const custom = trim(settings.wix_app_install_url)
  // Ignore legacy constructed installer URLs — they return "couldn't find an app"
  // or "couldn't load installation data" for this unlisted share-link app.
  if (
    custom
    && !/\/installer\/install/i.test(custom)
    && !/app-installer/i.test(custom)
    && !/wix\.to\//i.test(custom)
    && !/app-market\/install/i.test(custom)
  ) {
    return custom
  }
  return buildDefaultWixInstallUrl(settings.wix_app_id || CLINTY_WIX_APP_ID)
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
    booking_recovery_gateway_url: (Deno.env.get('BOOKING_RECOVERY_GATEWAY_URL') ?? '').replace(/\/$/, ''),
    booking_recovery_google_gateway_url: (
      Deno.env.get('BOOKING_RECOVERY_GOOGLE_GATEWAY_URL') ?? ''
    ).replace(/\/$/, ''),
    booking_recovery_apps_script_web_app_url: (
      Deno.env.get('BOOKING_RECOVERY_APPS_SCRIPT_WEB_APP_URL') ?? ''
    ).replace(/\/$/, ''),
    booking_recovery_apps_script_connect_secret:
      Deno.env.get('BOOKING_RECOVERY_APPS_SCRIPT_CONNECT_SECRET') ?? '',
    google_client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
    google_client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
    wix_app_id: Deno.env.get('WIX_APP_ID') ?? '',
    wix_app_secret: Deno.env.get('WIX_APP_SECRET') ?? '',
    wix_webhook_public_key: Deno.env.get('WIX_WEBHOOK_PUBLIC_KEY') ?? '',
    wix_app_install_url: Deno.env.get('WIX_APP_INSTALL_URL') ?? '',
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
    booking_recovery_gateway_url:
      trim(row.booking_recovery_gateway_url).replace(/\/$/, '') || fromEnv.booking_recovery_gateway_url,
    booking_recovery_google_gateway_url:
      trim(row.booking_recovery_google_gateway_url).replace(/\/$/, '') ||
      fromEnv.booking_recovery_google_gateway_url,
    booking_recovery_apps_script_web_app_url:
      normalizeAppsScriptWebAppUrl(row.booking_recovery_apps_script_web_app_url) ||
      normalizeAppsScriptWebAppUrl(fromEnv.booking_recovery_apps_script_web_app_url),
    booking_recovery_apps_script_connect_secret:
      trim(row.booking_recovery_apps_script_connect_secret) ||
      fromEnv.booking_recovery_apps_script_connect_secret,
    google_client_id: trim(row.google_client_id) || fromEnv.google_client_id,
    google_client_secret: trim(row.google_client_secret) || fromEnv.google_client_secret,
    wix_app_id: trim(row.wix_app_id) || fromEnv.wix_app_id,
    wix_app_secret: trim(row.wix_app_secret) || fromEnv.wix_app_secret,
    wix_webhook_public_key: trim(row.wix_webhook_public_key) || fromEnv.wix_webhook_public_key,
    wix_app_install_url: trim(row.wix_app_install_url) || fromEnv.wix_app_install_url,
  }
}

export async function loadWebsiteSettings(
  admin: SupabaseClient,
): Promise<WebsiteSettings> {
  const fromEnv = loadWebsiteSettingsFromEdgeEnv()
  const { data } = await admin
    .from('website_infrastructure')
    .select(INFRASTRUCTURE_SELECT)
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
    booking_recovery_apps_script_connect_secret?: string | null
    wix_app_secret?: string | null
    wix_webhook_public_key?: string | null
  },
  options?: {
    keepExistingApiKey?: boolean
    keepExistingGoogleSecret?: boolean
    keepExistingAppsScriptConnectSecret?: boolean
    keepExistingWixAppSecret?: boolean
    keepExistingWixWebhookPublicKey?: boolean
  },
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
    booking_recovery_gateway_url:
      input.booking_recovery_gateway_url !== undefined
        ? trim(input.booking_recovery_gateway_url).replace(/\/$/, '')
        : current.booking_recovery_gateway_url,
    booking_recovery_google_gateway_url:
      input.booking_recovery_google_gateway_url !== undefined
        ? trim(input.booking_recovery_google_gateway_url).replace(/\/$/, '')
        : current.booking_recovery_google_gateway_url,
    booking_recovery_apps_script_web_app_url:
      input.booking_recovery_apps_script_web_app_url !== undefined
        ? normalizeAppsScriptWebAppUrl(input.booking_recovery_apps_script_web_app_url)
        : current.booking_recovery_apps_script_web_app_url,
    booking_recovery_apps_script_connect_secret: current.booking_recovery_apps_script_connect_secret,
    google_client_id:
      input.google_client_id !== undefined
        ? trim(input.google_client_id)
        : current.google_client_id,
    google_client_secret: current.google_client_secret,
    wix_app_id: input.wix_app_id !== undefined ? trim(input.wix_app_id) : current.wix_app_id,
    wix_app_secret: current.wix_app_secret,
    wix_webhook_public_key: current.wix_webhook_public_key,
    wix_app_install_url:
      input.wix_app_install_url !== undefined
        ? trim(input.wix_app_install_url)
        : current.wix_app_install_url,
  }

  if (input.whatsapp_web_login_api_key !== undefined && !options?.keepExistingApiKey) {
    next.whatsapp_web_login_api_key = trim(input.whatsapp_web_login_api_key)
  }

  if (input.google_client_secret !== undefined && !options?.keepExistingGoogleSecret) {
    next.google_client_secret = trim(input.google_client_secret)
  }

  if (
    input.booking_recovery_apps_script_connect_secret !== undefined &&
    !options?.keepExistingAppsScriptConnectSecret
  ) {
    next.booking_recovery_apps_script_connect_secret = trim(
      input.booking_recovery_apps_script_connect_secret,
    )
  }

  if (input.wix_app_secret !== undefined && !options?.keepExistingWixAppSecret) {
    next.wix_app_secret = trim(input.wix_app_secret)
  }

  if (input.wix_webhook_public_key !== undefined && !options?.keepExistingWixWebhookPublicKey) {
    next.wix_webhook_public_key = trim(input.wix_webhook_public_key)
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

/** Strip Wix / Apps Script secrets from admin browser responses; expose presence flags only. */
export function sanitizeWebsiteSettingsForAdmin(settings: WebsiteSettings) {
  return {
    ...settings,
    booking_recovery_apps_script_connect_secret: '',
    has_booking_recovery_apps_script_connect_secret: Boolean(
      trim(settings.booking_recovery_apps_script_connect_secret),
    ),
    wix_app_secret: '',
    has_wix_app_secret: Boolean(trim(settings.wix_app_secret)),
    wix_webhook_public_key: '',
    has_wix_webhook_public_key: Boolean(trim(settings.wix_webhook_public_key)),
  }
}

/** Public-safe view of website Wix app settings (no secrets). */
export function publicWixAppView(settings: WebsiteSettings): {
  /** App ID + secret present (OAuth calendar path can use platform credentials). */
  wix_app_configured: boolean
  /** Install link or App ID available (tenant can run Install flow). */
  wix_install_available: boolean
  wix_app_id: string | null
  wix_app_install_url: string | null
  has_wix_webhook_public_key: boolean
} {
  const appId = trim(settings.wix_app_id)
  const installUrl = resolveWixAppInstallUrl(settings)
  return {
    wix_app_configured: Boolean(appId && trim(settings.wix_app_secret)),
    wix_install_available: Boolean(installUrl || appId),
    wix_app_id: appId || null,
    wix_app_install_url: installUrl || null,
    has_wix_webhook_public_key: Boolean(trim(settings.wix_webhook_public_key)),
  }
}

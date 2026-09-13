import type { WebsiteInfrastructure } from './websiteInfrastructure.ts'

export type WhatsAppConnectionInfraRow = {
  gateway_url?: string | null
  gateway_api_key?: string | null
  gateway_debug?: string | null
  gateway_auth_backend?: string | null
  gateway_auth_bucket?: string | null
  gateway_auth_storage_prefix?: string | null
  gateway_auth_dir?: string | null
  gateway_langgraph_url?: string | null
  phone?: string | null
  status?: string | null
  connected_at?: string | null
  last_error?: string | null
}

export type ResolvedWhatsAppInfrastructure = {
  gatewayUrl: string
  gatewayApiKey: string
  debug: string
  authBackend: string
  authBucket: string
  authStoragePrefix: string
  authDir: string
  langgraphUrl: string
}

export type WhatsAppInfrastructureInput = {
  gateway_url?: string | null
  gateway_api_key?: string | null
  gateway_debug?: string | null
  gateway_auth_backend?: string | null
  gateway_auth_bucket?: string | null
  gateway_auth_storage_prefix?: string | null
  gateway_auth_dir?: string | null
  gateway_langgraph_url?: string | null
}

function trim(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/$/, '')
}

function emptyToNull(value: unknown): string | null {
  if (value === undefined || value === null) return null
  const trimmed = String(value).trim()
  return trimmed.length > 0 ? trimmed : null
}

export function resolveWhatsAppInfrastructure(
  row: WhatsAppConnectionInfraRow | null | undefined,
  websiteSettings: WebsiteInfrastructure,
  options?: { postgresSchema?: string | null; defaultApiKey?: string | null },
): ResolvedWhatsAppInfrastructure {
  const gatewayUrl = (trim(row?.gateway_url) || trim(websiteSettings.whatsapp_web_gateway_url)).replace(/\/$/, '')
  const storedGatewayKey = trim(row?.gateway_api_key)
  const gatewayApiKey =
    storedGatewayKey ||
    trim(options?.defaultApiKey) ||
    trim(websiteSettings.whatsapp_web_login_api_key)
  const authStoragePrefix =
    trim(row?.gateway_auth_storage_prefix) ||
    trim(options?.postgresSchema) ||
    trim(websiteSettings.whatsapp_web_auth_storage_prefix) ||
    'default'

  return {
    gatewayUrl,
    gatewayApiKey,
    debug: trim(row?.gateway_debug) || trim(websiteSettings.whatsapp_web_debug) || '1',
    authBackend:
      trim(row?.gateway_auth_backend) || trim(websiteSettings.whatsapp_web_auth_backend) || 'supabase',
    authBucket:
      trim(row?.gateway_auth_bucket) || trim(websiteSettings.whatsapp_web_auth_bucket) || 'whatsapp-web-auth',
    authStoragePrefix,
    authDir:
      trim(row?.gateway_auth_dir) || trim(websiteSettings.whatsapp_web_auth_dir) || '/tmp/whatsapp-web-auth',
    langgraphUrl:
      normalizeBaseUrl(
        trim(row?.gateway_langgraph_url) || trim(websiteSettings.whatsapp_web_langgraph_url),
      ),
  }
}

export function buildWhatsAppInfrastructureUpsert(
  userId: string,
  input: WhatsAppInfrastructureInput,
  existing: WhatsAppConnectionInfraRow | null | undefined,
  options?: { keepExistingApiKey?: boolean },
): Record<string, unknown> {
  const keepExistingApiKey = options?.keepExistingApiKey ?? false
  const apiKeyInput = emptyToNull(input.gateway_api_key)
  let gatewayApiKey = existing?.gateway_api_key ?? null

  if (input.gateway_api_key !== undefined && !(keepExistingApiKey && apiKeyInput === null)) {
    gatewayApiKey = apiKeyInput
  }

  return {
    user_id: userId,
    gateway_url:
      input.gateway_url !== undefined ? emptyToNull(input.gateway_url) : (existing?.gateway_url ?? null),
    gateway_api_key: gatewayApiKey,
    gateway_debug:
      input.gateway_debug !== undefined ? emptyToNull(input.gateway_debug) : (existing?.gateway_debug ?? null),
    gateway_auth_backend:
      input.gateway_auth_backend !== undefined
        ? emptyToNull(input.gateway_auth_backend)
        : (existing?.gateway_auth_backend ?? null),
    gateway_auth_bucket:
      input.gateway_auth_bucket !== undefined
        ? emptyToNull(input.gateway_auth_bucket)
        : (existing?.gateway_auth_bucket ?? null),
    gateway_auth_storage_prefix:
      input.gateway_auth_storage_prefix !== undefined
        ? emptyToNull(input.gateway_auth_storage_prefix)
        : (existing?.gateway_auth_storage_prefix ?? null),
    gateway_auth_dir:
      input.gateway_auth_dir !== undefined ? emptyToNull(input.gateway_auth_dir) : (existing?.gateway_auth_dir ?? null),
    gateway_langgraph_url:
      input.gateway_langgraph_url !== undefined
        ? emptyToNull(input.gateway_langgraph_url)
        : (existing?.gateway_langgraph_url ?? null),
    phone: existing?.phone ?? null,
    status: existing?.status ?? 'disconnected',
    connected_at: existing?.connected_at ?? new Date().toISOString(),
    last_error: existing?.last_error ?? null,
  }
}

export const WHATSAPP_INFRA_SELECT =
  'gateway_url, gateway_api_key, gateway_debug, gateway_auth_backend, gateway_auth_bucket, gateway_auth_storage_prefix, gateway_auth_dir, gateway_langgraph_url, phone, status, connected_at, last_error'

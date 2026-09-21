import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

function trim(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

type GoogleOAuthRow = {
  google_client_id?: string | null
  google_client_secret?: string | null
}

export type GoogleOAuthClient = {
  clientId: string
  clientSecret: string
  source: 'database' | 'edge_secret' | 'none'
}

/** OAuth desktop client JSON shape (matches email_assistant .secrets/secrets.json). */
export function googleClientSecretJson(
  clientId: string,
  clientSecret: string,
  projectId = '',
): string {
  return JSON.stringify({
    installed: {
      client_id: clientId,
      project_id: projectId,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_secret: clientSecret,
      redirect_uris: ['http://localhost'],
    },
  })
}

export function parseGoogleOAuthSecretsJson(raw: string): {
  clientId: string
  clientSecret: string
  projectId: string
} | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null
  const record = parsed as Record<string, unknown>
  const block =
    (record.installed && typeof record.installed === 'object'
      ? (record.installed as Record<string, unknown>)
      : null) ??
    (record.web && typeof record.web === 'object' ? (record.web as Record<string, unknown>) : null) ??
    record
  const clientId = typeof block.client_id === 'string' ? block.client_id.trim() : ''
  const clientSecret = typeof block.client_secret === 'string' ? block.client_secret.trim() : ''
  const projectId = typeof block.project_id === 'string' ? block.project_id.trim() : ''
  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret, projectId }
}

export async function loadGoogleOAuthFromInfrastructure(
  admin: SupabaseClient,
): Promise<GoogleOAuthRow | null> {
  const { data, error } = await admin
    .from('website_infrastructure')
    .select('google_client_id, google_client_secret')
    .eq('id', 1)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  return data
}

export async function resolveGoogleOAuthClient(
  admin: SupabaseClient,
  requestClientId?: string,
): Promise<GoogleOAuthClient> {
  const row = await loadGoogleOAuthFromInfrastructure(admin)
  const dbId = trim(row?.google_client_id)
  const dbSecret = trim(row?.google_client_secret)
  const envId = trim(Deno.env.get('GOOGLE_CLIENT_ID'))
  const envSecret = trim(Deno.env.get('GOOGLE_CLIENT_SECRET'))

  const clientId = dbId || envId || trim(requestClientId)
  const clientSecret = dbSecret || envSecret

  let source: GoogleOAuthClient['source'] = 'none'
  if (dbId && dbSecret) {
    source = 'database'
  } else if (envId && envSecret) {
    source = 'edge_secret'
  } else if (dbSecret || envSecret) {
    source = dbSecret ? 'database' : 'edge_secret'
  }

  return { clientId, clientSecret, source }
}

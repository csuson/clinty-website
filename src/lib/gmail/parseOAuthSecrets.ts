/** Parse Google OAuth JSON (Desktop `installed` or Web `web` client download). */

export type ParsedGoogleOAuthSecrets = {
  clientId: string
  clientSecret: string
  projectId: string
}

export function parseGoogleOAuthSecretsJson(raw: string): ParsedGoogleOAuthSecrets | null {
  const trimmed = raw.trim()
  if (!trimmed) {
    return null
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return null
  }

  if (!parsed || typeof parsed !== 'object') {
    return null
  }

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

  if (!clientId || !clientSecret) {
    return null
  }

  return { clientId, clientSecret, projectId }
}

/** Same shape as email_assistant `GMAIL_SECRET` / `.secrets/secrets.json`. */
export function buildGmailSecretInstalledJson(
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

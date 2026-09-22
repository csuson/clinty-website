/** Shared CORS for Edge Functions — CASA 3.1.5 / least privilege for browser origins. */

const DEFAULT_ALLOWED_ORIGINS = [
  'https://clinty.net',
  'https://www.clinty.net',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]

function parseExtraOrigins(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean)
}

export function allowedCorsOrigins(): string[] {
  const fromEnv = parseExtraOrigins(Deno.env.get('CORS_ALLOWED_ORIGINS'))
  return [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...fromEnv])]
}

export function isAllowedCorsOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false
  return allowedCorsOrigins().includes(origin.trim().replace(/\/$/, ''))
}

export type CorsOptions = {
  methods?: string
  allowHeaders?: string
}

const DEFAULT_ALLOW_HEADERS =
  'authorization, x-client-info, apikey, content-type, x-clinty-api-key, x-shopify-hmac-sha256, x-shopify-topic, x-shopify-shop-domain'

/**
 * Build CORS headers for a request.
 * - Browser Origin present + allowlisted → reflect Origin
 * - No Origin (server-to-server / curl) → omit ACAO (not a browser CORS request)
 * - Browser Origin present + not allowlisted → omit ACAO (browser will block)
 */
export function getCorsHeaders(req: Request, options: CorsOptions = {}): Record<string, string> {
  const origin = req.headers.get('Origin')?.trim() ?? ''
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': options.allowHeaders ?? DEFAULT_ALLOW_HEADERS,
    'Access-Control-Allow-Methods': options.methods ?? 'GET, POST, PUT, OPTIONS',
    Vary: 'Origin',
  }

  if (origin && isAllowedCorsOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }

  return headers
}

export function corsPreflightResponse(req: Request, options: CorsOptions = {}): Response {
  const origin = req.headers.get('Origin')?.trim() ?? ''
  if (origin && !isAllowedCorsOrigin(origin)) {
    return new Response('CORS origin not allowed', {
      status: 403,
      headers: { Vary: 'Origin' },
    })
  }
  return new Response('ok', { headers: getCorsHeaders(req, options) })
}

export function jsonWithCors(
  req: Request,
  body: Record<string, unknown> | unknown,
  status = 200,
  options: CorsOptions = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req, options),
      'Content-Type': 'application/json',
    },
  })
}

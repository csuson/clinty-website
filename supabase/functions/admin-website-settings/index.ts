import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  loadWebsiteSettings,
  loadWebsiteSettingsFromEdgeEnv,
  saveWebsiteInfrastructure,
} from '../_shared/websiteInfrastructure.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function parseAdminEmails(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  )
}

function emptyToNull(value: unknown): string | null {
  if (value === undefined || value === null) return null
  const trimmed = String(value).trim()
  return trimmed.length > 0 ? trimmed : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Missing authorization header' }, 401)
    }

    const adminEmails = parseAdminEmails(Deno.env.get('ADMIN_EMAILS'))
    if (adminEmails.size === 0) {
      return json({ error: 'Admin access is not configured. Set ADMIN_EMAILS in Supabase secrets.' }, 503)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, 401)
    }

    if (!user.email || !adminEmails.has(user.email.toLowerCase())) {
      return json({ error: 'Forbidden' }, 403)
    }

    const body = await req.json().catch(() => ({}))
    const action = typeof body.action === 'string' ? body.action : 'get'

    if (action === 'get') {
      const websiteSettings = await loadWebsiteSettings(admin)
      return json({ websiteSettings })
    }

    if (action === 'update') {
      const apiKeyInput = emptyToNull(body.whatsapp_web_login_api_key)
      const keepExistingApiKey =
        apiKeyInput === null &&
        (body.whatsapp_web_login_api_key === undefined ||
          String(body.whatsapp_web_login_api_key).trim() === '')

      await saveWebsiteInfrastructure(
        admin,
        {
          whatsapp_web_gateway_url: emptyToNull(body.whatsapp_web_gateway_url) ?? undefined,
          whatsapp_web_login_api_key: apiKeyInput ?? undefined,
          whatsapp_web_debug: emptyToNull(body.whatsapp_web_debug) ?? undefined,
          whatsapp_web_auth_backend: emptyToNull(body.whatsapp_web_auth_backend) ?? undefined,
          whatsapp_web_auth_bucket: emptyToNull(body.whatsapp_web_auth_bucket) ?? undefined,
          whatsapp_web_auth_storage_prefix:
            emptyToNull(body.whatsapp_web_auth_storage_prefix) ?? undefined,
          whatsapp_web_auth_dir: emptyToNull(body.whatsapp_web_auth_dir) ?? undefined,
        },
        { keepExistingApiKey },
      )

      const websiteSettings = await loadWebsiteSettings(admin)
      return json({ websiteSettings })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

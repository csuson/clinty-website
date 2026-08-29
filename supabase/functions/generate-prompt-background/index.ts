import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_PAGE_BYTES = 2_500_000
const MAX_HTML_PROCESS_CHARS = 900_000
const MAX_PAGES = 8
const MAX_TEXT_CHARS = 28_000
const MIN_USEFUL_TEXT_CHARS = 40

const EXTRA_PATH_PATTERNS = [
  /about/i,
  /price/i,
  /lesson/i,
  /location/i,
  /contact/i,
  /service/i,
  /methodology/i,
  /rental/i,
  /event/i,
  /blog/i,
  /gear/i,
]

const WIX_FALLBACK_PATHS = [
  '/about-us',
  '/about',
  '/lessons-rentals',
  '/lessons',
  '/contact-us',
  '/contact',
  '/teaching-methodology',
  '/events',
]

const GENERATION_SYSTEM_PROMPT = `You write "Business Background" prompt text for an AI customer-service agent.
Use ONLY facts present in the provided website content. Do not invent prices, phone numbers, or policies.
If a detail is missing, omit that line rather than guessing.

Format the output as plain text with these sections when data exists:
- Opening paragraph: who runs the business, location/region, experience, certifications
- Business name, website, phone, email (only if found)
- School/business location with address
- What we offer (bullet list)
- Lesson packages and pricing OR services and pricing (bullet list with durations/prices when available)
- Policies (only if stated on the site)
- Why customers choose us / differentiators (bullet list)
- Response template: a short paragraph the agent can reuse when replying to new customer inquiries

Write in first person when the site is clearly owner-operated (e.g. "I'm Tony..."), otherwise third person.
Keep it concise but complete enough for email and chat replies.`

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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY')?.trim()
    if (!openaiKey) {
      return json({
        error: 'Background generation is not configured. Set OPENAI_API_KEY in Supabase Edge Function secrets.',
      }, 503)
    }

    const body = await req.json().catch(() => ({}))
    const rawUrl = typeof body.url === 'string' ? body.url.trim() : ''
    if (!rawUrl) {
      return json({ error: 'Missing website URL' }, 400)
    }

    const siteUrl = normalizeWebsiteUrl(rawUrl)
    if (!siteUrl) {
      return json({ error: 'Enter a valid website URL (https://example.com)' }, 400)
    }

    if (isBlockedUrl(siteUrl)) {
      return json({ error: 'That URL cannot be fetched for security reasons' }, 400)
    }

    const pages = await collectWebsiteText(siteUrl)
    if (!pages.length) {
      return json({ error: 'Could not read any content from that website' }, 422)
    }

    const combinedText = pages
      .map((page) => `=== ${page.url} ===\n${page.text}`)
      .join('\n\n')
      .slice(0, MAX_TEXT_CHARS)

    const background = await generateBackground(openaiKey, siteUrl.href, combinedText)
    return json({ background })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})

function normalizeWebsiteUrl(raw: string): URL | null {
  try {
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    const url = new URL(withScheme)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    url.hash = ''
    return url
  } catch {
    return null
  }
}

function isBlockedUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase()
  if (
    host === 'localhost' ||
    host.endsWith('.local') ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.internal')
  ) {
    return true
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const parts = host.split('.').map(Number)
    if (parts[0] === 10) return true
    if (parts[0] === 127) return true
    if (parts[0] === 192 && parts[1] === 168) return true
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
    if (parts[0] === 169 && parts[1] === 254) return true
  }

  return false
}

async function collectWebsiteText(startUrl: URL): Promise<Array<{ url: string; text: string }>> {
  const origin = startUrl.origin
  const visited = new Set<string>()
  const queue: string[] = [startUrl.href]
  for (const path of WIX_FALLBACK_PATHS) {
    queue.push(new URL(path, origin).href)
  }
  const pages: Array<{ url: string; text: string }> = []

  while (queue.length > 0 && pages.length < MAX_PAGES) {
    const next = queue.shift()
    if (!next || visited.has(next)) continue
    visited.add(next)

    const html = await fetchHtml(next)
    if (!html) continue

    const text = extractPageText(html)
    if (text.length < MIN_USEFUL_TEXT_CHARS) continue

    pages.push({ url: next, text: text.slice(0, 10_000) })

    if (pages.length <= 2) {
      for (const link of extractSameOriginLinks(html, origin)) {
        if (visited.has(link) || queue.includes(link)) continue
        if (EXTRA_PATH_PATTERNS.some((pattern) => pattern.test(link))) {
          queue.push(link)
        }
      }
    }
  }

  return pages
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; ClintyPromptBot/1.0; +https://clinty.net)',
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(15_000),
      redirect: 'follow',
    })

    if (!response.ok) return null

    const contentType = response.headers.get('content-type') ?? ''
    if (
      contentType &&
      !contentType.includes('text/html') &&
      !contentType.includes('application/xhtml') &&
      !contentType.includes('text/plain')
    ) {
      return null
    }

    const buffer = await response.arrayBuffer()
    if (buffer.byteLength > MAX_PAGE_BYTES) return null

    const html = new TextDecoder('utf-8', { fatal: false }).decode(buffer)
    return html.length > MAX_HTML_PROCESS_CHARS
      ? html.slice(0, MAX_HTML_PROCESS_CHARS)
      : html
  } catch {
    return null
  }
}

function extractPageText(html: string): string {
  const parts: string[] = []

  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
  if (title) parts.push(`Title: ${decodeHtmlEntities(stripTags(title))}`)

  for (const name of ['description', 'keywords']) {
    const match = html.match(
      new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
    ) ?? html.match(
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'),
    )
    if (match?.[1]) parts.push(`${name}: ${decodeHtmlEntities(match[1])}`)
  }

  for (const prop of ['og:title', 'og:description', 'og:site_name']) {
    const match = html.match(
      new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'),
    ) ?? html.match(
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, 'i'),
    )
    if (match?.[1]) parts.push(`${prop}: ${decodeHtmlEntities(match[1])}`)
  }

  for (const block of extractJsonLdBlocks(html)) {
    parts.push(`Structured data: ${block}`)
  }

  const bodyText = htmlToText(html)
  if (bodyText) parts.push(bodyText)

  return parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim()
}

function extractJsonLdBlocks(html: string): string[] {
  const blocks: string[] = []
  const pattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null

  while ((match = pattern.exec(html)) !== null) {
    const raw = match[1].trim()
    if (!raw) continue
    try {
      blocks.push(JSON.stringify(JSON.parse(raw)))
    } catch {
      blocks.push(raw.slice(0, 2000))
    }
  }

  return blocks
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}

function htmlToText(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()

  return text
}

function extractSameOriginLinks(html: string, origin: string): string[] {
  const links = new Set<string>()
  const pattern = /href=["']([^"'#]+)["']/gi
  let match: RegExpExecArray | null

  while ((match = pattern.exec(html)) !== null) {
    try {
      const url = new URL(match[1], origin)
      if (url.origin !== origin) continue
      if (!/^https?:$/i.test(url.protocol)) continue
      url.hash = ''
      links.add(url.href)
    } catch {
      // skip invalid URLs
    }
  }

  return [...links]
}

async function generateBackground(openaiKey: string, siteUrl: string, websiteText: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: GENERATION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Website: ${siteUrl}\n\nExtracted website text:\n${websiteText}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = typeof data?.error?.message === 'string'
      ? data.error.message
      : `OpenAI request failed (${response.status})`
    throw new Error(message)
  }

  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('OpenAI returned an empty background')
  }

  return content.trim()
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

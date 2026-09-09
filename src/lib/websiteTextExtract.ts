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

export function normalizeWebsiteUrl(raw: string): URL | null {
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

export function isLocalOrPrivateWebsiteUrl(url: URL): boolean {
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

export async function collectWebsiteTextFromBrowser(startUrl: URL): Promise<Array<{ url: string; text: string }>> {
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

export function formatWebsiteTextPages(pages: Array<{ url: string; text: string }>): string {
  return pages
    .map((page) => `=== ${page.url} ===\n${page.text}`)
    .join('\n\n')
    .slice(0, MAX_TEXT_CHARS)
}

export async function readWebsiteHtmlFile(file: File): Promise<string> {
  if (file.size > MAX_PAGE_BYTES) {
    throw new Error('That file is too large. Save a single HTML page instead.')
  }
  return file.text()
}

export function buildWebsiteTextFromHtml(html: string, pageUrl: string): string {
  const text = extractPageText(html)
  if (text.length < MIN_USEFUL_TEXT_CHARS) {
    throw new Error('Could not extract enough text from that HTML file.')
  }
  return formatWebsiteTextPages([{ url: pageUrl, text: text.slice(0, 10_000) }])
}

async function fetchHtml(url: string): Promise<string | null> {
  if (import.meta.env.DEV) {
    try {
      const proxyUrl = `/api/local-site-fetch?${new URLSearchParams({ url })}`
      const proxyResponse = await fetch(proxyUrl)
      if (proxyResponse.ok) {
        const html = await proxyResponse.text()
        return html.length > MAX_HTML_PROCESS_CHARS
          ? html.slice(0, MAX_HTML_PROCESS_CHARS)
          : html
      }
    } catch {
      // Fall through to direct browser fetch.
    }
  }

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
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
  const text = html
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

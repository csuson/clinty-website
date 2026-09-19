import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  assertWithinTokenLimit,
  readOpenAiUsage,
  recordAiUsageWithAlerts,
} from '../_shared/aiUsage.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_PAGE_BYTES = 2_500_000
const MAX_HTML_PROCESS_CHARS = 900_000
const MAX_PAGES = 12
const MAX_TEXT_CHARS = 40_000
const MAX_PAGE_TEXT_CHARS = 14_000
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
  /faq/i,
  /help/i,
  /support/i,
  /questions/i,
]

/** Always try these paths when crawling for FAQ and business background text. */
const FAQ_SEARCH_PATHS = [
  '/about',
  '/about-us',
  '/faq',
  '/frequently-asked-questions',
]

const WIX_FALLBACK_PATHS = [
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
Keep it concise but complete enough for email and chat replies.
Do not write an FAQ section — all FAQs from the site are appended automatically after generation.`

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

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    await assertWithinTokenLimit(admin, user.id)

    const body = await req.json().catch(() => ({}))
    const rawUrl = typeof body.url === 'string' ? body.url.trim() : ''
    if (!rawUrl) {
      return json({ error: 'Missing website URL' }, 400)
    }

    const siteUrl = normalizeWebsiteUrl(rawUrl)
    if (!siteUrl) {
      return json({ error: 'Enter a valid website URL (https://example.com)' }, 400)
    }

    const rawWebsiteText = typeof body.website_text === 'string' ? body.website_text.trim() : ''
    if (rawWebsiteText) {
      const combinedText = rawWebsiteText.slice(0, MAX_TEXT_CHARS)
      if (combinedText.length < MIN_USEFUL_TEXT_CHARS) {
        return json({ error: 'Could not read any content from that website' }, 422)
      }

      const parsedFaqs = parseFormattedFaqsFromCombinedText(combinedText)
      const { background, usage } = await generateBackground(openaiKey, siteUrl.href, combinedText)
      await recordAiUsageWithAlerts(admin, {
        user_id: user.id,
        feature: 'prompt_background',
        model: 'gpt-4o-mini',
        usage,
      })
      return json({
        background: appendFaqsToBusinessBackground(background, parsedFaqs),
        usage,
      })
    }

    if (isBlockedUrl(siteUrl)) {
      return json({
        error: 'That URL cannot be fetched from the server. Local and private URLs are read from your browser instead — try again, or use a public website URL.',
      }, 400)
    }

    const crawl = await collectWebsiteText(siteUrl)
    if (!crawl.pages.length) {
      return json({ error: 'Could not read any content from that website' }, 422)
    }

    const combinedText = formatWebsiteTextForGeneration(crawl.pages, crawl.faqs)

    const { background, usage } = await generateBackground(openaiKey, siteUrl.href, combinedText)
    await recordAiUsageWithAlerts(admin, {
      user_id: user.id,
      feature: 'prompt_background',
      model: 'gpt-4o-mini',
      usage,
    })
    return json({
      background: appendFaqsToBusinessBackground(background, crawl.faqs),
      usage,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    const status = message.includes('token limit') ? 429 : 500
    return json({ error: message }, status)
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

type FaqPair = { question: string; answer: string }

async function collectWebsiteText(
  startUrl: URL,
): Promise<{ pages: Array<{ url: string; text: string }>; faqs: FaqPair[] }> {
  const origin = startUrl.origin
  const visited = new Set<string>()
  const queue: string[] = [startUrl.href]
  for (const path of FAQ_SEARCH_PATHS) {
    queue.push(new URL(path, origin).href)
  }
  for (const path of WIX_FALLBACK_PATHS) {
    queue.push(new URL(path, origin).href)
  }
  const pages: Array<{ url: string; text: string }> = []
  const allFaqs: FaqPair[] = []

  while (queue.length > 0 && pages.length < MAX_PAGES) {
    const next = queue.shift()
    if (!next || visited.has(next)) continue
    visited.add(next)

    const html = await fetchHtml(next)
    if (!html) continue

    mergeFaqPairs(allFaqs, await extractFaqsFromFramerModules(html))
    mergeFaqPairs(allFaqs, extractFaqsFromHtml(html, next))

    const text = extractPageText(html, next)
    if (text.length < MIN_USEFUL_TEXT_CHARS) continue

    pages.push({ url: next, text: text.slice(0, MAX_PAGE_TEXT_CHARS) })

    for (const link of extractSameOriginLinks(html, origin)) {
      if (visited.has(link) || queue.includes(link)) continue
      if (EXTRA_PATH_PATTERNS.some((pattern) => pattern.test(link))) {
        queue.push(link)
      }
    }
  }

  return { pages, faqs: allFaqs }
}

function formatWebsiteTextForGeneration(
  pages: Array<{ url: string; text: string }>,
  faqs: FaqPair[],
): string {
  const faqBlock = faqs.length
    ? formatFaqSection(
        faqs,
        'All parsed FAQs (include every question and answer in the business background)',
      )
    : ''
  const maxPageChars = faqBlock
    ? Math.max(8_000, MAX_TEXT_CHARS - faqBlock.length - 80)
    : MAX_TEXT_CHARS
  const pageBlock = pages
    .map((page) => `=== ${page.url} ===\n${page.text}`)
    .join('\n\n')
    .slice(0, maxPageChars)
  return [pageBlock, faqBlock].filter(Boolean).join('\n\n')
}

function parseFormattedFaqsFromCombinedText(text: string): FaqPair[] {
  const faqs: FaqPair[] = []
  const pattern = /Q:\s*(.+?)\nA:\s*(.+?)(?=\n\nQ:|\n\n===|$)/gs
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    const question = match[1].replace(/\s+/g, ' ').trim()
    const answer = match[2].replace(/\s+/g, ' ').trim()
    if (question.length >= 3 && answer.length >= 3) {
      faqs.push({ question, answer })
    }
  }
  return faqs
}

function appendFaqsToBusinessBackground(background: string, faqs: FaqPair[]): string {
  if (!faqs.length) return background.trim()
  const faqBlock = formatFaqSection(faqs, 'FAQ')
  const trimmed = background.trim()
  const faqStart = trimmed.search(/\n\nFAQ(\s|\(|\/)/i)
  const base = faqStart >= 0 ? trimmed.slice(0, faqStart).trim() : trimmed
  return `${base}\n\n${faqBlock}`.trim()
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

function extractPageText(html: string, pageUrl = ''): string {
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

  const faqSection = formatFaqSection(extractFaqsFromHtml(html, pageUrl))
  if (faqSection) parts.push(faqSection)

  const bodyText = htmlToText(html)
  if (bodyText) parts.push(bodyText)

  return parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim()
}

const MAX_FAQ_ITEMS_TOTAL = 200
const MAX_FAQ_ANSWER_CHARS = 1_200
const MAX_FRAMER_MODULES = 24
const MAX_FRAMER_MODULE_BYTES = 600_000

const SKIP_FRAMER_MODULE_PATTERN =
  /\/(framer|react|motion|rolldown-runtime|SmoothScroll_Prod|script_main|shared-lib|Animator)\./i

async function extractFaqsFromFramerModules(html: string): Promise<FaqPair[]> {
  const urls = extractFramerModuleUrls(html)
  const pairs: FaqPair[] = []

  for (const url of urls.slice(0, MAX_FRAMER_MODULES)) {
    const js = await fetchFramerModuleText(url)
    if (!js) continue
    mergeFaqPairs(pairs, extractFaqsFromFramerJs(js))
  }

  return pairs
}

function extractFramerModuleUrls(html: string): string[] {
  const urls = new Set<string>()
  const pattern = /https:\/\/framerusercontent\.com\/sites\/[^"'\\s<>]+\.mjs/g
  let match: RegExpExecArray | null

  while ((match = pattern.exec(html)) !== null) {
    const url = match[0]
    if (SKIP_FRAMER_MODULE_PATTERN.test(url)) continue
    urls.add(url)
  }

  return [...urls]
}

async function fetchFramerModuleText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; ClintyPromptBot/1.0; +https://clinty.net)',
        Accept: '*/*',
      },
      signal: AbortSignal.timeout(15_000),
      redirect: 'follow',
    })
    if (!response.ok) return null

    const buffer = await response.arrayBuffer()
    if (buffer.byteLength > MAX_FRAMER_MODULE_BYTES) return null

    return new TextDecoder('utf-8', { fatal: false }).decode(buffer)
  } catch {
    return null
  }
}

function extractFaqsFromFramerJs(js: string): FaqPair[] {
  const pairs: FaqPair[] = []
  const seen = new Set<string>()

  function add(question: string, answer: string) {
    const q = normalizeFramerFaqText(question)
    const a = normalizeFramerFaqText(answer).slice(0, MAX_FAQ_ANSWER_CHARS)
    if (q.length < 3 || a.length < 3) return
    const key = q.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    pairs.push({ question: q, answer: a })
  }

  const framerAccordionPattern = /Cem09IVM0:`([^`]+)`[\s\S]*?NV3c2dGIv:`([\s\S]*?)`/g
  let match: RegExpExecArray | null
  while ((match = framerAccordionPattern.exec(js)) !== null) {
    add(match[1], match[2])
  }

  const genericPattern =
    /:`([^`\n]{8,320}\?)`,(?:height|width|id|layoutId|style)[\s\S]{0,500}?NV3c2dGIv:`([\s\S]*?)`/g
  while ((match = genericPattern.exec(js)) !== null) {
    add(match[1], match[2])
  }

  return pairs
}

function normalizeFramerFaqText(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/\\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim()
}

function mergeFaqPairs(into: FaqPair[], from: FaqPair[]): void {
  const indexByQuestion = new Map(into.map((pair, idx) => [pair.question.toLowerCase(), idx]))
  for (const pair of from) {
    if (into.length >= MAX_FAQ_ITEMS_TOTAL && !indexByQuestion.has(pair.question.toLowerCase())) {
      return
    }
    const key = pair.question.toLowerCase()
    const existingIndex = indexByQuestion.get(key)
    if (existingIndex !== undefined) {
      const existing = into[existingIndex]
      if (pair.answer.length > existing.answer.length) {
        into[existingIndex] = pair
      }
      continue
    }
    indexByQuestion.set(key, into.length)
    into.push(pair)
  }
}

function extractFaqsFromHtml(html: string, pageUrl = ''): FaqPair[] {
  const seen = new Set<string>()
  const pairs: FaqPair[] = []

  function add(question: string, answer: string) {
    const q = decodeHtmlEntities(stripTags(question)).replace(/\s+/g, ' ').trim()
    const a = decodeHtmlEntities(stripTags(answer)).replace(/\s+/g, ' ').trim().slice(0, MAX_FAQ_ANSWER_CHARS)
    if (q.length < 3 || a.length < 3) return
    const key = q.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    pairs.push({ question: q, answer: a })
  }

  const jsonLdPattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let jsonMatch: RegExpExecArray | null
  while ((jsonMatch = jsonLdPattern.exec(html)) !== null) {
    const raw = jsonMatch[1].trim()
    if (!raw) continue
    try {
      collectFaqFromJsonLd(JSON.parse(raw), add)
    } catch {
      // ignore invalid JSON-LD
    }
  }

  const detailsPattern = /<details[^>]*>([\s\S]*?)<\/details>/gi
  let detailsMatch: RegExpExecArray | null
  while ((detailsMatch = detailsPattern.exec(html)) !== null) {
    const inner = detailsMatch[1]
    const summary = inner.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)?.[1]
    if (!summary) continue
    const answerHtml = inner.replace(/<summary[\s\S]*?<\/summary>/i, '')
    add(summary, answerHtml)
  }

  for (const region of extractFaqRegions(html)) {
    extractHeadingAnswerPairs(region, add)
    extractDtDdPairs(region, add)
    extractStrongQuestionParagraphs(region, add)
  }

  const faqBlockPattern =
    /<(?:div|section|article)[^>]*(?:class|id|data-hook)=["'][^"']*faq[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section|article)>/gi
  let blockMatch: RegExpExecArray | null
  while ((blockMatch = faqBlockPattern.exec(html)) !== null) {
    extractHeadingAnswerPairs(blockMatch[1], add)
    extractDtDdPairs(blockMatch[1], add)
    extractStrongQuestionParagraphs(blockMatch[1], add)
  }

  if (isFaqListingPage(pageUrl)) {
    const bodyHtml = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html
    extractHeadingAnswerPairs(bodyHtml, add)
    extractDtDdPairs(bodyHtml, add)
    extractStrongQuestionParagraphs(bodyHtml, add)
  }

  return pairs
}

function isFaqListingPage(pageUrl: string): boolean {
  return /\/faq|frequently-asked|\/help|\/support|\/questions/i.test(pageUrl)
}

function extractFaqRegions(html: string): string[] {
  const regions: string[] = []
  const regionPattern =
    /<(?:section|div|main|article)[^>]*(?:id|class|data-hook|data-framer-name|aria-label)=["'][^"']*faq[^"']*["'][^>]*>([\s\S]*?)<\/(?:section|div|main|article)>/gi
  let match: RegExpExecArray | null
  while ((match = regionPattern.exec(html)) !== null) {
    if (match[1].trim()) regions.push(match[1])
  }
  return regions
}

function extractDtDdPairs(
  htmlFragment: string,
  add: (question: string, answer: string) => void,
): void {
  const pairPattern = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi
  let match: RegExpExecArray | null
  while ((match = pairPattern.exec(htmlFragment)) !== null) {
    add(match[1], match[2])
  }
}

function extractStrongQuestionParagraphs(
  htmlFragment: string,
  add: (question: string, answer: string) => void,
): void {
  const pattern =
    /<p[^>]*>\s*<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>[^<]*<\/p>\s*<p[^>]*>([\s\S]*?)<\/p>/gi
  let match: RegExpExecArray | null
  while ((match = pattern.exec(htmlFragment)) !== null) {
    add(match[1], match[2])
  }
}

function collectFaqFromJsonLd(
  value: unknown,
  add: (question: string, answer: string) => void,
): void {
  if (!value || typeof value !== 'object') return

  if (Array.isArray(value)) {
    for (const item of value) collectFaqFromJsonLd(item, add)
    return
  }

  const obj = value as Record<string, unknown>
  const typeValue = obj['@type']
  const types = (Array.isArray(typeValue) ? typeValue : typeValue ? [typeValue] : [])
    .map((entry) => (typeof entry === 'string' ? entry : ''))
    .filter(Boolean)

  if (types.includes('Question')) {
    const question =
      typeof obj.name === 'string'
        ? obj.name
        : typeof obj.headline === 'string'
          ? obj.headline
          : ''
    const accepted = obj.acceptedAnswer
    let answer = ''
    if (accepted && typeof accepted === 'object') {
      const answerObj = accepted as Record<string, unknown>
      if (typeof answerObj.text === 'string') answer = answerObj.text
      else if (typeof answerObj.description === 'string') answer = answerObj.description
    } else if (typeof obj.text === 'string') {
      answer = obj.text
    }
    if (question && answer) add(question, answer)
  }

  for (const key of ['@graph', 'mainEntity', 'hasPart', 'subjectOf']) {
    if (obj[key] !== undefined) collectFaqFromJsonLd(obj[key], add)
  }
}

function extractHeadingAnswerPairs(
  htmlFragment: string,
  add: (question: string, answer: string) => void,
): void {
  const headingPattern = /<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>\s*([\s\S]*?)(?=<h[2-4][^>]*>|$)/gi
  let match: RegExpExecArray | null
  while ((match = headingPattern.exec(htmlFragment)) !== null) {
    const question = match[1]
    const answerBlock = match[2].replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    const answer = stripTags(answerBlock)
    if (answer.length >= 10) add(question, answer)
  }
}

function formatFaqSection(pairs: FaqPair[], title = 'FAQ (parsed from page)'): string {
  if (!pairs.length) return ''
  return [
    title,
    ...pairs.map((pair) => `Q: ${pair.question}\nA: ${pair.answer}`),
  ].join('\n\n')
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

async function generateBackground(
  openaiKey: string,
  siteUrl: string,
  websiteText: string,
): Promise<{ background: string; usage: ReturnType<typeof readOpenAiUsage> }> {
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

  return {
    background: content.trim(),
    usage: readOpenAiUsage(data),
  }
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

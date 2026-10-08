import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsPreflightResponse, getCorsHeaders } from '../_shared/cors.ts'
import {  assertWithinTokenLimit,
  readOpenAiUsage,
  recordAiUsageWithAlerts,
} from '../_shared/aiUsage.ts'

let corsHeaders: Record<string, string> = {}

const MAX_PAGE_BYTES = 2_500_000
const MAX_HTML_PROCESS_CHARS = 1_800_000
const MAX_PAGES = 28
const MAX_TEXT_CHARS = 72_000
const MAX_PAGE_TEXT_CHARS = 18_000
const MIN_USEFUL_TEXT_CHARS = 40
const MAX_JSON_LD_BLOCKS = 3
const MAX_JSON_LD_CHARS = 2_000
const MIN_PAGE_BUDGET_CHARS = 5_500

const EXTRA_PATH_PATTERNS = [
  /about/i,
  /price/i,
  /lesson/i,
  /clinic/i,
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
  /camp/i,
  /schedule/i,
  /dates?/i,
  /book/i,
  /reserv/i,
  /room/i,
  /lodg/i,
  /stay/i,
  /accommodat/i,
  /suite/i,
  /week/i,
  /package/i,
]

/** Always try these paths when crawling for FAQ and business background text. */
const FAQ_SEARCH_PATHS = [
  '/about',
  '/about-us',
  '/contact',
  '/contact-us',
  '/contact-9',
  '/faq',
  '/faqs',
  '/faq-s',
  '/frequently-asked-questions',
  '/lessons',
  '/lessons-rentals',
  '/clinics',
  '/clinic',
  '/camps',
  '/camp',
  '/dates',
  '/schedule',
  '/book',
  '/booking',
  '/booking-calendar',
  '/packages',
  '/stay',
  '/lodging',
  '/accommodation',
  '/rooms',
  '/room',
  '/house',
  '/event-list',
  '/events',
]

const WIX_FALLBACK_PATHS = [
  '/lessons-rentals',
  '/lessons',
  '/clinics',
  '/faq-s',
  '/contact-us',
  '/contact',
  '/contact-9',
  '/teaching-methodology',
  '/events',
  '/event-list',
  '/camps',
  '/dates',
  '/schedule',
  '/book',
  '/booking-calendar',
  '/stay',
  '/lodging',
  '/rooms',
]

const BUSINESS_BACKGROUND_TYPES = [
  'auto',
  'lessons_appointments',
  'fixed_windows_packages',
  'fixed_dates_and_lessons',
  'general',
] as const

type BusinessBackgroundType = (typeof BUSINESS_BACKGROUND_TYPES)[number]
type ResolvedBusinessBackgroundType = Exclude<BusinessBackgroundType, 'auto'>

const CLASSIFY_MAX_CHARS = 10_000

function parseBusinessBackgroundType(raw: unknown): BusinessBackgroundType {
  if (typeof raw !== 'string') return 'auto'
  const normalized = raw.trim().toLowerCase()
  return (BUSINESS_BACKGROUND_TYPES as readonly string[]).includes(normalized)
    ? (normalized as BusinessBackgroundType)
    : 'auto'
}

function buildGenerationSystemPrompt(businessType: ResolvedBusinessBackgroundType): string {
  const typeGuidance = {
    lessons_appointments: `Detected / selected booking model: LESSONS & APPOINTMENTS.
Emphasize open scheduling, lesson or session packages, durations, pricing, and how to book a time.
Include agent rules for offering 2–3 concrete time options when possible and clarifying skill level before recommending a package.
When the website text includes a Lessons / Packages / Rentals catalog (often under /lessons), you MUST include a dedicated "Lesson & rental packages" bullet list with every distinct package name, duration, private vs semi-private, and price found — do not summarize them away as "lessons available". Prefer any "Parsed lesson packages" block when present and include every line.
Also include Clinics and Camps offerings when those pages appear in the website text, with concrete inclusions (hours, equipment, transport, meals) when listed.
Omit fixed camp-week / lodging capacity sections unless the site clearly has them.
Do NOT write a Welcome message or Camp welcome section — the tenant sets welcome copy in a separate Prompts field.`,
    fixed_windows_packages: `Detected / selected booking model: FIXED DATES / CAMPS / PACKAGES.
Emphasize set booking windows (exact dates), lodging/venue, hard capacity limits, daily rhythm, and bundled booking steps (e.g. dates → room → coaching/shuttle).
Include agent rules that forbid inventing arbitrary open-calendar dates outside listed windows.
Include weather or contingency fallbacks when the site describes them.
Omit hourly drop-in lesson catalogs unless the site clearly sells them.
Do NOT write a Welcome message or Camp welcome section — the tenant sets welcome copy in a separate Prompts field.

LODGING / ACCOMMODATION (required when the site mentions lodging, rooms, casa, villa, hotel, or stay options):
Always include a dedicated "Lodging / accommodation types" section. Model it after camp sites like Baja Grande (bajagrandelv.com/stay): list each bookable room or lodging type as a bullet with the facts available — name/label, who it fits (private couple, shared crew, dorm, suite), guest capacity / sleeps N, price or rate basis, beds, bathroom (private/shared), views, kitchen access, amenities, and house rules (e.g. kids under X stay free).
Also note the lodging venue name (e.g. Casa Palmar), location relative to the activity venue, shared house amenities (kitchen, terrace, hot tub), and overall guest capacity when stated.
If the site has a /stay, /rooms, /lodging, /contact-9 (camps), or similar page, treat those room types as primary booking facts — do not collapse them into a vague "beachfront lodging" line.
CRITICAL: When the source lists multiple numbered Options (e.g. "Option 1 - Glamping $2170" and "Option 2 - Casita $2395"), output ONE bullet per option with that option's own name, price, and amenities. Never merge two lodging options into one bullet. The number of lodging bullets must match the number of distinct options in the source (or in any "Parsed lodging options" block).
If lodging is mentioned but room types are sparse, still include what is known (venue name, shared amenities, capacity) rather than omitting the section.

CAMP / PACKAGE INCLUSIONS:
When camp pages list what is included (instruction hours, jet-ski tow, shuttle/transport, equipment, meals, lodging, dinners), copy those as concrete bullets under What we offer / inclusions — keep durations, counts, and specifics (e.g. "10+ hours coaching over 5 days", "daily breakfast and lunch"). Do not summarize as "camp includes lessons and lodging".`,
    fixed_dates_and_lessons: `Detected / selected booking model: FIXED DATES & LESSONS / SCHEDULE (hybrid).
This business sells BOTH fixed camp/retreat date windows AND open lesson, clinic, or schedule packages (example pattern: bajawing.com — camps + /lessons packages + clinics).
You MUST cover both booking paths clearly:
1) Fixed dates / camps — listed camp weeks or packages, lodging/accommodation when present, capacity, multi-step camp booking, and every stated camp inclusion (coaching hours, transport, gear, meals).
2) Lessons & schedule — every distinct lesson/rental/clinic package with name, duration, private vs semi-private, and price from Lessons / Clinics pages (or any "Parsed lesson packages" block). Do not omit packages or round prices.
Do not drop the lesson catalog just because camps exist, and do not invent open-calendar camp dates outside listed windows.
Include agent rules that ask whether the guest wants a camp week vs a drop-in lesson/clinic, then follow the matching flow.
Include weather or contingency fallbacks when the site describes them.
Do NOT write a Welcome message or Camp welcome section — the tenant sets welcome copy in a separate Prompts field.

LODGING / ACCOMMODATION (required when lodging/rooms/stay exist):
Same rules as fixed-date camps — list EACH room/lodging option on its own bullet with capacity, price, beds, bathroom, amenities, and kid policies when stated. If the source has Option 1 and Option 2 (e.g. Glamping and Casita), both must appear separately with their own prices.

CAMP / PACKAGE INCLUSIONS:
Copy concrete inclusion bullets from camp pages (instruction hours, jet-ski tow, shuttle, equipment, meals/dinners, lodging) — do not collapse into a vague "all-inclusive camp" line.`,
    general: `Detected / selected booking model: GENERAL BUSINESS.
Cover identity, offerings, pricing if present, policies, and a short response template.
Only include booking-window or lesson-package detail when clearly present on the site.
Do NOT write a Welcome message section — the tenant sets welcome copy in a separate Prompts field.`,
  }[businessType]

  const sectionList =
    businessType === 'fixed_windows_packages' || businessType === 'fixed_dates_and_lessons'
    ? `Format the output as plain text with these sections when data exists (skip any section with no supporting facts, EXCEPT Lodging / accommodation types — include it whenever lodging/rooms/stay are mentioned at all${
      businessType === 'fixed_dates_and_lessons'
        ? ', and EXCEPT Lesson & rental packages — include whenever lesson/clinic packages appear'
        : ''
    }):
1. Business type: one short labeled line naming the booking model (${
      businessType === 'fixed_dates_and_lessons' ? 'Fixed dates & lessons' : 'Fixed dates / camps'
    }) plus a one-sentence explanation of how customers book
2. Opening paragraph: who runs the business, location/region, experience, certifications
3. Business name, website, phone, email (only if found)
4. Venue / location with address when available
5. Booking model & hard constraints: fixed windows and/or open lesson booking, capacity/scarcity, what cannot be booked
6. Schedule windows / camp dates: bullet list with dates, durations, and prices when available
${
  businessType === 'fixed_dates_and_lessons'
    ? `7. Lesson & rental packages: bullet list of every lesson/clinic/rental package (name, duration, private vs semi-private, price)
8. Lodging / accommodation types: venue name + bullet list of each room/lodging option when lodging exists
9. What we offer / inclusions (bullet list: coaching, shuttle, meals, clinics, etc.)
10. Daily rhythm or customer expectations (when the site describes a typical day)
11. Policies (only if stated)
12. Contingencies / differentiators (weather pivots, why customers choose you)
13. Agent rules: 2–5 short imperative rules (ask camp vs lesson first; never invent camp dates; offer concrete lesson packages with prices)
14. Response template: a short paragraph the agent can reuse for new inquiries`
    : `7. Lodging / accommodation types: venue name + bullet list of each room/lodging option (name, capacity, price, beds, bathroom, amenities, kid policies) — required when lodging exists on the site
8. What we offer / inclusions (bullet list: coaching, shuttle, meals, etc.)
9. Daily rhythm or customer expectations (when the site describes a typical day)
10. Policies (only if stated)
11. Contingencies / differentiators (weather pivots, why customers choose you)
12. Agent rules: 2–5 short imperative rules (multi-step booking: dates → room → coaching/shuttle; never invent dates; ask for needed travel details)
13. Response template: a short paragraph the agent can reuse for new inquiries`
  }`
    : `Format the output as plain text with these sections when data exists (skip any section with no supporting facts):
1. Business type: one short labeled line naming the booking model (Lessons & appointments, Fixed dates / camps, Fixed dates & lessons, or General business) plus a one-sentence explanation of how customers book
2. Opening paragraph: who runs the business, location/region, experience, certifications
3. Business name, website, phone, email (only if found)
4. Venue / location with address when available
5. Booking model & hard constraints: open hours vs fixed windows, capacity/scarcity, what cannot be booked
6. Schedule windows OR lesson/service packages: bullet list with dates, durations, and prices when available
7. What we offer / inclusions (bullet list)
8. Daily rhythm or customer expectations (when the site describes a typical day or lesson flow)
9. Policies (only if stated)
10. Contingencies / differentiators (weather pivots, why customers choose you)
11. Agent rules: 2–5 short imperative rules the AI must follow when booking or answering (e.g. multi-step booking flow, what to ask for flight details, never invent dates)
12. Response template: a short paragraph the agent can reuse for new inquiries`

  return `You write "Business Background" prompt text for an AI customer-service agent.
Use ONLY facts present in the provided website content. Do not invent prices, phone numbers, policies, dates, or capacity.
If a detail is missing, omit that section rather than guessing.

${typeGuidance}

${sectionList}

Never include Camp welcome, Welcome message, Welcome prompt, or Discovery welcome sections.

Always include the Business type section first, even if other sections are sparse.

Write in first person when the site is clearly owner-operated (e.g. "I'm Tony..."), otherwise third person.
Keep it concise but complete enough for email and chat replies — prefer concrete constraints over marketing fluff.
Do not write an FAQ section — all FAQs from the site are appended automatically after generation.`
}

const CLASSIFY_SYSTEM_PROMPT = `Classify the business booking model from website text for an AI agent.
Reply with ONLY one token from this list:
lessons_appointments
fixed_windows_packages
fixed_dates_and_lessons
general

Use:
- lessons_appointments — open calendar, private/group lessons, session packages, hourly rates, book a time (no meaningful fixed camp weeks)
- fixed_windows_packages — set camp/retreat weeks or fixed date packages with lodging + coaching bundles; little or no drop-in lesson catalog
- fixed_dates_and_lessons — BOTH fixed camp/retreat date windows AND a real lesson/clinic/schedule package catalog (e.g. camps plus /lessons packages)
- general — retail, restaurants, mixed services, or unclear

Prefer fixed_dates_and_lessons when the site advertises camps/fixed weeks AND separately sells lesson packages, clinics, or rentals with durations/prices.
Prefer fixed_windows_packages when camp weeks/lodging dominate and drop-in lessons are absent or minimal.
Prefer lessons_appointments when open lesson booking dominates without fixed camp weeks.`


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse(req)
  }

  corsHeaders = getCorsHeaders(req)

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

    const requestedType = parseBusinessBackgroundType(body.business_type)
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
      const generated = await generateBackgroundWithType(
        openaiKey,
        siteUrl.href,
        combinedText,
        requestedType,
      )
      await recordAiUsageWithAlerts(admin, {
        user_id: user.id,
        feature: 'prompt_background',
        model: 'gpt-4o-mini',
        usage: generated.usage,
      })
      return json({
        background: appendFaqsToBusinessBackground(generated.background, parsedFaqs),
        welcome_message: generated.welcomeMessage,
        business_type: generated.businessType,
        usage: generated.usage,
      })
    }

    if (await isBlockedUrlAfterDns(siteUrl)) {
      return json({
        error: 'That URL cannot be fetched from the server. Local and private URLs are read from your browser instead — try again, or use a public website URL.',
      }, 400)
    }

    const crawl = await collectWebsiteText(siteUrl)
    if (!crawl.pages.length) {
      return json({ error: 'Could not read any content from that website' }, 422)
    }

    const combinedText = formatWebsiteTextForGeneration(crawl.pages, crawl.faqs)

    const generated = await generateBackgroundWithType(
      openaiKey,
      siteUrl.href,
      combinedText,
      requestedType,
    )
    await recordAiUsageWithAlerts(admin, {
      user_id: user.id,
      feature: 'prompt_background',
      model: 'gpt-4o-mini',
      usage: generated.usage,
    })
    return json({
      background: appendFaqsToBusinessBackground(generated.background, crawl.faqs),
      welcome_message: generated.welcomeMessage,
      business_type: generated.businessType,
      usage: generated.usage,
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
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return true

  const host = url.hostname.toLowerCase()
  if (
    host === 'localhost' ||
    host.endsWith('.local') ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.internal') ||
    host.endsWith('.localhost')
  ) {
    return true
  }

  if (isPrivateOrReservedIp(host)) return true
  return false
}

function isPrivateOrReservedIp(host: string): boolean {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const parts = host.split('.').map(Number)
    if (parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return true
    if (parts[0] === 0) return true
    if (parts[0] === 10) return true
    if (parts[0] === 127) return true
    if (parts[0] === 192 && parts[1] === 168) return true
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
    if (parts[0] === 169 && parts[1] === 254) return true
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true // CGNAT
    if (parts[0] === 192 && parts[1] === 0 && parts[2] === 0) return true
    if (parts[0] === 192 && parts[1] === 0 && parts[2] === 2) return true
    if (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19)) return true
    if (parts[0] >= 224) return true // multicast / reserved
    return false
  }

  // IPv6 literals (basic ULA / loopback / link-local)
  if (host.includes(':')) {
    const normalized = host.replace(/^\[|\]$/g, '').toLowerCase()
    if (normalized === '::1' || normalized === '::') return true
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true // ULA
    if (normalized.startsWith('fe80')) return true
    if (normalized.startsWith('ff')) return true // multicast
    return false
  }

  return false
}

/** Resolve hostname and block if any A/AAAA record is private (SSRF / DNS rebinding). */
async function isBlockedUrlAfterDns(url: URL): Promise<boolean> {
  if (isBlockedUrl(url)) return true

  const host = url.hostname
  if (isPrivateOrReservedIp(host)) return true

  try {
    const [aRecords, aaaaRecords] = await Promise.all([
      Deno.resolveDns(host, 'A').catch(() => [] as string[]),
      Deno.resolveDns(host, 'AAAA').catch(() => [] as string[]),
    ])
    // Only keep values that look like IPs (ignore CNAME leftovers some resolvers return).
    const ips = [...aRecords, ...aaaaRecords].filter((value) =>
      /^\d{1,3}(\.\d{1,3}){3}$/.test(value) || value.includes(':')
    )
    if (ips.length === 0) {
      // Fail open: Deno.resolveDns is unreliable on some Edge runtimes.
      // Hostname literal checks above still block localhost / private hosts.
      return false
    }
    return ips.some((ip) => isPrivateOrReservedIp(ip))
  } catch {
    // Fail open on resolver errors; fetch will still fail for unreachable hosts.
    return false
  }
}

type FaqPair = { question: string; answer: string }

const FETCH_HEADERS: Record<string, string> = {
  // Many WordPress / WordOps hosts soft-block short bot UAs from cloud IPs.
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
}

async function collectWebsiteText(
  startUrl: URL,
): Promise<{ pages: Array<{ url: string; text: string }>; faqs: FaqPair[] }> {
  const origin = startUrl.origin
  const visited = new Set<string>()
  const queue: string[] = []
  const pages: Array<{ url: string; text: string }> = []
  const allFaqs: FaqPair[] = []

  const enqueue = (href: string, front = false) => {
    const normalized = normalizeCrawlUrl(href)
    if (!normalized || visited.has(normalized) || queue.includes(normalized)) return
    if (front) queue.unshift(normalized)
    else queue.push(normalized)
  }

  // Always read the user-entered URL first so speculative 404 paths cannot starve it.
  enqueue(startUrl.href, true)

  // WordPress / Yoast: real page slugs beat guessed /lessons paths.
  for (const link of await discoverWordpressAndSitemapLinks(origin)) {
    enqueue(link, isHighPriorityUrl(link))
  }

  // Prefer program pages before generic about/contact filler.
  for (const path of FAQ_SEARCH_PATHS) {
    enqueue(new URL(path, origin).href, isHighPriorityUrl(new URL(path, origin).href))
  }
  for (const path of WIX_FALLBACK_PATHS) {
    enqueue(new URL(path, origin).href, isHighPriorityUrl(new URL(path, origin).href))
  }

  const startHref = normalizeCrawlUrl(startUrl.href)
  while (queue.length > 0 && pages.length < MAX_PAGES) {
    queue.sort((a, b) => {
      const aIsStart = a === startHref ? 1 : 0
      const bIsStart = b === startHref ? 1 : 0
      if (aIsStart !== bIsStart) return bIsStart - aIsStart
      return pagePriorityScore(b) - pagePriorityScore(a)
    })
    const next = queue.shift()
    if (!next || visited.has(next)) continue
    visited.add(next)

    const html = await fetchHtml(next)
    if (!html) continue

    mergeFaqPairs(allFaqs, await extractFaqsFromFramerModules(html))
    mergeFaqPairs(allFaqs, extractFaqsFromHtml(html, next))

    const text = extractPageText(html, next)
    if (text.length < MIN_USEFUL_TEXT_CHARS) {
      // Still discover links / Wix page map from thin pages.
      for (const link of discoverCrawlLinks(html, origin)) {
        enqueue(link, isHighPriorityUrl(link))
      }
      continue
    }

    pages.push({ url: next, text: text.slice(0, MAX_PAGE_TEXT_CHARS) })

    for (const link of discoverCrawlLinks(html, origin)) {
      enqueue(link, isHighPriorityUrl(link))
    }
  }

  // WordPress REST fallback when HTML crawl is empty (bot walls, JS shells, odd status codes).
  if (!pages.length) {
    const restPages = await collectWordpressRestPages(origin)
    for (const page of restPages) {
      if (page.text.length >= MIN_USEFUL_TEXT_CHARS) {
        pages.push({ url: page.url, text: page.text.slice(0, MAX_PAGE_TEXT_CHARS) })
      }
      mergeFaqPairs(allFaqs, page.faqs)
    }
  }

  // Keep lesson/camp/clinic/FAQ pages first in the generation budget.
  pages.sort((a, b) => pagePriorityScore(b.url) - pagePriorityScore(a.url))

  return { pages, faqs: allFaqs }
}

function normalizeCrawlUrl(href: string): string | null {
  try {
    const url = new URL(href)
    if (!/^https?:$/i.test(url.protocol)) return null
    url.hash = ''
    // Drop tracking query noise; keep meaningful paths.
    if ([...url.searchParams.keys()].every((key) => /^(utm_|fbclid|gclid)/i.test(key))) {
      url.search = ''
    }
    return url.href
  } catch {
    return null
  }
}

function isHighPriorityUrl(href: string): boolean {
  return pagePriorityScore(href) >= 50
}

function pagePriorityScore(href: string): number {
  try {
    const path = new URL(href).pathname.toLowerCase()
    let score = 0
    if (/lesson|rental/.test(path)) score += 100
    if (/clinic/.test(path)) score += 90
    if (/camp|contact-9/.test(path)) score += 95
    if (/faq/.test(path)) score += 92
    if (/price|package|rate/.test(path)) score += 75
    if (/schedule|dates?|book/.test(path)) score += 60
    if (/stay|lodg|room|accommodat|contact-9/.test(path)) score += 55
    if (/about/.test(path)) score += 20
    if (/blog|post|cart|checkout|thank|popup|search/.test(path)) score -= 40
    if (path === '/' || path === '') score += 10
    return score
  } catch {
    return 0
  }
}

function discoverCrawlLinks(html: string, origin: string): string[] {
  const links = new Set<string>()

  for (const href of extractSameOriginLinks(html, origin)) {
    if (EXTRA_PATH_PATTERNS.some((pattern) => pattern.test(href)) || isHighPriorityUrl(href)) {
      links.add(href)
    }
  }

  // Wix embeds the site page map as pageUriSEO values (e.g. lessons, faq-s, contact-9 for Camps).
  for (const slug of extractWixPageUriSeo(html)) {
    if (!slug || /^(home|cart-page|checkout|search|thank-you-page|popup-|post|fullscreen-page)$/i.test(slug)) {
      continue
    }
    try {
      const href = new URL(`/${slug}`, origin).href
      if (EXTRA_PATH_PATTERNS.some((pattern) => pattern.test(href)) || isHighPriorityUrl(href) ||
        /lesson|clinic|camp|faq|schedule|book|event|about|contact|stay|lodg|room|package|price|service/i.test(slug)) {
        links.add(href)
      }
    } catch {
      // skip
    }
  }

  return [...links]
}

function extractWixPageUriSeo(html: string): string[] {
  const slugs = new Set<string>()
  const pattern = /"pageUriSEO"\s*:\s*"([^"]+)"/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(html)) !== null) {
    const slug = match[1].trim().replace(/^\/+|\/+$/g, '')
    if (slug && !slug.includes('://') && slug.length < 120) {
      slugs.add(slug)
    }
  }
  return [...slugs]
}

function formatWebsiteTextForGeneration(
  pages: Array<{ url: string; text: string }>,
  faqs: FaqPair[],
): string {
  const faqBlock = faqs.length
    ? formatFaqSection(
        faqs,
        'All parsed FAQs (include every question and answer in the business background FAQ section)',
      )
    : ''
  const structuredBlock = buildStructuredFactsBlock(pages)
  const reserved = (faqBlock?.length ?? 0) + (structuredBlock?.length ?? 0) + 120
  const maxPageChars = Math.max(12_000, MAX_TEXT_CHARS - reserved)
  const prioritized = [...pages].sort(
    (a, b) => pagePriorityScore(b.url) - pagePriorityScore(a.url),
  )
  const pageBlock = allocatePageTextBudget(prioritized, maxPageChars)
  return [structuredBlock, pageBlock, faqBlock].filter(Boolean).join('\n\n')
}

/** Prefer keeping high-priority pages intact instead of truncating mid-catalog. */
function allocatePageTextBudget(
  pages: Array<{ url: string; text: string }>,
  maxChars: number,
): string {
  if (!pages.length || maxChars <= 0) return ''

  const targetPages = Math.min(pages.length, 10)
  const perPageFloor = Math.min(
    MIN_PAGE_BUDGET_CHARS,
    Math.max(2_500, Math.floor(maxChars / Math.max(1, targetPages))),
  )

  const slices: string[] = []
  let used = 0
  for (let i = 0; i < pages.length; i++) {
    const remainingPages = Math.max(1, Math.min(targetPages, pages.length - i))
    const remainingBudget = maxChars - used
    if (remainingBudget < 800) break

    const softCap =
      i < targetPages
        ? Math.max(perPageFloor, Math.floor(remainingBudget / remainingPages))
        : Math.min(3_000, remainingBudget)
    const chunk = pages[i].text.slice(0, Math.min(pages[i].text.length, softCap, remainingBudget - 40))
    const block = `=== ${pages[i].url} ===\n${chunk}`
    if (used + block.length + 2 > maxChars) {
      const room = maxChars - used - `=== ${pages[i].url} ===\n`.length - 2
      if (room < 400) break
      slices.push(`=== ${pages[i].url} ===\n${pages[i].text.slice(0, room)}`)
      break
    }
    slices.push(block)
    used += block.length + 2
  }

  return slices.join('\n\n')
}

function buildStructuredFactsBlock(pages: Array<{ url: string; text: string }>): string {
  const lodging: string[] = []
  const lessons: string[] = []
  const inclusions: string[] = []
  const seenLodging = new Set<string>()
  const seenLessons = new Set<string>()
  const seenInclusions = new Set<string>()

  for (const page of pages) {
    for (const option of extractLodgingOptionsFromText(page.text)) {
      const key = option.toLowerCase()
      if (seenLodging.has(key)) continue
      seenLodging.add(key)
      lodging.push(option)
    }
    for (const pkg of extractLessonPackagesFromText(page.text)) {
      const key = pkg.toLowerCase()
      if (seenLessons.has(key)) continue
      seenLessons.add(key)
      lessons.push(pkg)
    }
    for (const inclusion of extractCampInclusionsFromText(page.text)) {
      const key = inclusion.toLowerCase()
      if (seenInclusions.has(key)) continue
      seenInclusions.add(key)
      inclusions.push(inclusion)
    }
  }

  const sections: string[] = []
  if (lodging.length) {
    sections.push(
      [
        'Parsed lodging options (list EVERY option below as its own lodging bullet — do not merge):',
        ...lodging.map((line) => `- ${line}`),
      ].join('\n'),
    )
  }
  if (lessons.length) {
    sections.push(
      [
        'Parsed lesson packages (include every package with duration and price):',
        ...lessons.map((line) => `- ${line}`),
      ].join('\n'),
    )
  }
  if (inclusions.length) {
    sections.push(
      [
        'Parsed camp / package inclusions (copy as concrete What we offer bullets):',
        ...inclusions.map((line) => `- ${line}`),
      ].join('\n'),
    )
  }
  return sections.join('\n\n')
}

function extractLodgingOptionsFromText(text: string): string[] {
  const options: string[] = []
  const optionPattern =
    /Option\s*(\d+)\s*[-–—:]\s*([A-Za-z][A-Za-z0-9 &'/.-]{1,60}?)\s*\$\s*([\d,]+)\s*([\s\S]{0,420}?)(?=Option\s*\d+\s*[-–—:]|Book Your|Frequently Asked|$)/gi
  let match: RegExpExecArray | null
  while ((match = optionPattern.exec(text)) !== null) {
    const detail = decodeHtmlEntities(match[4].replace(/\s+/g, ' ').trim()).slice(0, 320)
    const line = [
      `Option ${match[1]} — ${match[2].trim()}`,
      `$${match[3].replace(/,/g, '')}`,
      detail,
    ]
      .filter(Boolean)
      .join(' — ')
    options.push(line)
  }

  // Fallback: named stay styles with nearby prices (Glamping $2170 / Casita $2395).
  if (!options.length) {
    const namedPattern =
      /\b((?:Private\s+)?(?:Glamping|Casita|Casa|Villa|Suite|Cabin|Tent|Room|Studio|Bungalow|Dorm)[A-Za-z0-9 &'/.-]{0,40})\s*\$\s*([\d,]{3,6})\b([\s\S]{0,280}?)(?=\b(?:Option|Glamping|Casita|Casa|Villa|Suite|Cabin|Book Your|Frequently Asked)\b|$)/gi
    while ((match = namedPattern.exec(text)) !== null) {
      const detail = decodeHtmlEntities(match[3].replace(/\s+/g, ' ').trim()).slice(0, 240)
      options.push(
        [`${match[1].trim()} — $${match[2].replace(/,/g, '')}`, detail].filter(Boolean).join(' — '),
      )
    }
  }

  return options
}

function extractLessonPackagesFromText(text: string): string[] {
  const packages: string[] = []
  const seen = new Set<string>()

  const catalogPattern =
    /\b((?:Semi-?Private\s+)?(?:\d+\s*[Dd]ay\s+)?(?:Advanced\s+)?(?:Wingfoil\s+)?(?:Lesson|Course|Clinic|Rental|Session)(?:\s*\([^)]{0,50}\))?|(?:Semi-?Private|Private)\s+[A-Za-z][A-Za-z0-9 &'()/-]{2,40}?(?:Lesson|Course|Clinic|Rental|Session)(?:\s*\([^)]{0,50}\))?|\d+\s*[Dd]ay\s+[A-Za-z][A-Za-z0-9 &'()/-]{2,40}?(?:Lesson|Course|Clinic)(?:\s*\([^)]{0,50}\))?)\s*(?:Private|Semi-?Private)?\s*(?:\( )?(\d+\s*(?:Students?|hr|hours?|Hrs?))[^$]{0,80}?\$\s*([\d,]{2,5})/gi
  let match: RegExpExecArray | null
  while ((match = catalogPattern.exec(text)) !== null) {
    const name = match[1].replace(/\s+/g, ' ').trim()
    const detail = match[2].replace(/\s+/g, ' ').trim()
    const price = match[3].replace(/,/g, '')
    if (
      name.length < 8 ||
      /home|services? packages?|service information|menu|cookie|privacy/i.test(name)
    ) {
      continue
    }
    const line = `${name} — ${detail} — $${price}`
    const key = line.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    packages.push(line)
  }

  // Compact Wix bookables: "Private 2 hr 250 US dollars $250"
  const compactPattern =
    /\b(Private|Semi-?Private)\s+(\d+)\s*hr\s+(\d{2,4})\s*(?:US\s*dollars)?\s*\$?\s*\3\b/gi
  while ((match = compactPattern.exec(text)) !== null) {
    const line = `${match[1]} lesson — ${match[2]} hr — $${match[3]}`
    const key = line.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    packages.push(line)
  }

  return packages.slice(0, 40)
}

function extractCampInclusionsFromText(text: string): string[] {
  const inclusions: string[] = []
  // Case-sensitive labels so mid-sentence "wingfoil equipment" does not truncate the section.
  const labeledPattern =
    /\b(Wingfoil Instruction|Daily Transport|WIngfoil Equipment|Wingfoil Equipment|Meals\s*(?:&|and)\s*Accomodation|Meals\s*(?:&|and)\s*Accommodation|What's included|Whats included)\b\s*[:\s]*([\s\S]{15,500}?)(?=\b(?:Wingfoil Instruction|Daily Transport|WIngfoil Equipment|Wingfoil Equipment|Meals\s*(?:&|and)\s*Accomodation|Meals\s*(?:&|and)\s*Accommodation|Accommodations?\s+Option|Option\s*\d+|Book Your|Frequently Asked)\b|$)/g
  let match: RegExpExecArray | null
  while ((match = labeledPattern.exec(text)) !== null) {
    const label = match[1].replace(/\s+/g, ' ').trim().replace(/^WIngfoil/i, 'Wingfoil')
    const detail = decodeHtmlEntities(match[2].replace(/\s+/g, ' ').trim()).slice(0, 400)
    if (detail.length < 12) continue
    inclusions.push(`${label}: ${detail}`)
  }
  return inclusions.slice(0, 20)
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

async function fetchHtml(url: string, redirectDepth = 0): Promise<string | null> {
  if (redirectDepth > 5) return null
  try {
    const parsed = new URL(url)
    if (await isBlockedUrlAfterDns(parsed)) return null

    const response = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(20_000),
      redirect: 'manual',
    })

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) return null
      const redirected = new URL(location, url)
      if (await isBlockedUrlAfterDns(redirected)) return null
      return await fetchHtml(redirected.href, redirectDepth + 1)
    }

    const contentType = response.headers.get('content-type') ?? ''
    const looksTextDocument =
      !contentType ||
      contentType.includes('text/html') ||
      contentType.includes('application/xhtml') ||
      contentType.includes('text/plain') ||
      contentType.includes('text/xml') ||
      contentType.includes('application/xml') ||
      contentType.includes('application/rss')
    if (!looksTextDocument) return null

    // Keep soft 404 theme pages (common on WordPress) when they still carry HTML.
    if (!(response.ok || response.status === 404)) return null

    const buffer = await response.arrayBuffer()
    if (buffer.byteLength > MAX_PAGE_BYTES) return null

    const html = new TextDecoder('utf-8', { fatal: false }).decode(buffer)
    if (/just a moment|cf-browser-verification|attention required|access denied/i.test(html) &&
      html.length < 8_000) {
      return null
    }
    return html.length > MAX_HTML_PROCESS_CHARS
      ? html.slice(0, MAX_HTML_PROCESS_CHARS)
      : html
  } catch {
    return null
  }
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const parsed = new URL(url)
    if (await isBlockedUrlAfterDns(parsed)) return null

    const response = await fetch(url, {
      headers: {
        ...FETCH_HEADERS,
        Accept: 'application/json, text/plain, */*',
      },
      signal: AbortSignal.timeout(12_000),
      redirect: 'follow',
    })
    if (!response.ok) return null
    const contentType = response.headers.get('content-type') ?? ''
    if (contentType && !contentType.includes('json') && !contentType.includes('text/plain')) {
      return null
    }
    return await response.json()
  } catch {
    return null
  }
}

function sameSiteHref(candidate: string, origin: string): string | null {
  try {
    const base = new URL(origin)
    const url = new URL(candidate, origin)
    if (!/^https?:$/i.test(url.protocol)) return null
    if (url.hostname.toLowerCase() !== base.hostname.toLowerCase()) return null
    // Prefer the scheme/host the user entered (https) even when sitemaps use http://.
    url.protocol = base.protocol
    url.host = base.host
    url.hash = ''
    return url.href
  } catch {
    return null
  }
}

async function discoverWordpressAndSitemapLinks(origin: string): Promise<string[]> {
  const links = new Set<string>()

  const rest = await fetchJson(
    new URL('/wp-json/wp/v2/pages?per_page=40&_fields=link,slug', origin).href,
  )
  if (Array.isArray(rest)) {
    for (const entry of rest) {
      if (!entry || typeof entry !== 'object') continue
      const link = (entry as { link?: unknown }).link
      if (typeof link === 'string' && link.trim()) {
        const href = sameSiteHref(link, origin)
        if (href) links.add(href)
      }
    }
  }

  for (const sitemapPath of ['/wp-sitemap.xml', '/sitemap_index.xml', '/sitemap.xml', '/page-sitemap.xml']) {
    const xml = await fetchHtml(new URL(sitemapPath, origin).href)
    if (!xml || !xml.includes('<loc>')) continue
    const locPattern = /<loc>\s*([^<]+?)\s*<\/loc>/gi
    let match: RegExpExecArray | null
    while ((match = locPattern.exec(xml)) !== null) {
      const loc = match[1].trim()
      if (!loc) continue
      // Nested sitemap indexes — fetch page sitemaps only.
      if (/sitemap/i.test(loc) && loc.endsWith('.xml')) {
        if (/page-sitemap|post-sitemap/i.test(loc)) {
          const nestedHref = sameSiteHref(loc, origin) ?? loc
          const nested = await fetchHtml(nestedHref)
          if (!nested) continue
          const nestedLoc = /<loc>\s*([^<]+?)\s*<\/loc>/gi
          let nestedMatch: RegExpExecArray | null
          while ((nestedMatch = nestedLoc.exec(nested)) !== null) {
            const href = sameSiteHref(nestedMatch[1].trim(), origin)
            if (href) links.add(href)
          }
        }
        continue
      }
      const href = sameSiteHref(loc, origin)
      if (href) links.add(href)
    }
    if (links.size > 0) break
  }

  return [...links]
}

async function collectWordpressRestPages(
  origin: string,
): Promise<Array<{ url: string; text: string; faqs: FaqPair[] }>> {
  const pages: Array<{ url: string; text: string; faqs: FaqPair[] }> = []
  const rest = await fetchJson(
    new URL(
      '/wp-json/wp/v2/pages?per_page=20&_fields=link,title,content,excerpt,slug',
      origin,
    ).href,
  )
  if (!Array.isArray(rest)) return pages

  for (const entry of rest) {
    if (!entry || typeof entry !== 'object') continue
    const row = entry as {
      link?: unknown
      slug?: unknown
      title?: { rendered?: unknown }
      content?: { rendered?: unknown }
      excerpt?: { rendered?: unknown }
    }
    const link = typeof row.link === 'string' ? row.link : ''
    if (!link) continue
    const title =
      typeof row.title?.rendered === 'string' ? decodeHtmlEntities(stripTags(row.title.rendered)) : ''
    const contentHtml =
      typeof row.content?.rendered === 'string'
        ? row.content.rendered
        : typeof row.excerpt?.rendered === 'string'
          ? row.excerpt.rendered
          : ''
    if (!contentHtml.trim()) continue
    const faqs = extractFaqsFromHtml(contentHtml, link)
    const body = htmlToText(contentHtml)
    const text = [`Title: ${title || String(row.slug ?? link)}`, body].filter(Boolean).join('\n\n').trim()
    pages.push({ url: link, text, faqs })
  }

  return pages
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

  let jsonLdCount = 0
  for (const block of extractJsonLdBlocks(html)) {
    if (jsonLdCount >= MAX_JSON_LD_BLOCKS) break
    parts.push(`Structured data: ${block.slice(0, MAX_JSON_LD_CHARS)}`)
    jsonLdCount += 1
  }

  // Keep a short FAQ preview in page text; full FAQ set is merged separately for the end section.
  const pageFaqs = extractFaqsFromHtml(html, pageUrl).slice(0, 30)
  const faqSection = formatFaqSection(pageFaqs)
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
    // Skip section labels that are not real questions.
    if (!/\?/.test(q) && !/^(what|when|where|who|why|how|do|does|is|are|can|will|should)\b/i.test(q)) {
      return
    }
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

  // Wix Accordion / collapsible FAQ (e.g. bajawing.com/faq-s) — extract before region heuristics.
  extractWixCollapsibleFaqPairs(html, add)

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
    extractHeadingAnswerPairs(region, add, { requireQuestionMark: true, maxChars: 120_000 })
    extractDtDdPairs(region, add)
    extractStrongQuestionParagraphs(region, add)
    extractArticleFaqPairs(region, add)
  }

  extractArticleFaqPairs(html, add)

  const faqBlockPattern =
    /<(?:div|section|main)[^>]*(?:class|id|data-hook)=["'][^"']*faq[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section|main)>/gi
  let blockMatch: RegExpExecArray | null
  while ((blockMatch = faqBlockPattern.exec(html)) !== null) {
    const fragment = blockMatch[1].slice(0, 120_000)
    extractHeadingAnswerPairs(fragment, add, { requireQuestionMark: true, maxChars: 120_000 })
    extractDtDdPairs(fragment, add)
    extractStrongQuestionParagraphs(fragment, add)
    extractArticleFaqPairs(fragment, add)
  }

  if (isFaqListingPage(pageUrl)) {
    const bodyHtml = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html
    // Prefer bounded, question-shaped headings — avoid scanning huge Wix shells with open-ended regex.
    extractHeadingAnswerPairs(bodyHtml, add, { requireQuestionMark: true, maxChars: 200_000 })
    extractDtDdPairs(bodyHtml.slice(0, 200_000), add)
    extractStrongQuestionParagraphs(bodyHtml.slice(0, 200_000), add)
  }

  return pairs
}

/** Wix collapsible FAQ: heading (h1–h6) followed by .wixui-collapsible-text__text answer. */
function extractWixCollapsibleFaqPairs(
  html: string,
  add: (question: string, answer: string) => void,
): void {
  const pattern =
    /<h([1-6])[^>]*>\s*([\s\S]{3,400}?)\s*<\/h\1>[\s\S]{0,2500}?class=["'][^"']*collapsible-text__text[^"']*["'][^>]*>\s*([\s\S]*?)<\/(?:div|p|span)>/gi
  let match: RegExpExecArray | null
  while ((match = pattern.exec(html)) !== null) {
    add(match[2], match[3])
  }
}

function isFaqListingPage(pageUrl: string): boolean {
  return /\/faq|frequently-asked|\/help|\/support|\/questions/i.test(pageUrl)
}

function extractFaqRegions(html: string): string[] {
  const regions: string[] = []
  const regionPattern =
    /<(?:section|div|main)[^>]*(?:id|class|data-hook|data-framer-name|aria-label)=["'][^"']*faq[^"']*["'][^>]*>([\s\S]*?)<\/(?:section|div|main)>/gi
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

function extractArticleFaqPairs(
  htmlFragment: string,
  add: (question: string, answer: string) => void,
): void {
  const pattern =
    /<article[^>]*>[\s\S]*?<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>\s*<p[^>]*>([\s\S]*?)<\/p>/gi
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
  options: { requireQuestionMark?: boolean; maxChars?: number } = {},
): void {
  const maxChars = options.maxChars ?? 80_000
  const fragment = htmlFragment.length > maxChars ? htmlFragment.slice(0, maxChars) : htmlFragment
  // Bound answer windows so large Wix pages cannot trigger pathological backtracking.
  const headingPattern =
    /<h([2-6])[^>]*>([\s\S]{1,500}?)<\/h\1>\s*([\s\S]{0,2500}?)(?=<h[2-6][^>]*>|$)/gi
  let match: RegExpExecArray | null
  while ((match = headingPattern.exec(fragment)) !== null) {
    const questionHtml = match[2]
    if (options.requireQuestionMark && !/\?/.test(questionHtml) && !/\?/.test(stripTags(questionHtml))) {
      continue
    }
    const answerBlock = match[3]
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    const answer = stripTags(answerBlock)
    if (answer.length >= 10) add(questionHtml, answer)
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
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, '"')
    .replace(/&ldquo;/gi, '"')
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
    const href = sameSiteHref(match[1], origin)
    if (href) links.add(href)
  }

  return [...links]
}

async function generateBackgroundWithType(
  openaiKey: string,
  siteUrl: string,
  websiteText: string,
  requestedType: BusinessBackgroundType,
): Promise<{
  background: string
  welcomeMessage: string
  businessType: ResolvedBusinessBackgroundType
  usage: ReturnType<typeof readOpenAiUsage>
}> {
  let businessType: ResolvedBusinessBackgroundType
  let classifyUsage = emptyUsage()

  if (requestedType === 'auto') {
    const classified = await classifyBusinessType(openaiKey, websiteText)
    businessType = classified.businessType
    classifyUsage = classified.usage
  } else {
    businessType = requestedType
  }

  const generated = await generateBackground(openaiKey, siteUrl, websiteText, businessType)
  const background = ensureBusinessTypeSection(generated.background, businessType)
  const welcome = await generateWelcomeFromBackground(openaiKey, background, businessType)
  return {
    background,
    welcomeMessage: welcome.welcomeMessage,
    businessType,
    usage: mergeUsage(mergeUsage(classifyUsage, generated.usage), welcome.usage),
  }
}

function businessTypeSectionLabel(businessType: ResolvedBusinessBackgroundType): string {
  switch (businessType) {
    case 'lessons_appointments':
      return 'Lessons & appointments'
    case 'fixed_windows_packages':
      return 'Fixed dates / camps'
    case 'fixed_dates_and_lessons':
      return 'Fixed dates & lessons'
    case 'general':
      return 'General business'
  }
}

function businessTypeSectionBlurb(businessType: ResolvedBusinessBackgroundType): string {
  switch (businessType) {
    case 'lessons_appointments':
      return 'Customers book open-calendar lessons or session packages (times and packages), not fixed camp weeks.'
    case 'fixed_windows_packages':
      return 'Customers book from fixed camp/package date windows (often with lodging and capacity limits), not arbitrary open-calendar slots.'
    case 'fixed_dates_and_lessons':
      return 'Customers can book fixed camp/package date windows and also drop-in lessons, clinics, or schedule packages — ask which path they want.'
    case 'general':
      return 'General services or mixed offerings — follow stated products, policies, and booking instructions only; do not invent a lesson calendar or camp weeks.'
  }
}

/** Guarantee a canonical Business type section at the top (survives save to DB). */
function ensureBusinessTypeSection(
  background: string,
  businessType: ResolvedBusinessBackgroundType,
): string {
  const label = businessTypeSectionLabel(businessType)
  const blurb = businessTypeSectionBlurb(businessType)
  const section = [
    'Business type',
    `${label} (${businessType})`,
    blurb,
  ].join('\n')

  let body = background.trim()
  // Drop a leading Business type paragraph if the model already wrote one.
  if (/^Business type\b/i.test(body)) {
    const blank = body.search(/\n\s*\n/)
    body = blank >= 0 ? body.slice(blank).trim() : ''
  }

  return body ? `${section}\n\n${body}` : section
}

function emptyUsage(): ReturnType<typeof readOpenAiUsage> {
  return { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
}

function mergeUsage(
  a: ReturnType<typeof readOpenAiUsage>,
  b: ReturnType<typeof readOpenAiUsage>,
): ReturnType<typeof readOpenAiUsage> {
  return {
    prompt_tokens: a.prompt_tokens + b.prompt_tokens,
    completion_tokens: a.completion_tokens + b.completion_tokens,
    total_tokens: a.total_tokens + b.total_tokens,
  }
}

async function classifyBusinessType(
  openaiKey: string,
  websiteText: string,
): Promise<{
  businessType: ResolvedBusinessBackgroundType
  usage: ReturnType<typeof readOpenAiUsage>
}> {
  const sample = websiteText.slice(0, CLASSIFY_MAX_CHARS)
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 20,
      messages: [
        { role: 'system', content: CLASSIFY_SYSTEM_PROMPT },
        { role: 'user', content: `Website text:\n${sample}` },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = typeof data?.error?.message === 'string'
      ? data.error.message
      : `OpenAI classify request failed (${response.status})`
    throw new Error(message)
  }

  const content = typeof data?.choices?.[0]?.message?.content === 'string'
    ? data.choices[0].message.content.trim().toLowerCase()
    : ''
  const match = content.match(
    /lessons_appointments|fixed_dates_and_lessons|fixed_windows_packages|general/,
  )
  const businessType = (match?.[0] ?? 'general') as ResolvedBusinessBackgroundType

  return {
    businessType,
    usage: readOpenAiUsage(data),
  }
}

async function generateBackground(
  openaiKey: string,
  siteUrl: string,
  websiteText: string,
  businessType: ResolvedBusinessBackgroundType,
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
        { role: 'system', content: buildGenerationSystemPrompt(businessType) },
        {
          role: 'user',
          content: `Website: ${siteUrl}\nBooking model for this draft: ${businessType}\n\nExtracted website text:\n${websiteText}`,
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

const WELCOME_SYSTEM_PROMPT = `You write a short discovery Welcome message for an AI customer-service agent.
Use ONLY facts in the provided Business Background. Do not invent prices, dates, packages, or claims.
Output plain text only (no markdown headings, no "Welcome message:" label).
2–4 warm sentences; light emojis are OK. Mention the business/place name when known.
Include one value line about what makes the business special (from Background only).
Do NOT list camp dates, lesson packages, prices, phone numbers, or policies.
Do NOT ask booking questions — this is only the opening greeting.`

async function generateWelcomeFromBackground(
  openaiKey: string,
  background: string,
  businessType: ResolvedBusinessBackgroundType,
): Promise<{ welcomeMessage: string; usage: ReturnType<typeof readOpenAiUsage> }> {
  const sample = background.slice(0, 8_000)
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.4,
      messages: [
        { role: 'system', content: WELCOME_SYSTEM_PROMPT },
        {
          role: 'user',
          content:
            `Booking model: ${businessType}\n\n` +
            `Write the Welcome message from this Business Background:\n\n${sample}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = typeof data?.error?.message === 'string'
      ? data.error.message
      : `OpenAI welcome request failed (${response.status})`
    throw new Error(message)
  }

  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('OpenAI returned an empty welcome message')
  }

  // Strip accidental labels the model sometimes adds.
  let welcome = content.trim()
  welcome = welcome.replace(/^(?:\*\*)?(?:camp\s+)?welcome(?:\s+message)?(?:\*\*)?\s*:\s*/i, '')
  return {
    welcomeMessage: welcome.trim(),
    usage: readOpenAiUsage(data),
  }
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

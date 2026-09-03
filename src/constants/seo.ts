import { SUPPORT_EMAIL } from './contact'

export const SITE_NAME = 'Clinty'

export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? 'https://clinty.net').replace(/\/$/, '')

export const DEFAULT_DESCRIPTION =
  'Clinty AI helps small businesses reach their full potential with agents for email, calendars, WhatsApp, paid advertising, appointment booking, product discovery, and customer support.'

export const DEFAULT_OG_IMAGE = `${SITE_URL}/favicon.svg`

export const DEFAULT_SEO = {
  title: `${SITE_NAME} — AI Agents for Small Business`,
  description: DEFAULT_DESCRIPTION,
  path: '/',
} as const

export function absoluteUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${normalized}`
}

export function pageTitle(title: string): string {
  if (title === SITE_NAME || title.startsWith(`${SITE_NAME} —`)) return title
  return `${title} — ${SITE_NAME}`
}

export function homePageJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/favicon.svg`,
        email: SUPPORT_EMAIL,
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: SITE_URL,
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
      {
        '@type': 'SoftwareApplication',
        name: SITE_NAME,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: SITE_URL,
        description: DEFAULT_DESCRIPTION,
        offers: {
          '@type': 'AggregateOffer',
          lowPrice: '29',
          highPrice: '99',
          priceCurrency: 'USD',
          offerCount: 3,
        },
      },
    ],
  }
}

export function faqPageJsonLd(
  items: Array<{ title: string; summary: string; url: string }>,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.title,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.summary,
      },
    })),
  }
}

export function articleJsonLd(input: {
  title: string
  description: string
  path: string
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.title,
    description: input.description,
    url: absoluteUrl(input.path),
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
  }
}

/** Public routes included in sitemap.xml */
export const SITEMAP_PATHS = [
  '/',
  '/contact',
  '/faq',
  '/faq/manual-ad-campaign-import',
  '/privacy',
  '/terms',
] as const

export const HOME_PAGE_JSON_LD = homePageJsonLd()

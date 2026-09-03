import { useEffect } from 'react'
import {
  DEFAULT_OG_IMAGE,
  DEFAULT_SEO,
  absoluteUrl,
  pageTitle,
} from '../constants/seo'

type PageMetaProps = {
  title?: string
  description?: string
  path?: string
  noindex?: boolean
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

const JSON_LD_ID = 'clinty-page-json-ld'

function upsertMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function upsertLink(rel: string, href: string) {
  let element = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null
  if (!element) {
    element = document.createElement('link')
    element.rel = rel
    document.head.appendChild(element)
  }
  element.href = href
}

function setJsonLd(jsonLd?: Record<string, unknown> | Record<string, unknown>[]) {
  const existing = document.getElementById(JSON_LD_ID)
  if (existing) existing.remove()
  if (!jsonLd) return

  const script = document.createElement('script')
  script.id = JSON_LD_ID
  script.type = 'application/ld+json'
  script.textContent = JSON.stringify(jsonLd)
  document.head.appendChild(script)
}

export default function PageMeta({
  title = DEFAULT_SEO.title,
  description = DEFAULT_SEO.description,
  path = DEFAULT_SEO.path,
  noindex = false,
  jsonLd,
}: PageMetaProps) {
  const jsonLdKey = jsonLd ? JSON.stringify(jsonLd) : ''

  useEffect(() => {
    const resolvedTitle = pageTitle(title)
    const canonical = absoluteUrl(path)
    const robots = noindex ? 'noindex, nofollow' : 'index, follow'

    document.title = resolvedTitle

    upsertMeta('name', 'description', description)
    upsertMeta('name', 'robots', robots)
    upsertMeta('property', 'og:title', resolvedTitle)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:url', canonical)
    upsertMeta('property', 'og:type', 'website')
    upsertMeta('property', 'og:site_name', 'Clinty')
    upsertMeta('property', 'og:image', DEFAULT_OG_IMAGE)
    upsertMeta('property', 'og:locale', 'en_US')
    upsertMeta('name', 'twitter:card', 'summary')
    upsertMeta('name', 'twitter:title', resolvedTitle)
    upsertMeta('name', 'twitter:description', description)
    upsertMeta('name', 'twitter:image', DEFAULT_OG_IMAGE)

    upsertLink('canonical', canonical)
    setJsonLd(jsonLd)

    return () => {
      setJsonLd(undefined)
    }
  }, [title, description, path, noindex, jsonLdKey, jsonLd])

  return null
}

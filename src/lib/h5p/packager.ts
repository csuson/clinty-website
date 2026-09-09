import JSZip from 'jszip'
import { buildH5PContent, sanitizeFilename } from './contentBuilders'
import type { H5PBuilderForm, PackageH5POptions } from './types'

export type { PackageH5POptions } from './types'

async function templateVersion(): Promise<string> {
  try {
    const response = await fetch('/h5p-templates/manifest.json', { cache: 'no-store' })
    if (!response.ok) return ''
    const manifest = (await response.json()) as { version?: string }
    return manifest.version ?? ''
  } catch {
    return ''
  }
}

async function loadTemplate(contentType: string): Promise<ArrayBuffer> {
  const version = await templateVersion()
  const query = version ? `?v=${encodeURIComponent(version)}` : ''
  const response = await fetch(`/h5p-templates/${contentType}.h5p${query}`, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Missing H5P template for ${contentType}. Run npm run build:h5p-templates.`)
  }
  return response.arrayBuffer()
}

export async function packageH5P(
  form: H5PBuilderForm,
  options?: PackageH5POptions,
): Promise<{ blob: Blob; filename: string }> {
  const templateBuffer = await loadTemplate(form.contentType)
  const zip = await JSZip.loadAsync(templateBuffer)

  const h5pFile = zip.file('h5p.json')
  if (!h5pFile) {
    throw new Error('Invalid H5P template: missing h5p.json')
  }

  const h5pJson = JSON.parse(await h5pFile.async('string')) as {
    title?: string
    embedTypes?: string[]
  }
  h5pJson.title = form.title.trim() || 'Clinty H5P Content'
  h5pJson.embedTypes = ['div', 'iframe']
  zip.file('h5p.json', JSON.stringify(h5pJson, null, 2))

  const content = buildH5PContent(form, options)
  zip.file('content/content.json', JSON.stringify(content, null, 2))

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
  return {
    blob,
    filename: sanitizeFilename(form.title, form.contentType),
  }
}

export function downloadH5P(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

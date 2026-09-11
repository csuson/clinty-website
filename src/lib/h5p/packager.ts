import JSZip from 'jszip'
import { buildH5PContent, sanitizeFilename } from './contentBuilders'
import type { H5PBuilderForm, H5PContentTypeId, PackageH5POptions } from './types'

export type { PackageH5POptions } from './types'

const REQUIRED_TEMPLATE_FILES: Partial<Record<H5PContentTypeId, string[]>> = {
  'question-set': [
    'H5P.QuestionSet-1.20/semantics.json',
    'H5P.QuestionSet-1.20/library.json',
    'H5P.MultiChoice-1.16/semantics.json',
  ],
  'single-choice-set': ['H5P.SingleChoiceSet-1.10/semantics.json'],
  'drag-and-drop': [
    'H5P.DragText-1.10/library.json',
    'H5P.DragText-1.10/dist/h5p-drag-text.js',
    'H5P.DragText-1.10/semantics.json',
  ],
  'dialog-cards': ['H5P.Dialogcards-1.9/semantics.json'],
  'flashcards': ['H5P.Flashcards-1.7/semantics.json'],
  crossword: [
    'H5P.Crossword-0.5/library.json',
    'H5P.Crossword-0.5/dist/h5p-crossword.js',
    'H5P.Crossword-0.5/semantics.json',
  ],
}

function assertTemplateFiles(zip: JSZip, contentType: H5PContentTypeId) {
  const required = REQUIRED_TEMPLATE_FILES[contentType] ?? []
  const missing = required.filter((path) => !zip.file(path))
  if (missing.length) {
    throw new Error(
      `H5P template for ${contentType} is incomplete (missing ${missing.join(', ')}). Run npm run build:h5p-templates and redeploy.`,
    )
  }
}

/** Lumi Cloud cannot install libraries from uploads; strip bundled libs like h5p.org exports. */
function stripBundledLibraries(zip: JSZip) {
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue
    if (path === 'h5p.json' || path.startsWith('content/')) continue
    zip.remove(path)
  }
}

/** WordPress/Moodle validators reject folder-only zip entries (paths ending with /). */
async function generateH5PArchive(zip: JSZip): Promise<Blob> {
  const clean = new JSZip()
  await Promise.all(
    Object.entries(zip.files).map(async ([path, entry]) => {
      if (entry.dir) return
      clean.file(path, await entry.async('arraybuffer'), { createFolders: false })
    }),
  )
  return clean.generateAsync({ type: 'blob', compression: 'DEFLATE' })
}

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
  assertTemplateFiles(zip, form.contentType)

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

  if (options?.contentOnly) {
    stripBundledLibraries(zip)
  }

  const blob = await generateH5PArchive(zip)
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

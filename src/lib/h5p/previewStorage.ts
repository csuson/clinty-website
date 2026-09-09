import JSZip from 'jszip'

const DB_NAME = 'clinty-h5p-preview'
const DB_VERSION = 1
const STORE = 'files'
const PREVIEW_PREFIX = 'h5p-preview'

export type PreviewFileRecord = {
  data: ArrayBuffer
  mime: string
}

function mimeForPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    json: 'application/json',
    js: 'application/javascript',
    css: 'text/css',
    svg: 'image/svg+xml',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
    eot: 'application/vnd.ms-fontobject',
    otf: 'font/otf',
    html: 'text/html',
    txt: 'text/plain',
    vtt: 'text/vtt',
  }
  return map[ext] ?? 'application/octet-stream'
}

/** H5P.QuestionSet-1.20/foo -> H5P.QuestionSet/foo (library version probe path). */
export function libraryAliasPath(path: string): string | null {
  const normalized = path.replace(/\\/g, '/')
  const match = normalized.match(/^([^/]+)-(\d+\.\d+)(\/.*)$/)
  if (!match) return null
  return `${match[1]}${match[3]}`
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
  })
}

async function putPreviewFile(
  db: IDBDatabase,
  previewId: string,
  path: string,
  data: ArrayBuffer,
  mime: string,
) {
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.objectStore(STORE).put({ data, mime }, `${previewId}/${path}`)
  })
}

async function deletePreview(db: IDBDatabase, previewId: string) {
  revokePreviewBlobUrls(previewId)
  const prefix = `${previewId}/`
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const request = store.openCursor()
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor) return
      if (typeof cursor.key === 'string' && cursor.key.startsWith(prefix)) {
        store.delete(cursor.key)
      }
      cursor.continue()
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

let activePreviewId: string | null = null
let serviceWorkerReady: Promise<ServiceWorkerRegistration | null> | null = null
const previewBlobUrls = new Map<string, Map<string, string>>()

function revokePreviewBlobUrls(previewId: string) {
  const urlMap = previewBlobUrls.get(previewId)
  if (!urlMap) return
  for (const url of urlMap.values()) {
    URL.revokeObjectURL(url)
  }
  previewBlobUrls.delete(previewId)
}

export function resolvePreviewAssetUrl(previewId: string, filePath: string): string | null {
  const normalized = filePath.replace(/^\/+/, '').replace(/\\/g, '/')
  const urlMap = previewBlobUrls.get(previewId)
  if (!urlMap) return null

  const direct = urlMap.get(normalized)
  if (direct) return direct

  const alias = libraryAliasPath(normalized)
  if (alias) {
    const aliased = urlMap.get(alias)
    if (aliased) return aliased
  }

  return null
}

function rewritePreviewAssetUrl(previewId: string, rawUrl: string): string {
  const prefix = `${previewBasePath(previewId)}/`

  let pathname: string
  try {
    pathname = new URL(rawUrl, window.location.origin).pathname
  } catch {
    return rawUrl
  }

  if (!pathname.startsWith(prefix)) return rawUrl

  const filePath = decodeURIComponent(pathname.slice(prefix.length))
  return resolvePreviewAssetUrl(previewId, filePath) ?? rawUrl
}

export function installPreviewAssetUrlRewriter(previewId: string): () => void {
  const rewrite = (rawUrl: string) => rewritePreviewAssetUrl(previewId, rawUrl)

  const scriptSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src')
  const linkHrefDescriptor = Object.getOwnPropertyDescriptor(HTMLLinkElement.prototype, 'href')

  if (scriptSrcDescriptor?.set && scriptSrcDescriptor.get) {
    Object.defineProperty(HTMLScriptElement.prototype, 'src', {
      configurable: true,
      get: scriptSrcDescriptor.get,
      set(value: string) {
        scriptSrcDescriptor.set!.call(this, rewrite(value))
      },
    })
  }

  if (linkHrefDescriptor?.set && linkHrefDescriptor.get) {
    Object.defineProperty(HTMLLinkElement.prototype, 'href', {
      configurable: true,
      get: linkHrefDescriptor.get,
      set(value: string) {
        linkHrefDescriptor.set!.call(this, rewrite(value))
      },
    })
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLScriptElement) {
          const current = node.getAttribute('src')
          if (current) {
            const next = rewrite(current)
            if (next !== current) node.src = next
          }
        } else if (node instanceof HTMLLinkElement) {
          const current = node.getAttribute('href')
          if (current) {
            const next = rewrite(current)
            if (next !== current) node.href = next
          }
        }
      }
    }
  })

  observer.observe(document.documentElement, { childList: true, subtree: true })

  return () => {
    observer.disconnect()
    if (scriptSrcDescriptor) {
      Object.defineProperty(HTMLScriptElement.prototype, 'src', scriptSrcDescriptor)
    }
    if (linkHrefDescriptor) {
      Object.defineProperty(HTMLLinkElement.prototype, 'href', linkHrefDescriptor)
    }
  }
}

export function previewBasePath(previewId: string): string {
  return `/${PREVIEW_PREFIX}/${previewId}`
}

export function previewFilePath(previewId: string, filePath: string): string {
  return `${previewBasePath(previewId)}/${filePath.replace(/^\/+/, '')}`
}

export async function readPreviewFile(
  previewId: string,
  filePath: string,
): Promise<PreviewFileRecord | null> {
  const normalized = filePath.replace(/^\/+/, '').replace(/\\/g, '/')
  const db = await openDb()

  const direct = await new Promise<PreviewFileRecord | null>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const request = tx.objectStore(STORE).get(`${previewId}/${normalized}`)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve((request.result as PreviewFileRecord | undefined) ?? null)
  })

  if (direct) return direct

  const alias = libraryAliasPath(normalized)
  if (!alias || alias === normalized) return null

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const request = tx.objectStore(STORE).get(`${previewId}/${alias}`)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve((request.result as PreviewFileRecord | undefined) ?? null)
  })
}

async function waitForServiceWorkerControl(timeoutMs = 5000): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false
  if (navigator.serviceWorker.controller) return true

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(false), timeoutMs)
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => {
        window.clearTimeout(timer)
        resolve(Boolean(navigator.serviceWorker.controller))
      },
      { once: true },
    )
  })
}

export async function ensurePreviewServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null
  }

  if (!serviceWorkerReady) {
    serviceWorkerReady = (async () => {
      const registration = await navigator.serviceWorker.register('/h5p-preview-sw.js', { scope: '/' })
      await navigator.serviceWorker.ready

      if (!registration.active) {
        await new Promise<void>((resolve) => {
          const worker = registration.installing ?? registration.waiting
          if (!worker) {
            resolve()
            return
          }
          worker.addEventListener('statechange', () => {
            if (worker.state === 'activated') resolve()
          })
        })
      }

      await waitForServiceWorkerControl()
      return registration
    })()
  }

  return serviceWorkerReady
}

export function installPreviewFetchInterceptor(previewId: string): () => void {
  const prefix = `${previewBasePath(previewId)}/`
  const originalFetch = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url

    let pathname: string
    try {
      pathname = new URL(url, window.location.origin).pathname
    } catch {
      return originalFetch(input, init)
    }

    if (!pathname.startsWith(prefix)) {
      return originalFetch(input, init)
    }

    const filePath = decodeURIComponent(pathname.slice(prefix.length))
    const file = await readPreviewFile(previewId, filePath)
    if (!file) {
      return new Response('Preview file not found', { status: 404 })
    }

    return new Response(file.data.slice(0), {
      status: 200,
      headers: {
        'Content-Type': file.mime,
        'Cache-Control': 'no-store',
      },
    })
  }

  return () => {
    window.fetch = originalFetch
  }
}

export async function storeH5PPreviewPackage(blob: Blob): Promise<string> {
  await ensurePreviewServiceWorker()

  const previewId = crypto.randomUUID()
  const zip = await JSZip.loadAsync(blob)
  const db = await openDb()

  if (activePreviewId) {
    await deletePreview(db, activePreviewId)
  }

  const urlMap = new Map<string, string>()
  const writes: Promise<void>[] = []
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue
    const normalizedPath = path.replace(/\\/g, '/')
    writes.push(
      entry.async('arraybuffer').then(async (data) => {
        const mime = mimeForPath(normalizedPath)
        const blobUrl = URL.createObjectURL(new Blob([data], { type: mime }))
        urlMap.set(normalizedPath, blobUrl)

        await putPreviewFile(db, previewId, normalizedPath, data, mime)
        const alias = libraryAliasPath(normalizedPath)
        if (alias) {
          urlMap.set(alias, blobUrl)
          await putPreviewFile(db, previewId, alias, data, mime)
        }
      }),
    )
  }

  await Promise.all(writes)
  previewBlobUrls.set(previewId, urlMap)

  activePreviewId = previewId
  return previewId
}

export async function clearActivePreview() {
  if (!activePreviewId) return
  const db = await openDb()
  await deletePreview(db, activePreviewId)
  activePreviewId = null
}

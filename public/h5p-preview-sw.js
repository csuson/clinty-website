const DB_NAME = 'clinty-h5p-preview'
const DB_VERSION = 1
const STORE = 'files'

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

function openDb() {
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

function libraryAliasPath(path) {
  const match = path.match(/^([^/]+)-(\d+\.\d+)(\/.*)$/)
  if (!match) return null
  return `${match[1]}${match[3]}`
}

async function readPreviewFile(previewId, filePath) {
  const normalized = filePath.replace(/^\/+/, '')
  const db = await openDb()

  const readKey = (key) =>
    new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const request = tx.objectStore(STORE).get(key)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result ?? null)
    })

  const direct = await readKey(`${previewId}/${normalized}`)
  if (direct) return direct

  const alias = libraryAliasPath(normalized)
  if (!alias) return null
  return readKey(`${previewId}/${alias}`)
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (!url.pathname.startsWith('/h5p-preview/')) return

  const relative = decodeURIComponent(url.pathname.slice('/h5p-preview/'.length))
  const slash = relative.indexOf('/')
  if (slash === -1) return

  const previewId = relative.slice(0, slash)
  const filePath = relative.slice(slash + 1)
  if (!previewId || !filePath) return

  event.respondWith(
    readPreviewFile(previewId, filePath).then((file) => {
      if (!file) {
        return new Response('Preview file not found', { status: 404 })
      }
      return new Response(file.data, {
        headers: {
          'Content-Type': file.mime,
          'Cache-Control': 'no-store',
        },
      })
    }),
  )
})

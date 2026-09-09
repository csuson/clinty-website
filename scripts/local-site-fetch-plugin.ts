import type { Plugin, ViteDevServer } from 'vite'

function isLocalOrPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
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

function attachLocalSiteFetchMiddleware(server: ViteDevServer) {
  server.middlewares.use('/api/local-site-fetch', async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      })
      res.end()
      return
    }

    if (req.method !== 'GET') {
      res.writeHead(405)
      res.end('Method not allowed')
      return
    }

    const requestUrl = new URL(req.url ?? '', 'http://localhost')
    const target = requestUrl.searchParams.get('url')?.trim()
    if (!target) {
      res.writeHead(400)
      res.end('Missing url parameter')
      return
    }

    let targetUrl: URL
    try {
      targetUrl = new URL(target)
    } catch {
      res.writeHead(400)
      res.end('Invalid url parameter')
      return
    }

    if (!isLocalOrPrivateHost(targetUrl.hostname)) {
      res.writeHead(400)
      res.end('Only local or private URLs are allowed')
      return
    }

    try {
      const response = await fetch(targetUrl.href, {
        headers: {
          Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
      })
      const html = await response.text()
      res.writeHead(response.status, {
        'Content-Type': response.headers.get('content-type') ?? 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      })
      res.end(html)
    } catch (err) {
      res.writeHead(502)
      res.end(err instanceof Error ? err.message : 'Fetch failed')
    }
  })
}

export function localSiteFetchPlugin(): Plugin {
  return {
    name: 'local-site-fetch',
    configureServer(server) {
      attachLocalSiteFetchMiddleware(server)
    },
  }
}

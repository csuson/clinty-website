import {
  installPreviewAssetUrlRewriter,
  installPreviewFetchInterceptor,
  previewBasePath,
} from './previewStorage'

type H5PConstructor = new (
  element: HTMLElement,
  options: Record<string, unknown>,
) => Promise<unknown>

declare global {
  interface Window {
    H5PStandalone?: {
      H5P: H5PConstructor
    }
  }
}

let h5pScriptPromise: Promise<H5PConstructor> | null = null

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-h5p-src="${src}"]`)
    if (existing) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.charset = 'UTF-8'
    script.dataset.h5pSrc = src
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(script)
  })
}

async function getH5PConstructor(): Promise<H5PConstructor> {
  if (!h5pScriptPromise) {
    h5pScriptPromise = loadScript('/h5p-player/main.bundle.js').then(() => {
      const H5P = window.H5PStandalone?.H5P
      if (!H5P) {
        throw new Error('H5P standalone player failed to initialize.')
      }
      return H5P
    })
  }
  return h5pScriptPromise
}

export async function mountH5PPreview(container: HTMLElement, previewId: string): Promise<() => void> {
  container.replaceChildren()

  const removeFetchInterceptor = installPreviewFetchInterceptor(previewId)
  const removeAssetUrlRewriter = installPreviewAssetUrlRewriter(previewId)

  try {
    const H5P = await getH5PConstructor()
    const h5pJsonPath = previewBasePath(previewId)

    await new H5P(container, {
      h5pJsonPath,
      frameJs: '/h5p-player/frame.bundle.js',
      frameCss: '/h5p-player/styles/h5p.css',
      frame: false,
      copyright: false,
      export: false,
      icon: false,
      fullScreen: true,
      embedType: 'div',
      assetsRequestFetchOptions: { cache: 'no-store' },
    })
  } catch (err) {
    removeAssetUrlRewriter()
    removeFetchInterceptor()
    if (err instanceof Error && /JSON\.parse|unexpected character/i.test(err.message)) {
      throw new Error(
        'H5P preview could not load package files. Refresh the page and try again. If the problem persists, download the .h5p file and upload it to your H5P platform instead.',
      )
    }
    throw err
  }

  return () => {
    removeAssetUrlRewriter()
    removeFetchInterceptor()
    container.replaceChildren()
  }
}

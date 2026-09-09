import JSZip from 'jszip'
import { access, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root = join(__dirname, '..')
const outDir = join(root, 'public', 'h5p-templates')
const cacheDir = join(root, '.cache', 'h5p-libraries')

const H5P_ALLOWED_EXTENSIONS = new Set([
  'json',
  'js',
  'css',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'bmp',
  'tif',
  'tiff',
  'svg',
  'eot',
  'ttf',
  'woff',
  'woff2',
  'otf',
  'webm',
  'mp4',
  'ogg',
  'mp3',
  'm4a',
  'wav',
  'txt',
  'pdf',
  'rtf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'odt',
  'ods',
  'odp',
  'xml',
  'csv',
  'diff',
  'patch',
  'swf',
  'md',
  'textile',
  'vtt',
  'webvtt',
  'gltf',
  'glb',
  'html',
])

// Pinned to H5P core API 1.27-compatible releases (avoid master / 1.28-only libraries).
const LIBRARY_REPOS = {
  FontAwesome: { repo: 'h5p/font-awesome', ref: 'master' },
  'H5P.Accordion': { repo: 'h5p/h5p-accordion', ref: '1.0.0' },
  'H5P.Blanks': { repo: 'h5p/h5p-blanks', ref: '1.14.13' },
  'H5P.Question': { repo: 'h5p/h5p-question', ref: '1.5.15' },
  'H5P.JoubelUI': { repo: 'h5p/h5p-joubel-ui', ref: '1.3.18' },
  'H5P.TextUtilities': { repo: 'otacke/h5p-text-utilities', ref: 'master' },
  'H5P.Timeline': { repo: 'h5p/h5p-timeline', ref: '1.1.17' },
  TimelineJS: { repo: 'h5p/timelinejs', ref: 'master' },
  'H5P.DragQuestion': { repo: 'h5p/h5p-drag-question', ref: '1.14.22' },
  'jquery.ui': { repo: 'h5p/jquery-ui', ref: 'master' },
  'H5P.QuestionSet': { repo: 'h5p/h5p-question-set', ref: '1.20.31' },
  'H5P.MultiChoice': { repo: 'h5p/h5p-multi-choice', ref: '1.16.14' },
  'H5P.Video': { repo: 'h5p/h5p-video', ref: '1.6.40' },
  'H5P.CoursePresentation': { repo: 'h5p/h5p-course-presentation', ref: '1.26.3' },
  'H5P.FontIcons': { repo: 'h5p/h5p-font-icons', ref: '1.0.6' },
  'H5P.Transition': { repo: 'h5p/h5p-transition', ref: '1.0.4' },
  'H5P.InteractiveVideo': { repo: 'h5p/h5p-interactive-video', ref: '1.27.9' },
  'H5P.DragNBar': { repo: 'h5p/h5p-drag-n-bar', ref: '1.5.23' },
  'H5P.DragNDrop': { repo: 'h5p/h5p-drag-n-drop', ref: '1.1.0' },
  'H5P.DragNResize': { repo: 'h5p/h5p-drag-n-resize', ref: '1.2.5' },
}

const CONTENT_TYPE_LIBS = {
  accordion: ['H5P.Accordion'],
  blanks: ['H5P.Blanks'],
  timeline: ['H5P.Timeline'],
  'drag-and-drop': ['H5P.DragQuestion'],
  'question-set': ['H5P.QuestionSet', 'H5P.MultiChoice'],
  'course-presentation': ['H5P.CoursePresentation'],
  'interactive-video': ['H5P.InteractiveVideo'],
}

const CONTENT_TYPE_MAIN = {
  accordion: 'H5P.Accordion',
  blanks: 'H5P.Blanks',
  timeline: 'H5P.Timeline',
  'drag-and-drop': 'H5P.DragQuestion',
  'question-set': 'H5P.QuestionSet',
  'course-presentation': 'H5P.CoursePresentation',
  'interactive-video': 'H5P.InteractiveVideo',
}

function mapMachineName(machineName) {
  if (machineName === 'jQuery.ui') return 'jquery.ui'
  return machineName
}

async function fetchLibraryJson(spec) {
  const libraryJsonRes = await fetch(`https://raw.githubusercontent.com/${spec.repo}/${spec.ref}/library.json`)
  if (!libraryJsonRes.ok) {
    throw new Error(`library.json not found for ${spec.repo}@${spec.ref}`)
  }
  return libraryJsonRes.json()
}

async function resolveLibraries(rootLibs) {
  const queue = [...rootLibs]
  const seen = new Set()
  const ordered = []

  while (queue.length) {
    const name = queue.shift()
    if (seen.has(name)) continue
    const spec = LIBRARY_REPOS[name]
    if (!spec) continue

    seen.add(name)
    ordered.push(name)

    const libraryJson = await fetchLibraryJson(spec)
    for (const dep of libraryJson.preloadedDependencies ?? []) {
      const depName = mapMachineName(dep.machineName)
      if (!seen.has(depName) && LIBRARY_REPOS[depName]) {
        queue.push(depName)
      }
    }
  }

  return ordered
}

async function downloadArchive(repo, ref) {
  const tagRes = await fetch(`https://codeload.github.com/${repo}/zip/refs/tags/${ref}`)
  if (tagRes.ok) return tagRes
  const headRes = await fetch(`https://codeload.github.com/${repo}/zip/refs/heads/${ref}`)
  if (headRes.ok) return headRes
  throw new Error(`Archive not found for ${repo}@${ref}`)
}

async function pathExists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function isPackagableRelativePath(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/')
  const base = normalized.split('/').pop() ?? ''
  if (base === 'library.json') return true
  const dot = base.lastIndexOf('.')
  if (dot < 0) return false
  return H5P_ALLOWED_EXTENSIONS.has(base.slice(dot + 1).toLowerCase())
}

function parseH5pIgnore(contents) {
  return contents
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function isIgnoredPath(relativePath, ignorePatterns) {
  const normalized = relativePath.replace(/\\/g, '/')
  return ignorePatterns.some((pattern) => {
    if (pattern.endsWith('/')) {
      return normalized.startsWith(pattern) || normalized.includes(`/${pattern}`)
    }
    return normalized === pattern || normalized.endsWith(`/${pattern}`)
  })
}

async function readIgnorePatterns(libDir) {
  const ignorePath = join(libDir, '.h5pignore')
  if (!(await pathExists(ignorePath))) return []
  const contents = await readFile(ignorePath, 'utf8')
  return parseH5pIgnore(contents)
}

async function listFilesRecursive(dir, prefix = '') {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.name === '.git' || entry.name === '.github') continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(full, rel)))
    } else {
      files.push(rel)
    }
  }
  return files
}

function assetPathsFromLibraryJson(libraryJson) {
  const paths = new Set(['library.json'])
  for (const group of ['preloadedJs', 'preloadedCss']) {
    for (const entry of libraryJson[group] ?? []) {
      if (entry.path) {
        paths.add(entry.path.replace(/^\//, ''))
      }
    }
  }
  return paths
}

async function collectPackagableFiles(libDir, libraryJson) {
  const ignorePatterns = await readIgnorePatterns(libDir)
  const selected = new Set(['library.json'])
  const assetPaths = assetPathsFromLibraryJson(libraryJson)

  for (const assetPath of assetPaths) {
    if (assetPath === 'library.json') continue

    const assetDir = dirname(assetPath)
    if (assetDir === '.') {
      if (!isIgnoredPath(assetPath, ignorePatterns) && isPackagableRelativePath(assetPath)) {
        selected.add(assetPath.replace(/\\/g, '/'))
      }
      continue
    }

    const normalizedDir = assetDir
    const dirFull = join(libDir, normalizedDir)
    if (!(await pathExists(dirFull))) continue

    const dirFiles = await listFilesRecursive(dirFull, normalizedDir)
    for (const file of dirFiles) {
      if (isIgnoredPath(file, ignorePatterns)) continue
      if (isPackagableRelativePath(file)) {
        selected.add(file.replace(/\\/g, '/'))
      }
    }
  }

  const languageDir = join(libDir, 'language')
  if (await pathExists(languageDir)) {
    for (const file of await listFilesRecursive(languageDir, 'language')) {
      if (file.endsWith('.json') && !isIgnoredPath(file, ignorePatterns)) {
        selected.add(file.replace(/\\/g, '/'))
      }
    }
  }

  for (const optional of ['icon.svg', 'semantics.json']) {
    const full = join(libDir, optional)
    if (await pathExists(full)) {
      selected.add(optional)
    }
  }

  const existing = []
  for (const file of selected) {
    if (await pathExists(join(libDir, file))) {
      existing.push(file)
    }
  }

  return existing
}

async function runLibraryBuild(libDir) {
  const packageJsonPath = join(libDir, 'package.json')
  if (!(await pathExists(packageJsonPath))) return

  console.log(`Building ${libDir.split('/').pop()}...`)
  await execFileAsync('npm', ['ci'], { cwd: libDir, stdio: 'inherit' })
  await execFileAsync('npm', ['run', 'build'], { cwd: libDir, stdio: 'inherit' })
}

async function prepareLibrary(machineName, libDir, spec, libraryJson) {
  const requiredAssets = assetPathsFromLibraryJson(libraryJson)
  const missingAsset = await Promise.all(
    [...requiredAssets]
      .filter((path) => path !== 'library.json')
      .map(async (path) => ((await pathExists(join(libDir, path))) ? null : path)),
  )

  if (missingAsset.some(Boolean) && (spec.build || (await pathExists(join(libDir, 'package.json'))))) {
    await runLibraryBuild(libDir)
  }
}

async function downloadLibrary(machineName) {
  const spec = LIBRARY_REPOS[machineName]
  if (!spec) throw new Error(`Missing repo mapping for ${machineName}`)

  const libraryJson = await fetchLibraryJson(spec)
  const cacheFolderName = `${libraryJson.machineName}-${libraryJson.majorVersion}.${libraryJson.minorVersion}__${spec.ref.replace(/[^\w.-]/g, '_')}`
  const packageFolderName = `${libraryJson.machineName}-${libraryJson.majorVersion}.${libraryJson.minorVersion}`
  const targetDir = join(cacheDir, cacheFolderName)

  if (!(await pathExists(join(targetDir, 'library.json')))) {
    await mkdir(targetDir, { recursive: true })

    const archiveRes = await downloadArchive(spec.repo, spec.ref)
    const archiveZip = await JSZip.loadAsync(Buffer.from(await archiveRes.arrayBuffer()))
    const rootPrefix = Object.keys(archiveZip.files).find((name) => /^[^/]+\/$/.test(name))
    if (!rootPrefix) {
      throw new Error(`Unexpected archive layout for ${spec.repo}`)
    }

    for (const [entryName, entry] of Object.entries(archiveZip.files)) {
      if (entry.dir) continue
      const relativePath = entryName.slice(rootPrefix.length)
      if (!relativePath || relativePath.startsWith('.github/')) continue
      const filePath = join(targetDir, relativePath)
      await mkdir(dirname(filePath), { recursive: true })
      await writeFile(filePath, await entry.async('nodebuffer'))
    }
  }

  await prepareLibrary(machineName, targetDir, spec, libraryJson)
  return { folderName: packageFolderName, libraryJson, libDir: targetDir }
}

async function addLibraryToZip(zip, machineName) {
  const { folderName, libraryJson, libDir } = await downloadLibrary(machineName)
  const files = await collectPackagableFiles(libDir, libraryJson)

  if (!files.length) {
    throw new Error(`No packagable files found for ${machineName}`)
  }

  for (const file of files) {
    const rel = join(folderName, file).replace(/\\/g, '/')
    const data = await readFile(join(libDir, file))
    zip.file(rel, data)
  }

  return {
    machineName: libraryJson.machineName,
    majorVersion: libraryJson.majorVersion,
    minorVersion: libraryJson.minorVersion,
  }
}

function placeholderContent(contentType) {
  switch (contentType) {
    case 'accordion':
      return { panels: [{ title: 'Section', content: '<p>Content</p>' }], hTag: 'h2' }
    case 'blanks':
      return {
        text: 'Complete the sentence: *answer*.',
        media: { disableImageZooming: false },
        behaviour: {
          enableRetry: true,
          enableSolutionsButton: true,
          enableCheckButton: true,
          autoCheck: false,
        },
      }
    case 'timeline':
      return {
        timeline: {
          headline: 'Timeline',
          text: '<p>Events and milestones.</p>',
          defaultZoomLevel: '0',
          height: 600,
          date: [{ startDate: '2020', headline: 'Event', text: '<p>Details</p>' }],
        },
      }
    case 'drag-and-drop':
      return {
        question: {
          settings: { size: { width: 620, height: 310 } },
          task: { elements: [], dropZones: [] },
        },
        overallFeedback: [{ from: 0, to: 100 }],
        behaviour: {
          enableRetry: true,
          enableCheckButton: true,
          singlePoint: false,
          dropZoneHighlighting: 'dragging',
          autoAlignSpacing: 2,
          enableFullScreen: false,
          showScorePoints: true,
          showTitle: false,
        },
      }
    case 'question-set':
      return {
        introPage: { showIntroPage: true, title: 'Quiz', introduction: '<p>Test your knowledge.</p>' },
        progressType: 'dots',
        passPercentage: 50,
        questions: [],
        disableBackwardsNavigation: false,
        randomQuestions: false,
      }
    case 'course-presentation':
      return {
        presentation: {
          slides: [{ elements: [], keywords: [] }],
          keywordListEnabled: false,
          keywordListAlwaysShow: false,
          keywordListAutoHide: false,
          keywordListOpacity: 90,
        },
      }
    case 'interactive-video':
      return {
        interactiveVideo: {
          video: {
            files: [],
            startScreenOptions: { title: 'Video', hideStartTitle: false },
          },
          assets: { interactions: [], bookmarks: [], endscreens: [] },
        },
      }
    default:
      return {}
  }
}

async function buildTemplate(contentType) {
  const zip = new JSZip()
  const libs = await resolveLibraries(CONTENT_TYPE_LIBS[contentType])
  const dependencies = []
  for (const lib of libs) {
    dependencies.push(await addLibraryToZip(zip, lib))
  }

  const mainLibraryName = CONTENT_TYPE_MAIN[contentType]
  const mainLibrary = dependencies.find((dep) => dep.machineName === mainLibraryName)
  if (!mainLibrary) {
    throw new Error(`Main library ${mainLibraryName} missing for ${contentType}`)
  }

  const h5pJson = {
    title: 'Clinty Template',
    language: 'en',
    mainLibrary: mainLibrary.machineName,
    embedTypes: ['div', 'iframe'],
    license: 'U',
    defaultLanguage: 'en',
    preloadedDependencies: dependencies.map((dep) => ({
      machineName: dep.machineName,
      majorVersion: dep.majorVersion,
      minorVersion: dep.minorVersion,
    })),
  }

  zip.file('h5p.json', JSON.stringify(h5pJson, null, 2))
  zip.file('content/content.json', JSON.stringify(placeholderContent(contentType), null, 2))

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  await writeFile(join(outDir, `${contentType}.h5p`), buffer)
  console.log(`Built ${contentType}.h5p`)
}

await mkdir(outDir, { recursive: true })
await mkdir(cacheDir, { recursive: true })

const only = process.argv[2]

const builtAt = new Date().toISOString()
for (const [contentType] of Object.entries(CONTENT_TYPE_LIBS)) {
  if (only && contentType !== only) continue
  await buildTemplate(contentType)
}

await writeFile(
  join(outDir, 'manifest.json'),
  JSON.stringify({ version: Date.now().toString(36), builtAt }, null, 2),
)
console.log('Done')

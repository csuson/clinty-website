import { Client } from 'basic-ftp'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root = join(__dirname, '..')
const distDir = join(root, 'dist')

function loadEnv() {
  const envPath = join(root, '.env')
  if (!existsSync(envPath)) return {}

  const vars = {}
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    let value = trimmed.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    vars[trimmed.slice(0, idx).trim()] = value
  }
  return vars
}

const env = { ...process.env, ...loadEnv() }

const host = env.HOSTINGER_FTP_HOST
const user = env.HOSTINGER_FTP_USER
const password = env.HOSTINGER_FTP_PASSWORD
const remotePath = env.HOSTINGER_FTP_REMOTE_PATH || '/public_html'
const extraRemotePaths = (env.HOSTINGER_FTP_EXTRA_PATHS ?? '')
  .split(',')
  .map((path) => path.trim())
  .filter(Boolean)
const secure = env.HOSTINGER_FTP_SECURE !== 'false'

if (!host || !user || !password) {
  console.error('Missing Hostinger FTP credentials in .env:')
  console.error('  HOSTINGER_FTP_HOST')
  console.error('  HOSTINGER_FTP_USER')
  console.error('  HOSTINGER_FTP_PASSWORD')
  console.error('Optional: HOSTINGER_FTP_REMOTE_PATH (default: /public_html)')
  process.exit(1)
}

if (!existsSync(distDir)) {
  console.error('dist/ not found. Run npm run build first.')
  process.exit(1)
}

const client = new Client(120_000)
client.ftp.verbose = env.DEPLOY_VERBOSE === 'true'

async function uploadDist(targetPath) {
  console.log(`Uploading dist/ to ${targetPath}...`)
  await client.ensureDir(targetPath)
  await client.cd(targetPath)
  await client.uploadFromDir(distDir)
  console.log(`Deployed to ${host}${targetPath}`)
}

try {
  console.log(`Connecting to ${host}...`)
  await client.access({ host, user, password, secure })

  const deployPaths = [remotePath, ...extraRemotePaths.filter((path) => path !== remotePath)]
  for (const targetPath of deployPaths) {
    await uploadDist(targetPath)
  }

  console.log(`\nDone. Uploaded to ${deployPaths.length} path(s).`)
} catch (error) {
  console.error('Deploy failed:', error.message)
  process.exit(1)
} finally {
  client.close()
}

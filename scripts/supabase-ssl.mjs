import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const projectRoot = join(__dirname, '..')
const defaultCertPath = join(projectRoot, 'supabase/certs/prod-ca-2021.crt')

function loadEnvFile() {
  const envPath = join(projectRoot, '.env')
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

export function resolveSupabaseSslCertPath(configuredPath) {
  const envFile = loadEnvFile()
  const raw =
    configuredPath ??
    process.env.SUPABASE_SSL_CERT_PATH ??
    process.env.VITE_SUPABASE_SSL_CERT_PATH ??
    envFile.SUPABASE_SSL_CERT_PATH ??
    envFile.VITE_SUPABASE_SSL_CERT_PATH ??
    defaultCertPath

  if (raw.startsWith('~/')) {
    return join(homedir(), raw.slice(2))
  }

  if (isAbsolute(raw)) {
    return raw
  }

  return resolve(projectRoot, raw)
}

export function readSupabaseSslCert(configuredPath) {
  const certPath = resolveSupabaseSslCertPath(configuredPath)
  if (!existsSync(certPath)) {
    throw new Error(`Supabase SSL certificate not found at ${certPath}`)
  }

  return readFileSync(certPath, 'utf8')
}

/** Configure Node and Postgres CLI tools to verify Supabase TLS with the project CA. */
export function applySupabaseSslEnv(configuredPath) {
  const certPath = resolveSupabaseSslCertPath(configuredPath)
  if (!existsSync(certPath)) {
    console.warn(`[supabase-ssl] Certificate not found at ${certPath}; skipping SSL env setup`)
    return null
  }

  process.env.NODE_EXTRA_CA_CERTS = certPath
  process.env.PGSSLROOTCERT = certPath
  process.env.PGSSLMODE = process.env.PGSSLMODE ?? 'verify-full'

  return certPath
}

export function getPostgresSslOptions(configuredPath) {
  return {
    rejectUnauthorized: true,
    ca: readSupabaseSslCert(configuredPath),
  }
}

import { spawnSync } from 'node:child_process'
import { applySupabaseSslEnv } from './supabase-ssl.mjs'

applySupabaseSslEnv()

const result = spawnSync('supabase', process.argv.slice(2), {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
})

process.exit(result.status ?? 1)

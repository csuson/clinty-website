import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// @ts-expect-error SSL helper is plain JavaScript
import { applySupabaseSslEnv } from './scripts/supabase-ssl.mjs'

applySupabaseSslEnv()

export default defineConfig({
  plugins: [react(), tailwindcss()],
})

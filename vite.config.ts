import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// @ts-expect-error SSL helper is plain JavaScript
import { applySupabaseSslEnv } from './scripts/supabase-ssl.mjs'

applySupabaseSslEnv()

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/ad-campaigns': {
        target: process.env.AD_CAMPAIGN_API_URL || 'http://127.0.0.1:8100',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ad-campaigns/, ''),
      },
    },
  },
})

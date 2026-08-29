/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly SUPABASE_SSL_CERT_PATH?: string
  readonly VITE_SUPABASE_SSL_CERT_PATH?: string
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_GOOGLE_REDIRECT_URI?: string
  readonly VITE_MICROSOFT_CLIENT_ID?: string
  readonly VITE_MICROSOFT_REDIRECT_URI?: string
  readonly VITE_SQUARE_APPLICATION_ID?: string
  readonly VITE_SQUARE_REDIRECT_URI?: string
  readonly VITE_SQUARE_SANDBOX?: string
  readonly VITE_SHOPIFY_CLIENT_ID?: string
  readonly VITE_SHOPIFY_REDIRECT_URI?: string
  readonly VITE_ADMIN_EMAILS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

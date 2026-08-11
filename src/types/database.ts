export type Plan = 'starter' | 'growth' | 'business'
export type BillingStatus = 'trialing' | 'active' | 'past_due' | 'canceled'

export type Profile = {
  id: string
  email: string
  full_name: string | null
  company_name: string | null
  plan: Plan
  billing_status: BillingStatus
  trial_ends_at: string | null
  created_at: string
  updated_at: string
}

export type ApiKey = {
  id: string
  user_id: string
  name: string
  key_prefix: string
  key_hash: string
  key_secret?: string | null
  last_used_at: string | null
  created_at: string
  revoked_at: string | null
}

export type GmailConnection = {
  user_id: string
  google_email: string | null
  scopes: string[]
  connected_at: string
  token_expiry: string | null
  status: 'connected' | 'disconnected' | 'error'
}

export type GmailToken = {
  user_id: string
  access_token: string
  refresh_token: string | null
  token_uri: string
  client_id: string
  client_secret: string
  scopes: string[]
  universe_domain: string
  google_account: string | null
  expiry: string | null
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: {
          id: string
          email: string
          full_name?: string | null
          company_name?: string | null
          plan?: Plan
          billing_status?: BillingStatus
          trial_ends_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string
          full_name?: string | null
          company_name?: string | null
          plan?: Plan
          billing_status?: BillingStatus
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: ApiKey
        Insert: {
          id?: string
          user_id: string
          name: string
          key_prefix: string
          key_hash: string
          key_secret?: string | null
          last_used_at?: string | null
          created_at?: string
          revoked_at?: string | null
        }
        Update: {
          name?: string
          last_used_at?: string | null
          revoked_at?: string | null
        }
        Relationships: []
      }
      gmail_connections: {
        Row: GmailConnection
        Insert: {
          user_id: string
          google_email?: string | null
          scopes?: string[]
          connected_at?: string
          token_expiry?: string | null
          status?: 'connected' | 'disconnected' | 'error'
        }
        Update: {
          google_email?: string | null
          scopes?: string[]
          token_expiry?: string | null
          status?: 'connected' | 'disconnected' | 'error'
        }
        Relationships: []
      }
      gmail_tokens: {
        Row: GmailToken
        Insert: {
          user_id: string
          access_token: string
          refresh_token?: string | null
          token_uri?: string
          client_id: string
          client_secret: string
          scopes?: string[]
          universe_domain?: string
          google_account?: string | null
          expiry?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          refresh_token?: string | null
          token_uri?: string
          client_id?: string
          client_secret?: string
          scopes?: string[]
          universe_domain?: string
          google_account?: string | null
          expiry?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export const PLAN_DETAILS: Record<
  Plan,
  { name: string; price: number; description: string }
> = {
  starter: { name: 'Starter', price: 29, description: '1 AI agent, up to 50 emails/day' },
  growth: { name: 'Growth', price: 59, description: '3 AI agents, unlimited emails' },
  business: { name: 'Business', price: 99, description: 'Unlimited agents and team features' },
}

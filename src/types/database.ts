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

export type OutlookConnection = {
  user_id: string
  outlook_email: string | null
  scopes: string[]
  connected_at: string
  token_expiry: string | null
  status: 'connected' | 'disconnected' | 'error'
}

export type OutlookToken = {
  user_id: string
  access_token: string
  refresh_token: string | null
  token_uri: string
  client_id: string
  client_secret: string
  scopes: string[]
  outlook_account: string | null
  expiry: string | null
  updated_at: string
}

export type ShopifyConnection = {
  user_id: string
  shop_domain: string | null
  shop_name: string | null
  scopes: string[]
  connected_at: string
  status: 'connected' | 'disconnected' | 'error'
}

export type ShopifyToken = {
  user_id: string
  shop_domain: string
  access_token: string
  client_id: string
  scopes: string[]
  updated_at: string
}

export type SquareConnection = {
  user_id: string
  merchant_id: string | null
  business_name: string | null
  location_id: string | null
  location_name: string | null
  team_member_id: string | null
  timezone: string | null
  service_variation_id: string | null
  service_variation_version: number | null
  service_variation_name: string | null
  scopes: string[]
  connected_at: string
  token_expiry: string | null
  status: 'connected' | 'disconnected' | 'error'
}

export type SquareToken = {
  user_id: string
  access_token: string
  refresh_token: string | null
  merchant_id: string
  application_id: string
  expires_at: string | null
  scopes: string[]
  updated_at: string
}

export type UserPrompts = {
  user_id: string
  background: string | null
  calendar_preference: string | null
  default_footer: string | null
  created_at: string
  updated_at: string
}

export type AgentSettings = {
  id: string
  user_id: string
  name: string
  clinty_api_key_id: string | null
  langgraph_api_key: string | null
  url: string | null
  graph_id: string | null
  openapi_key: string | null
  database_uri: string | null
  redis_uri: string | null
  secrets_dir: string | null
  calendar_provider: string | null
  square_access_token: string | null
  square_location_id: string | null
  square_service_variation_id: string | null
  square_service_variation_version: number | null
  square_team_member_id: string | null
  square_timezone: string | null
  auto_book_scheduling: boolean | null
  auto_respond_instruction: boolean | null
  auto_respond_scheduling: boolean | null
  environment: string | null
  log_level: string | null
  pgoptions: string | null
  postgres_schema: string | null
  created_at: string
  updated_at: string
}

export type WhatsAppConnection = {
  user_id: string
  phone: string | null
  connected_at: string
  status: 'connected' | 'disconnected' | 'pairing' | 'error'
  last_error: string | null
  gateway_url: string | null
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
      outlook_connections: {
        Row: OutlookConnection
        Insert: {
          user_id: string
          outlook_email?: string | null
          scopes?: string[]
          connected_at?: string
          token_expiry?: string | null
          status?: 'connected' | 'disconnected' | 'error'
        }
        Update: {
          outlook_email?: string | null
          scopes?: string[]
          token_expiry?: string | null
          status?: 'connected' | 'disconnected' | 'error'
        }
        Relationships: []
      }
      outlook_tokens: {
        Row: OutlookToken
        Insert: {
          user_id: string
          access_token: string
          refresh_token?: string | null
          token_uri?: string
          client_id: string
          client_secret: string
          scopes?: string[]
          outlook_account?: string | null
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
          outlook_account?: string | null
          expiry?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shopify_connections: {
        Row: ShopifyConnection
        Insert: {
          user_id: string
          shop_domain?: string | null
          shop_name?: string | null
          scopes?: string[]
          connected_at?: string
          status?: 'connected' | 'disconnected' | 'error'
        }
        Update: {
          shop_domain?: string | null
          shop_name?: string | null
          scopes?: string[]
          status?: 'connected' | 'disconnected' | 'error'
        }
        Relationships: []
      }
      shopify_tokens: {
        Row: ShopifyToken
        Insert: {
          user_id: string
          shop_domain: string
          access_token: string
          client_id: string
          scopes?: string[]
          updated_at?: string
        }
        Update: {
          shop_domain?: string
          access_token?: string
          client_id?: string
          scopes?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      square_connections: {
        Row: SquareConnection
        Insert: {
          user_id: string
          merchant_id?: string | null
          business_name?: string | null
          location_id?: string | null
          location_name?: string | null
          team_member_id?: string | null
          timezone?: string | null
          service_variation_id?: string | null
          service_variation_version?: number | null
          service_variation_name?: string | null
          scopes?: string[]
          connected_at?: string
          token_expiry?: string | null
          status?: 'connected' | 'disconnected' | 'error'
        }
        Update: {
          merchant_id?: string | null
          business_name?: string | null
          location_id?: string | null
          location_name?: string | null
          team_member_id?: string | null
          timezone?: string | null
          service_variation_id?: string | null
          service_variation_version?: number | null
          service_variation_name?: string | null
          scopes?: string[]
          token_expiry?: string | null
          status?: 'connected' | 'disconnected' | 'error'
        }
        Relationships: []
      }
      square_tokens: {
        Row: SquareToken
        Insert: {
          user_id: string
          access_token: string
          refresh_token?: string | null
          merchant_id: string
          application_id: string
          expires_at?: string | null
          scopes?: string[]
          updated_at?: string
        }
        Update: {
          access_token?: string
          refresh_token?: string | null
          merchant_id?: string
          application_id?: string
          expires_at?: string | null
          scopes?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      user_prompts: {
        Row: UserPrompts
        Insert: {
          user_id: string
          background?: string | null
          calendar_preference?: string | null
          default_footer?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          background?: string | null
          calendar_preference?: string | null
          default_footer?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_connections: {
        Row: WhatsAppConnection & { gateway_api_key: string | null }
        Insert: {
          user_id: string
          phone?: string | null
          connected_at?: string
          status?: 'connected' | 'disconnected' | 'pairing' | 'error'
          last_error?: string | null
          gateway_url?: string | null
          gateway_api_key?: string | null
        }
        Update: {
          phone?: string | null
          connected_at?: string
          status?: 'connected' | 'disconnected' | 'pairing' | 'error'
          last_error?: string | null
          gateway_url?: string | null
          gateway_api_key?: string | null
        }
        Relationships: []
      }
      agent_settings: {
        Row: AgentSettings
        Insert: {
          id?: string
          user_id: string
          name: string
          clinty_api_key_id?: string | null
          langgraph_api_key?: string | null
          url?: string | null
          graph_id?: string | null
          openapi_key?: string | null
          database_uri?: string | null
          redis_uri?: string | null
          secrets_dir?: string | null
          calendar_provider?: string | null
          square_access_token?: string | null
          square_location_id?: string | null
          square_service_variation_id?: string | null
          square_service_variation_version?: number | null
          square_team_member_id?: string | null
          square_timezone?: string | null
          auto_book_scheduling?: boolean | null
          auto_respond_instruction?: boolean | null
          auto_respond_scheduling?: boolean | null
          environment?: string | null
          log_level?: string | null
          pgoptions?: string | null
          postgres_schema?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          clinty_api_key_id?: string | null
          langgraph_api_key?: string | null
          url?: string | null
          graph_id?: string | null
          openapi_key?: string | null
          database_uri?: string | null
          redis_uri?: string | null
          secrets_dir?: string | null
          calendar_provider?: string | null
          square_access_token?: string | null
          square_location_id?: string | null
          square_service_variation_id?: string | null
          square_service_variation_version?: number | null
          square_team_member_id?: string | null
          square_timezone?: string | null
          auto_book_scheduling?: boolean | null
          auto_respond_instruction?: boolean | null
          auto_respond_scheduling?: boolean | null
          environment?: string | null
          log_level?: string | null
          pgoptions?: string | null
          postgres_schema?: string | null
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

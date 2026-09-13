-- Site-wide infrastructure defaults (admin-editable). Edge Function secrets remain fallback.
create table if not exists public.website_infrastructure (
  id smallint primary key default 1 check (id = 1),
  whatsapp_web_gateway_url text not null default '',
  whatsapp_web_login_api_key text not null default '',
  whatsapp_web_debug text not null default '1',
  whatsapp_web_auth_backend text not null default 'supabase',
  whatsapp_web_auth_bucket text not null default 'whatsapp-web-auth',
  whatsapp_web_auth_storage_prefix text not null default 'default',
  whatsapp_web_auth_dir text not null default '/tmp/whatsapp-web-auth',
  updated_at timestamptz not null default now()
);

alter table public.website_infrastructure enable row level security;

insert into public.website_infrastructure (id)
values (1)
on conflict (id) do nothing;

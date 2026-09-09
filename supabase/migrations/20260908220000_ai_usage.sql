-- AI token usage tracking and configurable monthly limits

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  feature text not null,
  model text not null,
  prompt_tokens integer not null default 0 check (prompt_tokens >= 0),
  completion_tokens integer not null default 0 check (completion_tokens >= 0),
  total_tokens integer not null default 0 check (total_tokens >= 0),
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_events_user_created_idx
  on public.ai_usage_events (user_id, created_at desc);

create index if not exists ai_usage_events_user_month_idx
  on public.ai_usage_events (user_id, created_at);

alter table public.ai_usage_events enable row level security;

drop policy if exists "Users can view own AI usage" on public.ai_usage_events;
create policy "Users can view own AI usage"
  on public.ai_usage_events for select
  using (auth.uid() = user_id);

create table if not exists public.platform_ai_settings (
  id integer primary key default 1 check (id = 1),
  monthly_token_limit integer not null default 100000 check (monthly_token_limit > 0),
  updated_at timestamptz not null default now()
);

insert into public.platform_ai_settings (id, monthly_token_limit)
values (1, 100000)
on conflict (id) do nothing;

alter table public.platform_ai_settings enable row level security;

drop policy if exists "Authenticated users can read AI limits" on public.platform_ai_settings;
create policy "Authenticated users can read AI limits"
  on public.platform_ai_settings for select
  to authenticated
  using (true);

alter table public.profiles
  add column if not exists ai_monthly_token_limit integer check (ai_monthly_token_limit is null or ai_monthly_token_limit > 0);

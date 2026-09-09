-- Track monthly AI usage alert emails (90% warning, 100% limit reached).

create table if not exists public.ai_usage_alert_state (
  user_id uuid not null references auth.users (id) on delete cascade,
  month_start date not null,
  alert_90_sent_at timestamptz,
  alert_100_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, month_start)
);

create index if not exists ai_usage_alert_state_user_month_idx
  on public.ai_usage_alert_state (user_id, month_start desc);

alter table public.ai_usage_alert_state enable row level security;

drop trigger if exists ai_usage_alert_state_updated_at on public.ai_usage_alert_state;
create trigger ai_usage_alert_state_updated_at
  before update on public.ai_usage_alert_state
  for each row execute function public.set_updated_at();

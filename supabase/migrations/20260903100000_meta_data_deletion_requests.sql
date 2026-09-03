-- Meta Data Deletion Request callback audit + status lookups (App Dashboard compliance)
create table if not exists public.meta_data_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  confirmation_code text not null unique,
  meta_user_id text not null,
  clinty_user_id uuid references auth.users (id) on delete set null,
  status text not null check (status in ('pending', 'completed', 'no_data')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists meta_data_deletion_requests_meta_user_id_idx
  on public.meta_data_deletion_requests (meta_user_id);

alter table public.meta_data_deletion_requests enable row level security;

-- Service role only (edge function); no client policies.

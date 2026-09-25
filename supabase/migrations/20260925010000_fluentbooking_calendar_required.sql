-- FluentBooking: calendar_id required, event_id optional; expose calendar_id on connections

alter table public.fluentbooking_connections
  add column if not exists calendar_id text;

-- Backfill tokens: prefer existing calendar_id, else copy event_id so NOT NULL can apply
update public.fluentbooking_tokens
set calendar_id = coalesce(nullif(trim(calendar_id), ''), nullif(trim(event_id), ''), 'unknown')
where calendar_id is null or trim(calendar_id) = '';

alter table public.fluentbooking_tokens
  alter column event_id drop not null;

alter table public.fluentbooking_tokens
  alter column calendar_id set not null;

-- Mirror calendar_id onto connections for account UI
update public.fluentbooking_connections c
set calendar_id = t.calendar_id
from public.fluentbooking_tokens t
where c.user_id = t.user_id
  and (c.calendar_id is null or trim(c.calendar_id) = '');

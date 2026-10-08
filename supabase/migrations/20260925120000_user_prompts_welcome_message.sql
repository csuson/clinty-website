-- Discovery-phase welcome copy (set by tenant on Prompts; not part of Background generation)
alter table public.user_prompts
  add column if not exists welcome_message text;

comment on column public.user_prompts.welcome_message is
  'Warm discovery/first-reply welcome text the agent leads with; edited separately from Business Background';

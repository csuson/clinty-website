-- Current promotions / specials the agent can mention in replies
alter table public.user_prompts
  add column if not exists promotions text;

comment on column public.user_prompts.promotions is
  'Current promotions, discounts, and time-limited offers for customer replies';

-- Fixed checkout URLs (Square, Wix, etc.) the agent may include when customers ask to pay
alter table public.user_prompts
  add column if not exists payment_links text;

comment on column public.user_prompts.payment_links is
  'Labeled payment/checkout URLs (Square Payment Links, Wix pay links, etc.) for replies when customers ask to pay';

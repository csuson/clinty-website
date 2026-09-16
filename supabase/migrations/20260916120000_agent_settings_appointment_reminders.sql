alter table public.agent_settings
  add column if not exists appointment_reminders_enabled boolean not null default true;

alter table public.agent_settings
  add column if not exists appointment_reminder_email_hours text not null default '24';

alter table public.agent_settings
  add column if not exists appointment_reminder_whatsapp_hours text not null default '2';

comment on column public.agent_settings.appointment_reminders_enabled is
  'When true, queue email/WhatsApp reminders after schedule_meeting_tool bookings (requires DATABASE_URI).';

comment on column public.agent_settings.appointment_reminder_email_hours is
  'Comma-separated hours before start to email the attendee (e.g. 24,2).';

comment on column public.agent_settings.appointment_reminder_whatsapp_hours is
  'Comma-separated hours before start to WhatsApp the customer when phone is known (e.g. 2).';

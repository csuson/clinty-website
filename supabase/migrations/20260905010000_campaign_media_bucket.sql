insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'campaign-media',
  'campaign-media',
  true,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users upload own campaign media" on storage.objects;
create policy "Users upload own campaign media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'campaign-media'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "Users update own campaign media" on storage.objects;
create policy "Users update own campaign media"
on storage.objects for update
to authenticated
using (
  bucket_id = 'campaign-media'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "Users delete own campaign media" on storage.objects;
create policy "Users delete own campaign media"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'campaign-media'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "Public read campaign media" on storage.objects;
create policy "Public read campaign media"
on storage.objects for select
using (bucket_id = 'campaign-media');

-- =============================================================================
-- Digital Card — 0004_storage: avatars / logos buckets
-- Public read; uploads only into the caller's own "{user_id}/" folder, ≤ 2 MB, jpeg/png/webp.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('logos',   'logos',   true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "card images: public read"
  on storage.objects for select to anon, authenticated
  using (bucket_id in ('avatars', 'logos'));

create policy "card images: owner insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('avatars', 'logos')
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

create policy "card images: owner update"
  on storage.objects for update to authenticated
  using (bucket_id in ('avatars', 'logos') and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (
    bucket_id in ('avatars', 'logos')
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

create policy "card images: owner delete"
  on storage.objects for delete to authenticated
  using (bucket_id in ('avatars', 'logos') and (storage.foldername(name))[1] = (select auth.uid())::text);

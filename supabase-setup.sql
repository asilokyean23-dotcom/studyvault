-- Run this in Supabase Dashboard > SQL Editor.
-- Creates a PRIVATE bucket and rules so each signed-in user can only access their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'school-files',
  'school-files',
  false,
  52428800,
  null
)
on conflict (id) do update set
  public = false,
  file_size_limit = 52428800;

-- Remove existing policies with these names before re-running this script.
drop policy if exists "Users can view their own school files" on storage.objects;
drop policy if exists "Users can upload to their own school folder" on storage.objects;
drop policy if exists "Users can update their own school files" on storage.objects;
drop policy if exists "Users can delete their own school files" on storage.objects;

create policy "Users can view their own school files"
on storage.objects for select to authenticated
using (bucket_id = 'school-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can upload to their own school folder"
on storage.objects for insert to authenticated
with check (bucket_id = 'school-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update their own school files"
on storage.objects for update to authenticated
using (bucket_id = 'school-files' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'school-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own school files"
on storage.objects for delete to authenticated
using (bucket_id = 'school-files' and (storage.foldername(name))[1] = auth.uid()::text);

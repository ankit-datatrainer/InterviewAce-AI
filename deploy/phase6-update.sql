-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 6: coach profile-photo uploads.
--
-- Adds a public 'coach-avatars' storage bucket so a coach can upload their
-- profile picture from the Coach Portal, and a super admin can upload/replace
-- a coach's picture from Coach Management (both when creating a new coach and
-- when editing an existing one). Public-read so the image renders everywhere
-- the coach card appears. Safe to run multiple times.
-- ═══════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
  values ('coach-avatars', 'coach-avatars', true)
  on conflict (id) do nothing;

-- Any signed-in user (a coach for themselves, or an admin for any coach) may upload.
drop policy if exists "Authenticated uploads coach avatars" on storage.objects;
create policy "Authenticated uploads coach avatars" on storage.objects
  for insert with check (bucket_id = 'coach-avatars' and auth.uid() is not null);

-- Owner or admin may replace/delete.
drop policy if exists "Owner or admin deletes coach avatars" on storage.objects;
create policy "Owner or admin deletes coach avatars" on storage.objects
  for delete using (bucket_id = 'coach-avatars' and (owner = auth.uid() or public.is_admin()));

drop policy if exists "Owner or admin updates coach avatars" on storage.objects;
create policy "Owner or admin updates coach avatars" on storage.objects
  for update using (bucket_id = 'coach-avatars' and (owner = auth.uid() or public.is_admin()));

-- Anyone can read (renders on public coach cards / marketplace).
drop policy if exists "Anyone reads coach avatars" on storage.objects;
create policy "Anyone reads coach avatars" on storage.objects
  for select using (bucket_id = 'coach-avatars');

-- Interview WOW privacy hardening.
-- Run once in the Supabase SQL editor after the base schema migrations.

insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do update set public = false;

drop policy if exists "Anyone reads resumes" on storage.objects;
drop policy if exists "Public reads resumes" on storage.objects;
drop policy if exists "Authenticated reads resumes" on storage.objects;
drop policy if exists "Users read own resume files" on storage.objects;
create policy "Users read own resume files" on storage.objects
  for select
  using (
    bucket_id = 'resumes'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

drop policy if exists "Users delete own resume files" on storage.objects;
create policy "Users delete own resume files" on storage.objects
  for delete
  using (
    bucket_id = 'resumes'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

-- Coaching recordings are private too. Only the object owner or an admin may
-- read/delete them; authenticated users must never see other users' sessions.
drop policy if exists "Authenticated reads recordings" on storage.objects;
drop policy if exists "Owner or admin reads recordings" on storage.objects;
create policy "Owner or admin reads recordings" on storage.objects
  for select
  using (
    bucket_id = 'session-recordings'
    and (owner = auth.uid() or public.is_admin())
  );

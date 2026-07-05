-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 2: coach sees student resume/ATS score, admin calendar control,
-- session recording for coaching calls. Safe to run multiple times.
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────── Coach can read their students' resumes ───────────
drop policy if exists "Coach reads own students resumes" on public.resumes;
create policy "Coach reads own students resumes" on public.resumes
  for select using (
    exists (
      select 1 from public.bookings b
      where b.user_id = resumes.user_id and b.coach_id = public.current_coach_id()
    )
  );

-- ───────────────────────── Coach calendar control ────────────────────────────
-- Admin can pause a coach's new bookings without hiding their public profile.
alter table public.coaches add column if not exists accepting_bookings boolean not null default true;
-- Admin can allow/disallow a coach from recording their own sessions.
alter table public.coaches add column if not exists recording_enabled boolean not null default true;

-- Coaches previously had NO write access to their own bookings (only the
-- student who booked or an admin could update a row) — updateSession() and
-- the new recording upload both need this.
drop policy if exists "Coach manages own bookings" on public.bookings;
create policy "Coach manages own bookings" on public.bookings
  for update using (coach_id = public.current_coach_id())
  with check (coach_id = public.current_coach_id());

-- ───────────────────────── Session recording ─────────────────────────────────
alter table public.bookings add column if not exists recording_url text;

insert into storage.buckets (id, name, public)
  values ('session-recordings', 'session-recordings', false)
  on conflict (id) do nothing;

drop policy if exists "Authenticated uploads recordings" on storage.objects;
create policy "Authenticated uploads recordings" on storage.objects
  for insert with check (bucket_id = 'session-recordings' and auth.uid() is not null);
drop policy if exists "Authenticated reads recordings" on storage.objects;
create policy "Authenticated reads recordings" on storage.objects
  for select using (bucket_id = 'session-recordings' and auth.uid() is not null);
drop policy if exists "Admin deletes recordings" on storage.objects;
create policy "Admin deletes recordings" on storage.objects
  for delete using (bucket_id = 'session-recordings' and (owner = auth.uid() or public.is_admin()));

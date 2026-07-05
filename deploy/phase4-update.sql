-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 4: date-specific session slots (the 5-day calendar manager).
-- Coaches AND super admins can open a specific date and add exact session
-- timings for it, on top of / instead of the recurring weekly availability.
-- Safe to run multiple times.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.coach_date_slots (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references public.coaches(id) on delete cascade,
  slot_date  date not null,
  start_time text not null,   -- 'HH:MM'
  end_time   text not null,   -- 'HH:MM'
  created_at timestamptz not null default now(),
  unique (coach_id, slot_date, start_time, end_time)
);

create index if not exists coach_date_slots_coach_date_idx
  on public.coach_date_slots (coach_id, slot_date);

alter table public.coach_date_slots enable row level security;

-- Anyone signed in can read a coach's date slots (students need them to book).
drop policy if exists "Anyone reads coach date slots" on public.coach_date_slots;
create policy "Anyone reads coach date slots" on public.coach_date_slots
  for select using (true);

-- A coach manages their own date slots.
drop policy if exists "Coach manages own date slots" on public.coach_date_slots;
create policy "Coach manages own date slots" on public.coach_date_slots
  for all using (coach_id = public.current_coach_id())
  with check (coach_id = public.current_coach_id());

-- Super admin manages any coach's date slots.
drop policy if exists "Admin manages date slots" on public.coach_date_slots;
create policy "Admin manages date slots" on public.coach_date_slots
  for all using (public.is_admin()) with check (public.is_admin());

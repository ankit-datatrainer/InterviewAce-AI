-- ═══════════════════════════════════════════════════════════════════════════
-- InterviewAce AI — Marketplace update (Super Admin + Coach Control)
-- Run AFTER database-setup.sql. Idempotent: safe to run multiple times.
-- Adds: coach priority/visibility/certificates, user bans, coupons,
--       coach CRM (notes/homework/goals), certificate storage bucket,
--       and column-protection so coaches cannot change price/commission.
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────── Coaches: marketplace controls ─────────────────────
alter table public.coaches add column if not exists priority text not null default 'New'
  check (priority in ('Premium', 'Featured', 'New', 'Standard'));
alter table public.coaches add column if not exists visibility boolean not null default true;
alter table public.coaches add column if not exists certificates text[] default '{}';
alter table public.coaches add column if not exists languages text[] default '{}';
alter table public.coaches add column if not exists intro_video_url text;
alter table public.coaches add column if not exists kyc_verified boolean not null default false;

-- ───────────────────────── Profiles: moderation ─────────────────────────────
alter table public.profiles add column if not exists is_banned boolean not null default false;

-- ───────────────────────── Coupons ──────────────────────────────────────────
create table if not exists public.coupons (
  id uuid default uuid_generate_v4() primary key,
  code text not null unique,
  discount_percentage integer not null check (discount_percentage between 1 and 100),
  active boolean not null default true,
  max_uses integer,                -- null = unlimited
  current_uses integer not null default 0,
  expires_at timestamptz,
  created_at timestamptz default now()
);

-- ───────────────────────── Coach CRM ────────────────────────────────────────
create table if not exists public.coach_notes (
  id uuid default uuid_generate_v4() primary key,
  coach_id uuid references public.coaches(id) on delete cascade not null,
  student_id uuid references public.profiles(id) on delete cascade not null,
  booking_id uuid references public.bookings(id) on delete set null,
  notes text not null,
  created_at timestamptz default now()
);
create table if not exists public.coach_homework (
  id uuid default uuid_generate_v4() primary key,
  coach_id uuid references public.coaches(id) on delete cascade not null,
  student_id uuid references public.profiles(id) on delete cascade not null,
  task text not null,
  status text not null default 'assigned' check (status in ('assigned', 'submitted', 'done')),
  due_date date,
  created_at timestamptz default now()
);
create table if not exists public.coach_goals (
  id uuid default uuid_generate_v4() primary key,
  coach_id uuid references public.coaches(id) on delete cascade not null,
  student_id uuid references public.profiles(id) on delete cascade not null,
  goal text not null,
  progress integer not null default 0 check (progress between 0 and 100),
  created_at timestamptz default now()
);

-- ───────────────────────── Indexes ──────────────────────────────────────────
create index if not exists idx_coach_notes_coach on public.coach_notes(coach_id);
create index if not exists idx_coach_homework_coach on public.coach_homework(coach_id);
create index if not exists idx_coach_homework_student on public.coach_homework(student_id);
create index if not exists idx_coach_goals_coach on public.coach_goals(coach_id);
create index if not exists idx_coupons_code on public.coupons(code);

-- ───────────────────────── Column protection trigger ────────────────────────
-- Coaches may edit their profile but NEVER pricing, commission, verification,
-- priority, or visibility — those are admin-only. RLS cannot protect columns,
-- so a trigger reverts restricted fields unless the caller is an admin.
create or replace function public.protect_coach_restricted_cols()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.price_per_session := old.price_per_session;
    new.commission_pct    := old.commission_pct;
    new.is_verified       := old.is_verified;
    new.kyc_verified      := old.kyc_verified;
    new.priority          := old.priority;
    new.visibility        := old.visibility;
    new.status            := old.status;
    new.rating            := old.rating;
    new.total_reviews     := old.total_reviews;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_protect_coach_cols on public.coaches;
create trigger trg_protect_coach_cols
  before update on public.coaches
  for each row execute function public.protect_coach_restricted_cols();

-- ───────────────────────── RLS ───────────────────────────────────────────────
alter table public.coupons enable row level security;
alter table public.coach_notes enable row level security;
alter table public.coach_homework enable row level security;
alter table public.coach_goals enable row level security;

-- Coupons: admins manage; signed-in users may read active coupons (to redeem).
drop policy if exists "Admins manage coupons" on public.coupons;
create policy "Admins manage coupons" on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Users read active coupons" on public.coupons;
create policy "Users read active coupons" on public.coupons
  for select using (active = true and auth.uid() is not null);

-- Coach notes: private to the coach (and admins).
drop policy if exists "Coach owns notes" on public.coach_notes;
create policy "Coach owns notes" on public.coach_notes
  for all using (coach_id = public.current_coach_id() or public.is_admin())
  with check (coach_id = public.current_coach_id() or public.is_admin());

-- Homework: coach manages; the assigned student can view and mark submitted.
drop policy if exists "Coach owns homework" on public.coach_homework;
create policy "Coach owns homework" on public.coach_homework
  for all using (coach_id = public.current_coach_id() or public.is_admin())
  with check (coach_id = public.current_coach_id() or public.is_admin());
drop policy if exists "Student views own homework" on public.coach_homework;
create policy "Student views own homework" on public.coach_homework
  for select using (student_id = auth.uid());
drop policy if exists "Student updates own homework status" on public.coach_homework;
create policy "Student updates own homework status" on public.coach_homework
  for update using (student_id = auth.uid()) with check (student_id = auth.uid());

-- Goals: coach manages; student can view their own goals.
drop policy if exists "Coach owns goals" on public.coach_goals;
create policy "Coach owns goals" on public.coach_goals
  for all using (coach_id = public.current_coach_id() or public.is_admin())
  with check (coach_id = public.current_coach_id() or public.is_admin());
drop policy if exists "Student views own goals" on public.coach_goals;
create policy "Student views own goals" on public.coach_goals
  for select using (student_id = auth.uid());

-- Coaches may only read profiles/interviews of students they actually coach.
-- (Students they share at least one booking with.)
drop policy if exists "Coach reads own students profiles" on public.profiles;
create policy "Coach reads own students profiles" on public.profiles
  for select using (
    exists (
      select 1 from public.bookings b
      where b.user_id = profiles.id and b.coach_id = public.current_coach_id()
    )
  );
drop policy if exists "Coach reads own students interviews" on public.interviews;
create policy "Coach reads own students interviews" on public.interviews
  for select using (
    exists (
      select 1 from public.bookings b
      where b.user_id = interviews.user_id and b.coach_id = public.current_coach_id()
    )
  );

-- ───────────────────────── Certificate storage bucket ───────────────────────
-- Public-read bucket for coach certificates (PDF / images).
insert into storage.buckets (id, name, public)
  values ('coach-certificates', 'coach-certificates', true)
  on conflict (id) do nothing;

drop policy if exists "Coach uploads own certificates" on storage.objects;
create policy "Coach uploads own certificates" on storage.objects
  for insert with check (
    bucket_id = 'coach-certificates' and auth.uid() is not null
  );
drop policy if exists "Coach deletes own certificates" on storage.objects;
create policy "Coach deletes own certificates" on storage.objects
  for delete using (
    bucket_id = 'coach-certificates' and (owner = auth.uid() or public.is_admin())
  );
drop policy if exists "Anyone reads certificates" on storage.objects;
create policy "Anyone reads certificates" on storage.objects
  for select using (bucket_id = 'coach-certificates');

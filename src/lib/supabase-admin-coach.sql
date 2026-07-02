-- InterviewAce AI — Admin + Coach panel migration
-- Run this in the Supabase SQL Editor AFTER supabase-schema.sql.
-- It is idempotent where practical (uses IF NOT EXISTS / drop-create for policies).

-- ─────────────────────────────────────────────────────────────
-- 1. Roles
-- ─────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists role text not null default 'student'
  check (role in ('student', 'coach', 'admin'));

-- Promote the known admin accounts. Edit the emails to match yours.
update public.profiles set role = 'admin'
  where lower(email) in ('admin@interviewace.ai', 'ankit@interviewace.ai');

-- ─────────────────────────────────────────────────────────────
-- 2. Coaches: richer profile + link to an auth user + approval status
-- ─────────────────────────────────────────────────────────────
alter table public.coaches add column if not exists user_id uuid references public.profiles(id) on delete set null;
alter table public.coaches add column if not exists title text;
alter table public.coaches add column if not exists bio text;
alter table public.coaches add column if not exists tags text[] default '{}';
alter table public.coaches add column if not exists image_url text;
alter table public.coaches add column if not exists email text;
alter table public.coaches add column if not exists commission_pct integer default 20;
alter table public.coaches add column if not exists status text not null default 'approved'
  check (status in ('pending', 'approved', 'suspended'));

-- ─────────────────────────────────────────────────────────────
-- 3. Bookings: room + notes + amount snapshot
-- ─────────────────────────────────────────────────────────────
alter table public.bookings add column if not exists room_id text;
alter table public.bookings add column if not exists notes text;
alter table public.bookings add column if not exists amount integer;

-- ─────────────────────────────────────────────────────────────
-- 4. New tables
-- ─────────────────────────────────────────────────────────────
create table if not exists public.coach_availability (
  id uuid default uuid_generate_v4() primary key,
  coach_id uuid references public.coaches(id) on delete cascade not null,
  weekday integer not null check (weekday between 0 and 6), -- 0 = Sunday
  start_time time not null,
  end_time time not null,
  created_at timestamptz default now()
);

create table if not exists public.coach_blocked_dates (
  id uuid default uuid_generate_v4() primary key,
  coach_id uuid references public.coaches(id) on delete cascade not null,
  blocked_date date not null,
  created_at timestamptz default now()
);

create table if not exists public.payouts (
  id uuid default uuid_generate_v4() primary key,
  coach_id uuid references public.coaches(id) on delete cascade not null,
  amount integer not null,
  period_start date,
  period_end date,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.reviews (
  id uuid default uuid_generate_v4() primary key,
  booking_id uuid references public.bookings(id) on delete cascade,
  coach_id uuid references public.coaches(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now()
);

create table if not exists public.audit_logs (
  id uuid default uuid_generate_v4() primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_email text,
  action text not null,
  target_type text,
  target_id text,
  meta jsonb,
  created_at timestamptz default now()
);

create table if not exists public.announcements (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  body text not null,
  audience text not null default 'all' check (audience in ('all', 'students', 'coaches')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- 5. Helper functions (SECURITY DEFINER to avoid RLS recursion)
-- ─────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.current_coach_id()
returns uuid language sql security definer stable as $$
  select id from public.coaches where user_id = auth.uid() limit 1;
$$;

-- ─────────────────────────────────────────────────────────────
-- 6. RLS
-- ─────────────────────────────────────────────────────────────
alter table public.coach_availability enable row level security;
alter table public.coach_blocked_dates enable row level security;
alter table public.payouts enable row level security;
alter table public.reviews enable row level security;
alter table public.audit_logs enable row level security;
alter table public.announcements enable row level security;

-- Admin: full access across the platform.
drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage coaches" on public.coaches;
create policy "Admins manage coaches" on public.coaches for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins read interviews" on public.interviews;
create policy "Admins read interviews" on public.interviews for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins read resumes" on public.resumes;
create policy "Admins read resumes" on public.resumes for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage bookings" on public.bookings;
create policy "Admins manage bookings" on public.bookings for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage tickets" on public.contact_messages;
create policy "Admins manage tickets" on public.contact_messages for all using (public.is_admin()) with check (public.is_admin());

-- Coaches: can edit their own coach row.
drop policy if exists "Coaches update own row" on public.coaches;
create policy "Coaches update own row" on public.coaches for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Coach availability: coach manages own, anyone can read (students see open slots).
drop policy if exists "Read availability" on public.coach_availability;
create policy "Read availability" on public.coach_availability for select using (true);
drop policy if exists "Coach manages availability" on public.coach_availability;
create policy "Coach manages availability" on public.coach_availability for all
  using (coach_id = public.current_coach_id() or public.is_admin())
  with check (coach_id = public.current_coach_id() or public.is_admin());

drop policy if exists "Read blocked dates" on public.coach_blocked_dates;
create policy "Read blocked dates" on public.coach_blocked_dates for select using (true);
drop policy if exists "Coach manages blocked dates" on public.coach_blocked_dates;
create policy "Coach manages blocked dates" on public.coach_blocked_dates for all
  using (coach_id = public.current_coach_id() or public.is_admin())
  with check (coach_id = public.current_coach_id() or public.is_admin());

-- Payouts: coach reads own, admin manages all.
drop policy if exists "Coach reads payouts" on public.payouts;
create policy "Coach reads payouts" on public.payouts for select
  using (coach_id = public.current_coach_id() or public.is_admin());
drop policy if exists "Admin manages payouts" on public.payouts;
create policy "Admin manages payouts" on public.payouts for all using (public.is_admin()) with check (public.is_admin());

-- Reviews: anyone reads, students write reviews for their own bookings, admin manages.
drop policy if exists "Read reviews" on public.reviews;
create policy "Read reviews" on public.reviews for select using (true);
drop policy if exists "Users write own reviews" on public.reviews;
create policy "Users write own reviews" on public.reviews for insert with check (user_id = auth.uid());
drop policy if exists "Admin manages reviews" on public.reviews;
create policy "Admin manages reviews" on public.reviews for all using (public.is_admin()) with check (public.is_admin());

-- Audit logs: admin only.
drop policy if exists "Admin reads audit" on public.audit_logs;
create policy "Admin reads audit" on public.audit_logs for select using (public.is_admin());
drop policy if exists "Admin writes audit" on public.audit_logs;
create policy "Admin writes audit" on public.audit_logs for insert with check (public.is_admin());

-- Announcements: audience reads, admin manages.
drop policy if exists "Read announcements" on public.announcements;
create policy "Read announcements" on public.announcements for select using (true);
drop policy if exists "Admin manages announcements" on public.announcements;
create policy "Admin manages announcements" on public.announcements for all using (public.is_admin()) with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- 7. Helpful indexes
-- ─────────────────────────────────────────────────────────────
create index if not exists idx_bookings_coach on public.bookings(coach_id);
create index if not exists idx_availability_coach on public.coach_availability(coach_id);
create index if not exists idx_payouts_coach on public.payouts(coach_id);
create index if not exists idx_reviews_coach on public.reviews(coach_id);
create index if not exists idx_coaches_user on public.coaches(user_id);

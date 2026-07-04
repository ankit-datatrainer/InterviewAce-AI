-- ═══════════════════════════════════════════════════════════════════════════
--  InterviewAce AI — COMPLETE database setup (run this ONCE)
--
--  HOW TO RUN (5 minutes):
--   1. Open your Supabase dashboard → your project
--   2. Left sidebar → "SQL Editor" → "New query"
--   3. Paste this ENTIRE file
--   4. Click "Run"  (bottom right)
--   5. You should see "Success. No rows returned".
--
--  This creates every table the app needs, auto-creates a profile row whenever
--  someone signs up, sets security rules, and makes your admin account an admin.
--  It is safe to run more than once (idempotent).
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

-- ───────────────────────── Core tables ─────────────────────────
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  phone text,
  email text not null,
  college_name text,
  course text,
  avatar_url text,
  plan text default 'free' check (plan in ('free', 'pro', 'premium')),
  role text not null default 'student' check (role in ('student', 'coach', 'admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
-- In case the table already existed without the role column:
alter table public.profiles add column if not exists role text not null default 'student';

create table if not exists public.resumes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  file_name text not null,
  file_url text not null,
  target_role text,
  ats_score integer,
  analysis jsonb,
  created_at timestamptz default now()
);

create table if not exists public.interviews (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  interview_type text not null check (interview_type in ('hr', 'technical', 'behavioral')),
  difficulty text not null check (difficulty in ('fresher', 'intermediate', 'advanced')),
  target_role text not null,
  duration_seconds integer,
  overall_score integer,
  strikes integer default 0,
  status text default 'in_progress' check (status in ('in_progress', 'completed', 'terminated')),
  recording_url text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create table if not exists public.interview_feedback (
  id uuid default uuid_generate_v4() primary key,
  interview_id uuid references public.interviews(id) on delete cascade not null,
  communication_score numeric(3,1), confidence_score numeric(3,1), clarity_score numeric(3,1),
  body_language_score numeric(3,1), eye_contact_score numeric(3,1), posture_score numeric(3,1),
  appearance_score numeric(3,1), technical_score numeric(3,1), problem_solving_score numeric(3,1),
  leadership_score numeric(3,1), strengths text[], improvements text[], summary text,
  created_at timestamptz default now()
);

create table if not exists public.interview_qa (
  id uuid default uuid_generate_v4() primary key,
  interview_id uuid references public.interviews(id) on delete cascade not null,
  question_number integer not null,
  question text not null,
  answer text,
  score numeric(3,1),
  feedback text,
  created_at timestamptz default now()
);

create table if not exists public.coaches (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  category text not null check (category in ('communication', 'personality', 'interview', 'hr', 'corporate', 'career')),
  experience_years integer,
  rating numeric(2,1) default 0,
  total_reviews integer default 0,
  total_sessions integer default 0,
  price_per_session integer not null,
  avatar_color text,
  is_verified boolean default false,
  created_at timestamptz default now()
);
alter table public.coaches add column if not exists user_id uuid references public.profiles(id) on delete set null;
alter table public.coaches add column if not exists title text;
alter table public.coaches add column if not exists bio text;
alter table public.coaches add column if not exists tags text[] default '{}';
alter table public.coaches add column if not exists image_url text;
alter table public.coaches add column if not exists email text;
alter table public.coaches add column if not exists commission_pct integer default 20;
alter table public.coaches add column if not exists status text not null default 'approved'
  check (status in ('pending', 'approved', 'suspended'));

create table if not exists public.bookings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  coach_id uuid references public.coaches(id) on delete cascade not null,
  session_date date not null,
  time_slot text not null,
  goal text,
  status text default 'confirmed' check (status in ('confirmed', 'completed', 'cancelled')),
  payment_status text default 'pending' check (payment_status in ('pending', 'paid', 'refunded')),
  created_at timestamptz default now()
);
alter table public.bookings add column if not exists room_id text;
alter table public.bookings add column if not exists notes text;
alter table public.bookings add column if not exists amount integer;

create table if not exists public.contact_messages (
  id uuid default uuid_generate_v4() primary key,
  name text not null, email text not null, phone text, message text not null,
  created_at timestamptz default now()
);

-- ───────────────────────── Coach/admin extra tables ─────────────────────────
create table if not exists public.coach_availability (
  id uuid default uuid_generate_v4() primary key,
  coach_id uuid references public.coaches(id) on delete cascade not null,
  weekday integer not null check (weekday between 0 and 6),
  start_time time not null, end_time time not null,
  created_at timestamptz default now()
);
create table if not exists public.coach_blocked_dates (
  id uuid default uuid_generate_v4() primary key,
  coach_id uuid references public.coaches(id) on delete cascade not null,
  blocked_date date not null, created_at timestamptz default now()
);
create table if not exists public.payouts (
  id uuid default uuid_generate_v4() primary key,
  coach_id uuid references public.coaches(id) on delete cascade not null,
  amount integer not null, period_start date, period_end date,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at timestamptz, created_at timestamptz default now()
);
create table if not exists public.reviews (
  id uuid default uuid_generate_v4() primary key,
  booking_id uuid references public.bookings(id) on delete cascade,
  coach_id uuid references public.coaches(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  rating integer not null check (rating between 1 and 5),
  comment text, created_at timestamptz default now()
);
create table if not exists public.audit_logs (
  id uuid default uuid_generate_v4() primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_email text, action text not null, target_type text, target_id text, meta jsonb,
  created_at timestamptz default now()
);
create table if not exists public.announcements (
  id uuid default uuid_generate_v4() primary key,
  title text not null, body text not null,
  audience text not null default 'all' check (audience in ('all', 'students', 'coaches')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- ───────────────────────── Auto-create a profile on signup ─────────────────────────
-- THIS is what makes new signups actually appear + lets interviews/bookings save.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)),
    new.email,
    case when new.raw_user_meta_data->>'user_type' in ('coach','admin')
         then new.raw_user_meta_data->>'user_type' else 'student' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: create profile rows for anyone who already signed up before this ran.
insert into public.profiles (id, full_name, email, role)
select u.id,
       coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), split_part(u.email, '@', 1)),
       u.email,
       case when u.raw_user_meta_data->>'user_type' in ('coach','admin')
            then u.raw_user_meta_data->>'user_type' else 'student' end
from auth.users u
where u.email is not null
  and not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- Make the admin accounts admins.
update public.profiles set role = 'admin'
  where lower(email) in ('peculiex@gmail.com', 'admin@peculiex.com', 'admin@interviewace.ai', 'ankit@interviewace.ai');

-- ───────────────────────── Helper functions ─────────────────────────
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
create or replace function public.current_coach_id()
returns uuid language sql security definer stable as $$
  select id from public.coaches where user_id = auth.uid() limit 1;
$$;

-- ───────────────────────── Row Level Security ─────────────────────────
alter table public.profiles enable row level security;
alter table public.resumes enable row level security;
alter table public.interviews enable row level security;
alter table public.interview_feedback enable row level security;
alter table public.interview_qa enable row level security;
alter table public.coaches enable row level security;
alter table public.bookings enable row level security;
alter table public.contact_messages enable row level security;
alter table public.coach_availability enable row level security;
alter table public.coach_blocked_dates enable row level security;
alter table public.payouts enable row level security;
alter table public.reviews enable row level security;
alter table public.audit_logs enable row level security;
alter table public.announcements enable row level security;

-- Profiles
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

-- Resumes
drop policy if exists "Users can manage own resumes" on public.resumes;
create policy "Users can manage own resumes" on public.resumes for all using (auth.uid() = user_id);
drop policy if exists "Admins read resumes" on public.resumes;
create policy "Admins read resumes" on public.resumes for all using (public.is_admin()) with check (public.is_admin());

-- Interviews
drop policy if exists "Users can manage own interviews" on public.interviews;
create policy "Users can manage own interviews" on public.interviews for all using (auth.uid() = user_id);
drop policy if exists "Admins read interviews" on public.interviews;
create policy "Admins read interviews" on public.interviews for all using (public.is_admin()) with check (public.is_admin());

-- Interview feedback + QA
drop policy if exists "Users can view own feedback" on public.interview_feedback;
create policy "Users can view own feedback" on public.interview_feedback for all
  using (interview_id in (select id from public.interviews where user_id = auth.uid()))
  with check (interview_id in (select id from public.interviews where user_id = auth.uid()));
drop policy if exists "Users can manage own QA" on public.interview_qa;
create policy "Users can manage own QA" on public.interview_qa for all
  using (interview_id in (select id from public.interviews where user_id = auth.uid()))
  with check (interview_id in (select id from public.interviews where user_id = auth.uid()));

-- Coaches
drop policy if exists "Anyone can view coaches" on public.coaches;
create policy "Anyone can view coaches" on public.coaches for select using (true);
drop policy if exists "Coaches update own row" on public.coaches;
create policy "Coaches update own row" on public.coaches for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Admins manage coaches" on public.coaches;
create policy "Admins manage coaches" on public.coaches for all using (public.is_admin()) with check (public.is_admin());

-- Bookings
drop policy if exists "Users can manage own bookings" on public.bookings;
create policy "Users can manage own bookings" on public.bookings for all using (auth.uid() = user_id);
drop policy if exists "Admins manage bookings" on public.bookings;
create policy "Admins manage bookings" on public.bookings for all using (public.is_admin()) with check (public.is_admin());

-- Contact
drop policy if exists "Anyone can send contact message" on public.contact_messages;
create policy "Anyone can send contact message" on public.contact_messages for insert with check (true);
drop policy if exists "Admins manage tickets" on public.contact_messages;
create policy "Admins manage tickets" on public.contact_messages for all using (public.is_admin()) with check (public.is_admin());

-- Availability / blocked dates
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

-- Payouts / reviews / audit / announcements
drop policy if exists "Coach reads payouts" on public.payouts;
create policy "Coach reads payouts" on public.payouts for select using (coach_id = public.current_coach_id() or public.is_admin());
drop policy if exists "Admin manages payouts" on public.payouts;
create policy "Admin manages payouts" on public.payouts for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Read reviews" on public.reviews;
create policy "Read reviews" on public.reviews for select using (true);
drop policy if exists "Users write own reviews" on public.reviews;
create policy "Users write own reviews" on public.reviews for insert with check (user_id = auth.uid());
drop policy if exists "Admin manages reviews" on public.reviews;
create policy "Admin manages reviews" on public.reviews for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admin reads audit" on public.audit_logs;
create policy "Admin reads audit" on public.audit_logs for select using (public.is_admin());
drop policy if exists "Admin writes audit" on public.audit_logs;
create policy "Admin writes audit" on public.audit_logs for insert with check (public.is_admin());
drop policy if exists "Read announcements" on public.announcements;
create policy "Read announcements" on public.announcements for select using (true);
drop policy if exists "Admin manages announcements" on public.announcements;
create policy "Admin manages announcements" on public.announcements for all using (public.is_admin()) with check (public.is_admin());

-- ───────────────────────── Indexes ─────────────────────────
create index if not exists idx_interviews_user on public.interviews(user_id);
create index if not exists idx_bookings_user on public.bookings(user_id);
create index if not exists idx_bookings_coach on public.bookings(coach_id);
create index if not exists idx_availability_coach on public.coach_availability(coach_id);
create index if not exists idx_payouts_coach on public.payouts(coach_id);
create index if not exists idx_reviews_coach on public.reviews(coach_id);
create index if not exists idx_coaches_user on public.coaches(user_id);

-- Done. You should see "Success. No rows returned".

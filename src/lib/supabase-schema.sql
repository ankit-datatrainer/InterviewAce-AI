-- InterviewAce AI - Supabase Database Schema
-- Run this in Supabase SQL Editor to set up the database

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users profile table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  phone text,
  email text not null,
  college_name text,
  course text,
  avatar_url text,
  plan text default 'free' check (plan in ('free', 'pro', 'premium')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Resumes table
create table public.resumes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  file_name text not null,
  file_url text not null,
  target_role text,
  ats_score integer,
  analysis jsonb,
  created_at timestamptz default now()
);

-- Interviews table
create table public.interviews (
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

-- Interview feedback table
create table public.interview_feedback (
  id uuid default uuid_generate_v4() primary key,
  interview_id uuid references public.interviews(id) on delete cascade not null,
  communication_score numeric(3,1),
  confidence_score numeric(3,1),
  clarity_score numeric(3,1),
  body_language_score numeric(3,1),
  eye_contact_score numeric(3,1),
  posture_score numeric(3,1),
  appearance_score numeric(3,1),
  technical_score numeric(3,1),
  problem_solving_score numeric(3,1),
  leadership_score numeric(3,1),
  strengths text[],
  improvements text[],
  summary text,
  created_at timestamptz default now()
);

-- Interview questions and answers
create table public.interview_qa (
  id uuid default uuid_generate_v4() primary key,
  interview_id uuid references public.interviews(id) on delete cascade not null,
  question_number integer not null,
  question text not null,
  answer text,
  score numeric(3,1),
  feedback text,
  created_at timestamptz default now()
);

-- Coaches table
create table public.coaches (
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

-- Bookings table
create table public.bookings (
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

-- Contact messages
create table public.contact_messages (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  email text not null,
  phone text,
  message text not null,
  created_at timestamptz default now()
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.resumes enable row level security;
alter table public.interviews enable row level security;
alter table public.interview_feedback enable row level security;
alter table public.interview_qa enable row level security;
alter table public.coaches enable row level security;
alter table public.bookings enable row level security;
alter table public.contact_messages enable row level security;

-- Profiles: users can read/update their own profile
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Resumes: users can CRUD their own
create policy "Users can manage own resumes" on public.resumes for all using (auth.uid() = user_id);

-- Interviews: users can CRUD their own
create policy "Users can manage own interviews" on public.interviews for all using (auth.uid() = user_id);

-- Interview feedback: users can read their own
create policy "Users can view own feedback" on public.interview_feedback for select
  using (interview_id in (select id from public.interviews where user_id = auth.uid()));

-- Interview QA: users can manage their own
create policy "Users can manage own QA" on public.interview_qa for all
  using (interview_id in (select id from public.interviews where user_id = auth.uid()));

-- Coaches: anyone can read
create policy "Anyone can view coaches" on public.coaches for select using (true);

-- Bookings: users can manage their own
create policy "Users can manage own bookings" on public.bookings for all using (auth.uid() = user_id);

-- Contact: anyone can insert
create policy "Anyone can send contact message" on public.contact_messages for insert with check (true);

-- Seed some coaches
insert into public.coaches (name, description, category, experience_years, rating, total_reviews, total_sessions, price_per_session, avatar_color, is_verified) values
  ('Kavita Rao', 'Senior HR Manager, ex-Infosys', 'hr', 14, 4.9, 312, 312, 1200, '#2563EB', true),
  ('Arjun Mehta', 'Communication & Public Speaking Coach', 'communication', 9, 4.8, 489, 489, 900, '#06B6D4', true),
  ('Neha Singh', 'Career Strategist, IIM-A Alum', 'career', 11, 4.7, 156, 156, 1500, '#8B5CF6', true),
  ('Rohit Khanna', 'Tech Interview Panelist, ex-Amazon', 'interview', 12, 4.9, 268, 268, 1800, '#F59E0B', true),
  ('Divya Pillai', 'Personality Development Trainer', 'personality', 8, 4.6, 203, 203, 800, '#EC4899', true),
  ('Sandeep Joshi', 'VP Operations, Corporate Mentor', 'corporate', 18, 4.8, 97, 97, 2200, '#10B981', true),
  ('Meera Nair', 'Campus Placement Specialist', 'interview', 7, 4.7, 341, 341, 700, '#0EA5E9', true),
  ('Vikram Bhatt', 'Voice & Accent Coach', 'communication', 10, 4.5, 188, 188, 850, '#6366F1', true),
  ('Pooja Desai', 'HRBP, Fortune 500 recruiter', 'hr', 13, 4.8, 224, 224, 1400, '#EF4444', true);

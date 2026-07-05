-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 3: platform settings (currency / tax / trial / branding / legal),
-- complaints inbox, and session follow-up (recommend-another-session).
-- Safe to run multiple times.
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────── Platform settings (single row) ───────────────────
-- Only NON-SECRET config lives here (it's world-readable so the pricing,
-- checkout and invoice code can read it). API keys stay in server env vars.
create table if not exists public.platform_settings (
  id             text primary key default 'default',
  platform_name  text not null default 'InterviewAce AI',
  support_email  text not null default 'support@interviewace.ai',
  logo_url       text,
  currency       text not null default 'INR',
  currency_symbol text not null default '₹',
  tax_percent    numeric not null default 18,
  tax_label      text not null default 'GST',
  free_trial_days integer not null default 0,
  terms_content  text default '',
  privacy_content text default '',
  updated_at     timestamptz not null default now()
);

insert into public.platform_settings (id) values ('default') on conflict (id) do nothing;

alter table public.platform_settings enable row level security;

-- Everyone (even signed-out visitors) may read the single settings row.
drop policy if exists "Anyone reads platform settings" on public.platform_settings;
create policy "Anyone reads platform settings" on public.platform_settings
  for select using (true);

-- Only admins may change it.
drop policy if exists "Admin updates platform settings" on public.platform_settings;
create policy "Admin updates platform settings" on public.platform_settings
  for update using (public.is_admin()) with check (public.is_admin());

-- ───────────────────────── Complaints ───────────────────────────────────────
create table if not exists public.complaints (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  booking_id    uuid references public.bookings(id) on delete set null,
  coach_id      uuid references public.coaches(id) on delete set null,
  subject       text not null,
  message       text not null,
  status        text not null default 'open',   -- open | in_progress | resolved
  admin_response text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.complaints enable row level security;

-- A student can raise and read their own complaints.
drop policy if exists "User manages own complaints" on public.complaints;
create policy "User manages own complaints" on public.complaints
  for select using (auth.uid() = user_id);
drop policy if exists "User raises complaints" on public.complaints;
create policy "User raises complaints" on public.complaints
  for insert with check (auth.uid() = user_id);

-- Admin sees and resolves everything.
drop policy if exists "Admin reads all complaints" on public.complaints;
create policy "Admin reads all complaints" on public.complaints
  for select using (public.is_admin());
drop policy if exists "Admin updates complaints" on public.complaints;
create policy "Admin updates complaints" on public.complaints
  for update using (public.is_admin()) with check (public.is_admin());

-- ───────────────────────── Session follow-up ────────────────────────────────
-- Coach can recommend another session after a call; the student sees it and
-- gets a one-click "book again" prompt.
alter table public.bookings add column if not exists follow_up_recommended boolean not null default false;
alter table public.bookings add column if not exists follow_up_note text;

-- ═══════════════════════════════════════════════════════════════════════════
-- Lets the Super Admin add a review/testimonial for a coach without needing
-- a real student account behind it (e.g. importing reviews from elsewhere).
-- Safe to run multiple times.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.reviews alter column user_id drop not null;
alter table public.reviews add column if not exists reviewer_name text;

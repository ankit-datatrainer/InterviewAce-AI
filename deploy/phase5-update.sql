-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 5: FIX — coaches could not SEE their own bookings.
--
-- The bookings table had:
--   • "Users can manage own bookings"  (auth.uid() = user_id)   → students
--   • "Admins manage bookings"         (is_admin())             → admins
--   • "Coach manages own bookings"     FOR UPDATE only          → coaches (write)
--
-- There was NO policy letting a coach *read* (SELECT) the bookings assigned to
-- them, so getMySessions() came back empty and the Coach Portal showed no
-- sessions — even though the booking existed with the right coach_id and the
-- same room_id as the student. RLS is deny-by-default, so a missing SELECT
-- policy silently returns zero rows.
--
-- Fix: give coaches full manage (SELECT + UPDATE + DELETE + INSERT) over the
-- bookings whose coach_id is theirs. Now a student booking instantly appears in
-- the coach's dashboard AND the admin's All Sessions, and everyone joins the
-- exact same room_id / meeting link.
--
-- Safe to run multiple times.
-- ═══════════════════════════════════════════════════════════════════════════

drop policy if exists "Coach manages own bookings" on public.bookings;
create policy "Coach manages own bookings" on public.bookings
  for all
  using (coach_id = public.current_coach_id())
  with check (coach_id = public.current_coach_id());

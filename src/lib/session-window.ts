'use client';

import { useEffect, useState } from 'react';

// Join-window rules for booked coaching sessions (both coach & student sides):
// the meeting room opens 5 minutes before the scheduled start and stays
// joinable until the slot's end. Before that, the Join button is hidden and a
// live countdown is shown instead.

export const JOIN_EARLY_MS = 5 * 60 * 1000;

export interface SessionWindow {
  /** true when now is within [start - 5min, end] */
  canJoin: boolean;
  /** true when the slot's end time has passed */
  isOver: boolean;
  /** human countdown until the room opens, e.g. "1d 2h 05m 30s" (null once joinable) */
  countdown: string | null;
}

/** Parses "YYYY-MM-DD" + "HH:MM - HH:MM" into start/end Dates (local time). */
export function parseSessionTimes(date: string, timeSlot: string): { start: Date; end: Date } | null {
  const m = /^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/.exec(timeSlot || '');
  if (!date || !m) return null;
  const start = new Date(`${date}T${m[1].padStart(5, '0')}:00`);
  let end = new Date(`${date}T${m[2].padStart(5, '0')}:00`);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  if (end <= start) end = new Date(start.getTime() + 60 * 60 * 1000); // safety: 1h default
  return { start, end };
}

function fmt(ms: number): string {
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${d > 0 ? d + 'd ' : ''}${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

export function getSessionWindow(date: string, timeSlot: string, now = new Date()): SessionWindow {
  const times = parseSessionTimes(date, timeSlot);
  // Unparseable slot (legacy/demo data): don't block joining.
  if (!times) return { canJoin: true, isOver: false, countdown: null };
  const opensAt = times.start.getTime() - JOIN_EARLY_MS;
  const t = now.getTime();
  if (t > times.end.getTime()) return { canJoin: false, isOver: true, countdown: null };
  if (t >= opensAt) return { canJoin: true, isOver: false, countdown: null };
  return { canJoin: false, isOver: false, countdown: fmt(opensAt - t) };
}

/** Live-updating session window (ticks every second while counting down). */
export function useSessionWindow(date: string, timeSlot: string): SessionWindow {
  const [win, setWin] = useState<SessionWindow>(() => getSessionWindow(date, timeSlot));
  useEffect(() => {
    const tick = () => setWin(getSessionWindow(date, timeSlot));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [date, timeSlot]);
  return win;
}

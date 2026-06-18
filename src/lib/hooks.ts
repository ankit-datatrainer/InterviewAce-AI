'use client';

import { useState, useEffect } from 'react';
import { getUpcomingBookings, type BookingRecord } from './booking-store';
import { getLatestResume, type ResumeRecord } from './resume-store';

export function useUpcomingBookings(): BookingRecord[] {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);

  useEffect(() => {
    setBookings(getUpcomingBookings());

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'interviewace_bookings') {
        setBookings(getUpcomingBookings());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return bookings;
}

export function useResumeScore(): { score: number | null; resume: ResumeRecord | null } {
  const [resume, setResume] = useState<ResumeRecord | null>(null);

  useEffect(() => {
    setResume(getLatestResume());

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'interviewace_resumes') {
        setResume(getLatestResume());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return { score: resume?.atsScore ?? null, resume };
}

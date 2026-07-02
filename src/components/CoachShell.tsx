'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { getMyCoachProfile, type CoachProfile } from '@/lib/coach-store';

// Loads the coach profile linked to the current user and renders `children`
// with it. Shows a consistent loading + "not linked" state otherwise.
export default function CoachShell({ children }: { children: (coach: CoachProfile) => ReactNode }) {
  const [coach, setCoach] = useState<CoachProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      setCoach(await getMyCoachProfile());
      setLoaded(true);
    })();
  }, []);

  if (!loaded) return null;

  if (!coach) {
    return (
      <div className="widget" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <AlertCircle size={40} style={{ color: 'var(--amber, #F59E0B)', marginBottom: '1rem' }} />
        <h3 style={{ marginBottom: '.5rem' }}>No coach profile linked</h3>
        <p style={{ color: 'var(--text-2)', maxWidth: 460, margin: '0 auto' }}>
          Your account isn&apos;t linked to a coach profile yet. Ask an administrator to link your
          account in Admin → Coach Management.
        </p>
      </div>
    );
  }

  return <>{children(coach)}</>;
}

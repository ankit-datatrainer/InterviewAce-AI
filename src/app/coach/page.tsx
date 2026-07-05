'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Video, CalendarDays, Clock, Star, IndianRupee, Users, AlertCircle } from 'lucide-react';
import {
  getMyCoachProfile,
  getMySessions,
  getMyEarnings,
  type CoachProfile,
  type CoachSession,
} from '@/lib/coach-store';

function isUpcoming(s: CoachSession): boolean {
  return s.status === 'confirmed';
}

export default function CoachDashboard() {
  const router = useRouter();
  const [coach, setCoach] = useState<CoachProfile | null>(null);
  const [sessions, setSessions] = useState<CoachSession[]>([]);
  const [monthEarnings, setMonthEarnings] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let current: CoachProfile | null = null;
    const loadSessions = async (c: CoachProfile) => {
      const [s, e] = await Promise.all([getMySessions(c.id), getMyEarnings(c)]);
      setSessions(s);
      setMonthEarnings(e.pendingTotal + e.paidTotal);
    };
    (async () => {
      const c = await getMyCoachProfile();
      setCoach(c);
      if (c) { current = c; await loadSessions(c); }
      setLoaded(true);
    })();
    // Live refresh so a newly booked session shows up here on its own.
    const iv = setInterval(() => { if (current) loadSessions(current); }, 15000);
    return () => clearInterval(iv);
  }, []);

  if (!loaded) return null;

  if (!coach) {
    return (
      <>
        <div className="app-head"><div><h2>Coach Dashboard</h2><p>Welcome to the coach portal.</p></div></div>
        <div className="widget" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <AlertCircle size={40} style={{ color: 'var(--amber, #F59E0B)', marginBottom: '1rem' }} />
          <h3 style={{ marginBottom: '.5rem' }}>No coach profile linked</h3>
          <p style={{ color: 'var(--text-2)', maxWidth: 460, margin: '0 auto' }}>
            Your account isn&apos;t linked to a coach profile yet. Ask an administrator to link your
            account in the Admin → Coach Management panel.
          </p>
        </div>
      </>
    );
  }

  const upcoming = sessions.filter(isUpcoming);
  const completed = sessions.filter((s) => s.status === 'completed');

  const kpis = [
    { label: 'Upcoming sessions', value: upcoming.length.toString(), icon: CalendarDays, color: '#2563EB' },
    { label: 'Sessions completed', value: (coach.totalSessions || completed.length).toString(), icon: Video, color: '#06B6D4' },
    { label: 'Rating', value: coach.rating ? `${coach.rating.toFixed(1)}★` : '—', icon: Star, color: '#F59E0B' },
    { label: 'Earnings (lifetime est.)', value: `₹${monthEarnings.toLocaleString()}`, icon: IndianRupee, color: '#22C55E' },
  ];

  return (
    <>
      <div className="app-head">
        <div>
          <h2>Welcome back, {coach.name.split(' ')[0]} 👋</h2>
          <p>{upcoming.length > 0 ? `You have ${upcoming.length} upcoming session${upcoming.length > 1 ? 's' : ''}.` : 'No upcoming sessions right now.'}</p>
        </div>
        <Link href="/coach/availability" className="btn btn-primary btn-sm"><CalendarDays size={16} /> Manage availability</Link>
      </div>

      {coach.status !== 'approved' && (
        <div className="widget" style={{ marginBottom: '1rem', borderColor: 'var(--amber, #F59E0B)', display: 'flex', gap: '.6rem', alignItems: 'center' }}>
          <AlertCircle size={18} style={{ color: 'var(--amber, #F59E0B)' }} />
          <span>Your coach profile is currently <b>{coach.status}</b>. Students can&apos;t book you until an admin approves your profile.</span>
        </div>
      )}

      <div className="dash-grid">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div className="widget kpi" key={k.label}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.3rem' }}>
                <span style={{ width: 36, height: 36, borderRadius: 10, background: `${k.color}22`, display: 'grid', placeItems: 'center', color: k.color }}>
                  <Icon size={18} />
                </span>
              </div>
              <span className="v">{k.value}</span>
              <span className="l">{k.label}</span>
            </div>
          );
        })}
      </div>

      <div className="widget" style={{ marginTop: '1rem' }}>
        <h4>Upcoming sessions <Link href="/coach/sessions">View all &rarr;</Link></h4>
        {upcoming.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-3)' }}>
            <CalendarDays size={32} style={{ opacity: 0.3, marginBottom: '.6rem' }} />
            <p>No upcoming sessions.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {upcoming.slice(0, 5).map((s) => (
              <div key={s.id} style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-2)', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <Users size={16} style={{ color: 'var(--blue)' }} /> {s.studentName}
                  </h4>
                  <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-2)', fontSize: '0.9rem', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><CalendarDays size={14} /> {s.sessionDate}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Clock size={14} /> {s.timeSlot}</span>
                  </div>
                  {s.goal && <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-2)' }}><strong>Goal:</strong> {s.goal}</p>}
                </div>
                <button className="btn btn-primary" disabled={!s.roomId} onClick={() => s.roomId && router.push(`/coach/room/${s.roomId}`)}>
                  <Video size={16} /> Join Live Session
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

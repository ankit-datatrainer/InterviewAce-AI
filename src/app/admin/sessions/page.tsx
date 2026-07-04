'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Video, Eye, PhoneOff, RefreshCw, CalendarDays, Clock, Users } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { getLiveSessions, adminEndSession, type LiveSession } from '@/lib/admin-store';

export default function AdminSessionsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [ending, setEnding] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setSessions(await getLiveSessions());
    setLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
    // Keep the monitor fresh — new sessions appear without a manual reload.
    const iv = setInterval(refresh, 30000);
    return () => clearInterval(iv);
  }, [refresh]);

  const endSession = async (s: LiveSession) => {
    setEnding(s.id);
    try {
      await adminEndSession(s.id);
      toast(`Session between ${s.coachName} and ${s.studentName} ended.`);
      refresh();
    } catch {
      toast('Could not end the session.');
    } finally {
      setEnding(null);
    }
  };

  return (
    <>
      <div className="app-head">
        <div>
          <h2>Live Sessions</h2>
          <p>Today&apos;s coaching sessions — monitor silently or end a session.</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={refresh}><RefreshCw size={15} /> Refresh</button>
      </div>

      <div className="widget">
        {!loaded ? null : sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-3)' }}>
            <Video size={36} style={{ opacity: 0.3, marginBottom: '.6rem' }} />
            <p>No sessions scheduled today.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {sessions.map((s) => (
              <div key={s.id} style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: '1.25rem', background: 'var(--bg-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.4rem' }}>
                    <Users size={16} style={{ color: 'var(--blue)' }} /> {s.coachName} × {s.studentName}
                  </h4>
                  <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-2)', fontSize: '.9rem', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}><CalendarDays size={14} /> {s.sessionDate}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}><Clock size={14} /> {s.timeSlot}</span>
                    {s.roomId
                      ? <span className="tag green">Room ready</span>
                      : <span className="tag amber">Room not started</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={!s.roomId}
                    title={s.roomId ? 'Join as a silent observer' : 'The room has not been started yet'}
                    onClick={() => s.roomId && router.push(`/admin/room/${s.roomId}`)}
                  >
                    <Eye size={15} /> Join silently
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.4)' }}
                    disabled={ending === s.id}
                    onClick={() => endSession(s)}
                  >
                    <PhoneOff size={15} /> {ending === s.id ? 'Ending…' : 'End session'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Video, Eye, PhoneOff, RefreshCw, CalendarDays, Clock, Users, Download, Film } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { getLiveSessions, adminEndSession, getRecordedSessions, type LiveSession, type RecordedSession } from '@/lib/admin-store';
import { getRecordingDownloadUrl } from '@/lib/session-recordings';

export default function AdminSessionsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [recordings, setRecordings] = useState<RecordedSession[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [ending, setEnding] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setSessions(await getLiveSessions());
    setRecordings(await getRecordedSessions());
    setLoaded(true);
  }, []);

  const downloadRecording = async (path: string) => {
    const url = await getRecordingDownloadUrl(path);
    if (url) window.open(url, '_blank');
    else toast('Could not generate a download link.');
  };

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
              <div key={s.id} className="ls-card" style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: '1.25rem', background: 'var(--bg-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
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
                <div className="ls-actions" style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
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

      <div className="widget" style={{ marginTop: '1rem' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}><Film size={17} /> Recorded sessions</h4>
        {recordings.length === 0 ? (
          <p style={{ color: 'var(--text-3)', fontSize: '.88rem', padding: '.5rem 0' }}>No sessions have been recorded yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {recordings.map((r) => (
              <div key={r.id} className="ls-rec-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.5rem', border: '1px solid var(--line)', borderRadius: 8, padding: '.6rem .9rem', fontSize: '.88rem' }}>
                <span>{r.coachName} × {r.studentName} · {r.sessionDate} · {r.timeSlot}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => downloadRecording(r.recordingUrl)}><Download size={14} /> Download</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Page-local mobile rules (360-430px portrait) */}
      <style>{`
        @media (max-width: 680px) {
          .ls-card { padding: 1rem !important; }
          .ls-actions { width: 100%; }
          .ls-actions .btn { flex: 1 1 auto; justify-content: center; }
          .ls-rec-row span { min-width: 0; word-break: break-word; }
        }
      `}</style>
    </>
  );
}

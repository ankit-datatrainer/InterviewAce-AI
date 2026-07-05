'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Video, CalendarDays, Clock, CheckCircle, FileText, X, Bell, Download, Repeat } from 'lucide-react';
import { useToast } from '@/components/Toast';
import CoachShell from '@/components/CoachShell';
import { getMySessions, updateSession, type CoachProfile, type CoachSession } from '@/lib/coach-store';
import { useSessionWindow, parseSessionTimes } from '@/lib/session-window';
import { getRecordingDownloadUrl } from '@/lib/session-recordings';

type Filter = 'upcoming' | 'completed' | 'all';

// Join opens 5 minutes before the slot; until then show a live countdown chip.
function JoinGate({ session, onJoin }: { session: CoachSession; onJoin: () => void }) {
  const win = useSessionWindow(session.sessionDate, session.timeSlot);
  if (win.isOver) return <span className="tag amber">Time over</span>;
  if (win.canJoin) {
    return (
      <button className="btn btn-primary btn-sm" disabled={!session.roomId} onClick={onJoin}>
        <Video size={15} /> Join now
      </button>
    );
  }
  return (
    <span className="tag blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', fontVariantNumeric: 'tabular-nums' }}>
      <Clock size={13} /> Opens in {win.countdown}
    </span>
  );
}

// Banner "notification" for the coach's next upcoming session.
function NextSessionBanner({ sessions }: { sessions: CoachSession[] }) {
  const next = sessions
    .filter((s) => s.status === 'confirmed')
    .map((s) => ({ s, t: parseSessionTimes(s.sessionDate, s.timeSlot) }))
    .filter((x) => x.t && x.t.end.getTime() > Date.now())
    .sort((a, b) => a.t!.start.getTime() - b.t!.start.getTime())[0];
  const win = useSessionWindow(next?.s.sessionDate || '', next?.s.timeSlot || '');
  if (!next) return null;
  return (
    <div className="widget" style={{ display: 'flex', alignItems: 'center', gap: '.9rem', padding: '1rem 1.25rem', marginBottom: '1rem', border: '1px solid rgba(37,99,235,0.35)', background: 'rgba(37,99,235,0.07)' }}>
      <Bell size={20} style={{ color: 'var(--blue)', flexShrink: 0 }} />
      <div style={{ fontSize: '.95rem' }}>
        <b>Upcoming session:</b> {next.s.studentName} · {next.s.sessionDate} · {next.s.timeSlot}
        {' — '}
        {win.canJoin
          ? <b style={{ color: '#10b981' }}>the room is open, you can join now.</b>
          : win.isOver ? 'this slot has ended.' : <>room opens in <b style={{ fontVariantNumeric: 'tabular-nums' }}>{win.countdown}</b> (5 min before start).</>}
      </div>
    </div>
  );
}

function SessionsInner({ coach }: { coach: CoachProfile }) {
  const router = useRouter();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<CoachSession[]>([]);
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [noteFor, setNoteFor] = useState<CoachSession | null>(null);
  const [noteText, setNoteText] = useState('');
  const [followFor, setFollowFor] = useState<CoachSession | null>(null);
  const [followText, setFollowText] = useState('');

  const load = () => getMySessions(coach.id).then(setSessions);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [coach.id]);

  const filtered = sessions.filter((s) =>
    filter === 'all' ? true : filter === 'upcoming' ? s.status === 'confirmed' : s.status === 'completed',
  );

  const markComplete = async (s: CoachSession) => {
    await updateSession(s.id, { status: 'completed' });
    toast('Session marked complete.');
    load();
  };

  const saveNote = async () => {
    if (!noteFor) return;
    await updateSession(noteFor.id, { notes: noteText });
    toast('Session notes saved.');
    setNoteFor(null);
    setNoteText('');
    load();
  };

  const saveFollowUp = async () => {
    if (!followFor) return;
    await updateSession(followFor.id, { followUpRecommended: true, followUpNote: followText });
    toast('Follow-up session recommended — the student will see it.');
    setFollowFor(null); setFollowText('');
    load();
  };

  const downloadRecording = async (s: CoachSession) => {
    if (!s.recordingUrl) return;
    const url = await getRecordingDownloadUrl(s.recordingUrl);
    if (url) window.open(url, '_blank');
    else toast('Could not generate a download link.');
  };

  return (
    <>
      <div className="app-head">
        <div><h2>My Sessions</h2><p>Join live rooms, add notes, and track completion. Rooms open 5 minutes before the scheduled time.</p></div>
      </div>

      <NextSessionBanner sessions={sessions} />

      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem' }}>
        {(['upcoming', 'completed', 'all'] as Filter[]).map((f) => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>
            {f}
          </button>
        ))}
      </div>

      <div className="widget">
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-3)' }}>
            <CalendarDays size={36} style={{ opacity: 0.3, marginBottom: '.6rem' }} />
            <p>No {filter === 'all' ? '' : filter} sessions.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {filtered.map((s) => (
              <div key={s.id} style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: '1.25rem', background: 'var(--bg-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h4 style={{ marginBottom: '.4rem' }}>{s.studentName} <span className={`tag ${s.status === 'completed' ? 'green' : s.status === 'cancelled' ? 'red' : 'blue'}`} style={{ marginLeft: 6 }}>{s.status}</span></h4>
                  <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-2)', fontSize: '0.9rem', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><CalendarDays size={14} /> {s.sessionDate}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Clock size={14} /> {s.timeSlot}</span>
                  </div>
                  {s.goal && <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-2)' }}><strong>Goal:</strong> {s.goal}</p>}
                  {s.notes && <p style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: 'var(--text-3)' }}><strong>Notes:</strong> {s.notes}</p>}
                </div>
                <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setNoteFor(s); setNoteText(s.notes || ''); }}><FileText size={15} /> Notes</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setFollowFor(s); setFollowText(s.followUpNote || ''); }} title="Recommend another session">
                    <Repeat size={15} /> {s.followUpRecommended ? 'Recommended' : 'Follow-up'}
                  </button>
                  {s.recordingUrl && (
                    <button className="btn btn-ghost btn-sm" onClick={() => downloadRecording(s)}><Download size={15} /> Recording</button>
                  )}
                  {s.status === 'confirmed' && (
                    <>
                      <button className="btn btn-ghost btn-sm" onClick={() => markComplete(s)}><CheckCircle size={15} /> Complete</button>
                      <JoinGate session={s} onJoin={() => s.roomId && router.push(`/coach/room/${s.roomId}`)} />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {noteFor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setNoteFor(null)}>
          <div className="widget" style={{ maxWidth: 480, width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0 }}>Session notes · {noteFor.studentName}</h4>
              <button className="btn btn-ghost btn-sm" onClick={() => setNoteFor(null)}><X size={16} /></button>
            </div>
            <textarea className="input" rows={5} value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="What was covered, action items, follow-ups…" />
            <div style={{ display: 'flex', gap: '.5rem', marginTop: '1rem' }}>
              <button className="btn btn-primary" onClick={saveNote}>Save notes</button>
              <button className="btn btn-ghost" onClick={() => setNoteFor(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {followFor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setFollowFor(null)}>
          <div className="widget" style={{ maxWidth: 480, width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0 }}>Recommend follow-up · {followFor.studentName}</h4>
              <button className="btn btn-ghost btn-sm" onClick={() => setFollowFor(null)}><X size={16} /></button>
            </div>
            <p style={{ fontSize: '.85rem', color: 'var(--text-3)', marginTop: 0 }}>The student sees this on their Bookings page with a one-click &ldquo;Book again&rdquo; button.</p>
            <textarea className="input" rows={4} value={followText} onChange={(e) => setFollowText(e.target.value)} placeholder="Why another session would help, what to focus on next…" />
            <div style={{ display: 'flex', gap: '.5rem', marginTop: '1rem' }}>
              <button className="btn btn-primary" onClick={saveFollowUp}>Recommend session</button>
              <button className="btn btn-ghost" onClick={() => setFollowFor(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function CoachSessionsPage() {
  return <CoachShell>{(coach) => <SessionsInner coach={coach} />}</CoachShell>;
}

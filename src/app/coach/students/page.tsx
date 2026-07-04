'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, ChevronRight, ArrowLeft, StickyNote, ClipboardList, Target, Plus, Mail, Phone, BarChart, CheckCircle } from 'lucide-react';
import CoachShell from '@/components/CoachShell';
import { useToast } from '@/components/Toast';
import {
  getMyStudents,
  getStudentDetail,
  addStudentNote,
  assignHomework,
  setHomeworkStatus,
  setStudentGoal,
  setGoalProgress,
  type CoachProfile,
  type CoachStudent,
  type StudentDetail,
} from '@/lib/coach-store';

function scoreColor(score: number) {
  return score >= 80 ? '#22C55E' : score >= 60 ? '#F59E0B' : '#ef4444';
}

function StudentDetailView({ coach, student, onBack }: { coach: CoachProfile; student: CoachStudent; onBack: () => void }) {
  const { toast } = useToast();
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [noteText, setNoteText] = useState('');
  const [hwText, setHwText] = useState('');
  const [hwDue, setHwDue] = useState('');
  const [goalText, setGoalText] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    if (student.id) getStudentDetail(coach.id, student.id).then(setDetail);
  }, [coach.id, student.id]);
  useEffect(() => { refresh(); }, [refresh]);

  if (!student.id) {
    return (
      <div className="widget" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
        <p style={{ color: 'var(--text-2)' }}>This student&apos;s account isn&apos;t linked, so CRM tools aren&apos;t available.</p>
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginTop: '1rem' }}><ArrowLeft size={15} /> Back to students</button>
      </div>
    );
  }

  const doAdd = async (fn: () => Promise<void>, done: string) => {
    setBusy(true);
    try { await fn(); toast(done); refresh(); }
    catch (e: any) { toast(e?.message?.includes('relation') ? 'Ask the admin to run the marketplace database update.' : (e?.message || 'Failed.')); }
    finally { setBusy(false); }
  };

  return (
    <>
      <div className="app-head">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>{student.name}</h2>
          <p>{student.sessions} session{student.sessions > 1 ? 's' : ''} · last on {student.lastSession}</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onBack}><ArrowLeft size={15} /> All students</button>
      </div>

      <div className="dash-grid-2">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Contact + AI reports */}
          <div className="widget">
            <h4>Student overview</h4>
            {detail?.profile && (
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', color: 'var(--text-2)', fontSize: '.9rem', marginBottom: '1rem' }}>
                {detail.profile.email && <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}><Mail size={14} /> {detail.profile.email}</span>}
                {detail.profile.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}><Phone size={14} /> {detail.profile.phone}</span>}
              </div>
            )}
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '.45rem', fontSize: '.95rem' }}><BarChart size={15} /> AI mock-interview history</h4>
            {!detail || detail.interviews.length === 0 ? (
              <p style={{ color: 'var(--text-3)', fontSize: '.88rem', padding: '.5rem 0' }}>No AI interviews yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {detail.interviews.map((iv) => (
                  <div key={iv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--line)', borderRadius: 8, padding: '.55rem .8rem', fontSize: '.88rem' }}>
                    <span style={{ textTransform: 'capitalize' }}>{iv.type} · {iv.role}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '.8rem' }}>
                      <b style={{ color: scoreColor(iv.score) }}>{iv.score}</b>
                      <span style={{ color: 'var(--text-3)', fontSize: '.8rem' }}>{new Date(iv.date).toLocaleDateString()}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Session notes */}
          <div className="widget">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '.45rem' }}><StickyNote size={16} /> Session notes</h4>
            <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.8rem' }}>
              <input className="input" style={{ flex: 1 }} placeholder="Add a private note about this student…" value={noteText} onChange={(e) => setNoteText(e.target.value)} />
              <button className="btn btn-primary btn-sm" disabled={busy || !noteText.trim()}
                onClick={() => doAdd(async () => { await addStudentNote(coach.id, student.id!, noteText.trim()); setNoteText(''); }, 'Note saved.')}>
                <Plus size={14} /> Add
              </button>
            </div>
            {(detail?.notes || []).map((n) => (
              <div key={n.id} style={{ borderLeft: '3px solid var(--blue)', padding: '.4rem .8rem', marginBottom: '.5rem', background: 'var(--bg-2)', borderRadius: '0 8px 8px 0' }}>
                <p style={{ margin: 0, fontSize: '.9rem' }}>{n.notes}</p>
                <span style={{ fontSize: '.74rem', color: 'var(--text-3)' }}>{new Date(n.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Homework */}
          <div className="widget">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '.45rem' }}><ClipboardList size={16} /> Homework</h4>
            <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.8rem', flexWrap: 'wrap' }}>
              <input className="input" style={{ flex: 2, minWidth: 160 }} placeholder="Assign a task…" value={hwText} onChange={(e) => setHwText(e.target.value)} />
              <input type="date" className="input" style={{ flex: 1, minWidth: 130 }} value={hwDue} onChange={(e) => setHwDue(e.target.value)} />
              <button className="btn btn-primary btn-sm" disabled={busy || !hwText.trim()}
                onClick={() => doAdd(async () => { await assignHomework(coach.id, student.id!, hwText.trim(), hwDue || undefined); setHwText(''); setHwDue(''); }, 'Homework assigned.')}>
                <Plus size={14} /> Assign
              </button>
            </div>
            {(detail?.homework || []).map((h) => (
              <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.6rem', border: '1px solid var(--line)', borderRadius: 8, padding: '.55rem .8rem', marginBottom: '.45rem', fontSize: '.88rem', flexWrap: 'wrap' }}>
                <span style={{ flex: 1, textDecoration: h.status === 'done' ? 'line-through' : 'none', color: h.status === 'done' ? 'var(--text-3)' : 'inherit' }}>
                  {h.task}{h.dueDate ? <span style={{ color: 'var(--text-3)' }}> · due {h.dueDate}</span> : null}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                  <span className={`tag ${h.status === 'done' ? 'green' : h.status === 'submitted' ? 'blue' : 'amber'}`}>{h.status}</span>
                  {h.status !== 'done' && (
                    <button className="btn btn-ghost btn-sm" title="Mark done"
                      onClick={() => doAdd(async () => setHomeworkStatus(h.id, 'done'), 'Marked done.')}>
                      <CheckCircle size={14} />
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>

          {/* Goals */}
          <div className="widget">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '.45rem' }}><Target size={16} /> Goals</h4>
            <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.8rem' }}>
              <input className="input" style={{ flex: 1 }} placeholder="Set a goal (e.g. Clear HR round confidently)…" value={goalText} onChange={(e) => setGoalText(e.target.value)} />
              <button className="btn btn-primary btn-sm" disabled={busy || !goalText.trim()}
                onClick={() => doAdd(async () => { await setStudentGoal(coach.id, student.id!, goalText.trim()); setGoalText(''); }, 'Goal set.')}>
                <Plus size={14} /> Set
              </button>
            </div>
            {(detail?.goals || []).map((g) => (
              <div key={g.id} style={{ marginBottom: '.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.88rem', marginBottom: '.3rem' }}>
                  <b>{g.goal}</b>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    {g.progress}%
                    <button className="btn btn-ghost btn-sm" style={{ padding: '.1rem .5rem' }} title="+10%"
                      onClick={() => doAdd(async () => setGoalProgress(g.id, g.progress + 10), 'Progress updated.')}>+10%</button>
                  </span>
                </div>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${g.progress}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function StudentsInner({ coach }: { coach: CoachProfile }) {
  const [students, setStudents] = useState<CoachStudent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<CoachStudent | null>(null);

  useEffect(() => {
    getMyStudents(coach.id).then((s) => { setStudents(s); setLoaded(true); });
  }, [coach.id]);

  if (!loaded) return null;

  if (selected) return <StudentDetailView coach={coach} student={selected} onBack={() => setSelected(null)} />;

  return (
    <>
      <div className="app-head"><div><h2>My Students</h2><p>Everyone you&apos;ve coached — open a student for notes, homework and goals.</p></div></div>
      <div className="widget">
        {students.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-3)' }}>
            <Users size={36} style={{ opacity: 0.3, marginBottom: '.6rem' }} />
            <p>No students yet.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="adm">
              <thead><tr><th>Student</th><th>Sessions</th><th>Last session</th><th></th></tr></thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id || s.name} style={{ cursor: 'pointer' }} onClick={() => setSelected(s)}>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.sessions}</td>
                    <td>{s.lastSession}</td>
                    <td style={{ textAlign: 'right' }}><ChevronRight size={16} style={{ color: 'var(--text-3)' }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export default function CoachStudentsPage() {
  return <CoachShell>{(coach) => <StudentsInner coach={coach} />}</CoachShell>;
}

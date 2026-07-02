'use client';

import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import CoachShell from '@/components/CoachShell';
import { getMyStudents, type CoachProfile, type CoachStudent } from '@/lib/coach-store';

function StudentsInner({ coach }: { coach: CoachProfile }) {
  const [students, setStudents] = useState<CoachStudent[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getMyStudents(coach.id).then((s) => { setStudents(s); setLoaded(true); });
  }, [coach.id]);

  if (!loaded) return null;

  return (
    <>
      <div className="app-head"><div><h2>My Students</h2><p>Everyone you&apos;ve coached, with session history.</p></div></div>
      <div className="widget">
        {students.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-3)' }}>
            <Users size={36} style={{ opacity: 0.3, marginBottom: '.6rem' }} />
            <p>No students yet.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="adm">
              <thead><tr><th>Student</th><th>Sessions</th><th>Last session</th></tr></thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.name}>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.sessions}</td>
                    <td>{s.lastSession}</td>
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

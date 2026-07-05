'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Phone, CalendarDays, Clock, BarChart, FileText, Ban, KeyRound } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { getUserDetailAdmin, setUserBanned, adminResetPassword, type AdminUserDetail } from '@/lib/admin-store';

function scoreColor(score: number) {
  return score >= 80 ? '#22C55E' : score >= 60 ? '#F59E0B' : '#ef4444';
}

const bookingStatusColor: Record<string, string> = { confirmed: 'blue', completed: 'green', cancelled: 'red' };

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params?.id as string;

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setUser(await getUserDetailAdmin(id));
    setLoaded(true);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const toggleBan = async () => {
    if (!user) return;
    try {
      await setUserBanned(user.id, !user.isBanned);
      toast(user.isBanned ? `${user.name} can sign in again.` : `${user.name} is banned.`);
      load();
    } catch (e: any) {
      toast(e?.message || 'Failed to update ban status.');
    }
  };

  const resetPassword = async () => {
    if (!user) return;
    const res = await adminResetPassword(user.email);
    toast(res.message);
  };

  if (!loaded) return null;
  if (!user) {
    return (
      <div className="widget" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <p style={{ marginBottom: '1rem' }}>User not found.</p>
        <button className="btn btn-ghost btn-sm" onClick={() => router.push('/admin/users')}><ArrowLeft size={15} /> Back to User Management</button>
      </div>
    );
  }

  return (
    <>
      <div className="app-head">
        <div>
          <h2>{user.name}</h2>
          <p>{user.email} &middot; Joined {user.joined} &middot; <span className={`tag ${user.plan === 'Free' ? 'blue' : 'green'}`}>{user.plan}</span></p>
        </div>
        <div style={{ display: 'flex', gap: '.6rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => router.push('/admin/users')}><ArrowLeft size={15} /> Back</button>
          <button className="btn btn-ghost btn-sm" onClick={resetPassword}><KeyRound size={15} /> Reset password</button>
          <button className="btn btn-ghost btn-sm" style={{ color: user.isBanned ? undefined : '#ef4444' }} onClick={toggleBan}>
            <Ban size={15} /> {user.isBanned ? 'Unban' : 'Ban user'}
          </button>
        </div>
      </div>

      {user.isBanned && (
        <div className="widget" style={{ marginBottom: '1rem', borderColor: '#ef4444' }}>
          <p style={{ margin: 0, color: '#ef4444', fontWeight: 600 }}>This user is currently banned and cannot sign in.</p>
        </div>
      )}

      <div className="dash-grid-2">
        {/* Bookings */}
        <div className="widget">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}><CalendarDays size={16} /> Booking history ({user.bookings.length})</h4>
          {user.bookings.length === 0 ? (
            <p style={{ color: 'var(--text-3)', fontSize: '.88rem', padding: '.5rem 0' }}>No coaching sessions booked.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {user.bookings.map((b) => (
                <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--line)', borderRadius: 8, padding: '.55rem .8rem', fontSize: '.86rem' }}>
                  <span>{b.coachName}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '.6rem', color: 'var(--text-2)' }}>
                    <Clock size={13} /> {b.date} · {b.timeSlot}
                    <span className={`tag ${bookingStatusColor[b.status] || 'blue'}`}>{b.status}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI interviews */}
        <div className="widget">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}><BarChart size={16} /> AI interview history ({user.interviews.length})</h4>
          {user.interviews.length === 0 ? (
            <p style={{ color: 'var(--text-3)', fontSize: '.88rem', padding: '.5rem 0' }}>No AI mock interviews yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {user.interviews.map((iv) => (
                <div key={iv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--line)', borderRadius: 8, padding: '.55rem .8rem', fontSize: '.86rem' }}>
                  <span style={{ textTransform: 'capitalize' }}>{iv.type} · {iv.role}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '.7rem' }}>
                    <b style={{ color: scoreColor(iv.score) }}>{iv.score}</b>
                    <span style={{ color: 'var(--text-3)' }}>{new Date(iv.date).toLocaleDateString()}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Resumes */}
      <div className="widget" style={{ marginTop: '1rem' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}><FileText size={16} /> Resume reports ({user.resumes.length})</h4>
        {user.resumes.length === 0 ? (
          <p style={{ color: 'var(--text-3)', fontSize: '.88rem', padding: '.5rem 0' }}>No resumes analyzed yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="adm">
              <thead><tr><th>File</th><th>Target role</th><th>ATS score</th><th>Date</th></tr></thead>
              <tbody>
                {user.resumes.map((r) => (
                  <tr key={r.id}>
                    <td>{r.fileName}</td>
                    <td>{r.targetRole || '—'}</td>
                    <td>{r.atsScore != null ? <b style={{ color: scoreColor(r.atsScore) }}>{r.atsScore}</b> : '—'}</td>
                    <td>{new Date(r.date).toLocaleDateString()}</td>
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

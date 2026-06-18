'use client';

import { useState, useEffect, useCallback } from 'react';
import { GraduationCap, Star, IndianRupee } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { getAdminCoaches, updateAdminCoach } from '@/lib/admin-store';
import type { AdminCoach } from '@/lib/admin-store';

const statusColor = (s: AdminCoach['status']) =>
  s === 'Verified' ? 'green' : s === 'Docs pending' ? 'amber' : 'red';

export default function CoachManagementPage() {
  const { toast } = useToast();
  const [coaches, setCoaches] = useState<AdminCoach[]>([]);

  const refresh = useCallback(() => setCoaches(getAdminCoaches()), []);

  useEffect(() => { refresh(); }, [refresh]);

  const totalPayout = coaches.reduce((sum, c) => {
    const num = Number(c.payoutDue.replace(/,/g, ''));
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  const handleApprove = (id: string) => {
    updateAdminCoach(id, { status: 'Verified' });
    refresh();
    toast('Coach approved and verified');
  };

  const handleTogglePause = (coach: AdminCoach) => {
    const newStatus = coach.status === 'Paused' ? 'Verified' : 'Paused';
    updateAdminCoach(coach.id, { status: newStatus });
    refresh();
    toast(newStatus === 'Paused' ? 'Coach paused' : 'Coach resumed');
  };

  return (
    <>
      <div className="app-head">
        <div>
          <h2>Coach Management</h2>
          <p>{coaches.length} coaches &middot; Total payout due: &#8377;{totalPayout.toLocaleString('en-IN')}</p>
        </div>
        <span className="tag blue" style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
          <GraduationCap size={14} /> {coaches.length} coaches
        </span>
      </div>

      <div className="widget">
        <div className="table-wrap">
          <table className="adm">
            <thead>
              <tr>
                <th>Coach</th>
                <th>Category</th>
                <th>Rating</th>
                <th>Sessions</th>
                <th>Payout due</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {coaches.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span className="mini-ava" style={{ background: c.color }}>{c.initials}</span>
                    {c.name}
                  </td>
                  <td>{c.category}</td>
                  <td style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                    {c.rating} <Star size={13} fill="#FBBF24" stroke="#FBBF24" />
                  </td>
                  <td>{c.sessions}</td>
                  <td>&#8377;{c.payoutDue}</td>
                  <td><span className={`tag ${statusColor(c.status)}`}>{c.status}</span></td>
                  <td style={{ display: 'flex', gap: '.4rem' }}>
                    {c.status === 'Docs pending' && (
                      <button className="btn btn-primary btn-sm" onClick={() => handleApprove(c.id)}>
                        Approve
                      </button>
                    )}
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleTogglePause(c)}
                    >
                      {c.status === 'Paused' ? 'Resume' : 'Pause'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

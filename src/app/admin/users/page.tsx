'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import {
  getAdminUsers,
  deleteAdminUser,
  setUserBanned,
  adminResetPassword,
  type AdminUser,
} from '@/lib/admin-store';
import { useToast } from '@/components/Toast';

const statusColor: Record<string, string> = {
  Active: 'green',
  Trial: 'blue',
  'Payment due': 'amber',
  Suspended: 'red',
};

const planColor: Record<string, string> = {
  Free: 'blue',
  Pro: 'amber',
  Premium: 'green',
};

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    getAdminUsers().then(setUsers);
  }, []);

  const refresh = () => getAdminUsers().then(setUsers);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const handleView = (u: AdminUser) => {
    toast(`${u.name} — ${u.email} | Plan: ${u.plan} | Interviews: ${u.interviews} | Status: ${u.status}`);
  };

  const handleToggleStatus = async (u: AdminUser) => {
    const banning = u.status !== 'Suspended';
    try {
      await setUserBanned(u.id, banning);
      refresh();
      toast(banning ? `${u.name} is banned and can no longer sign in.` : `${u.name} can sign in again.`);
    } catch (e: any) {
      toast(e?.message || 'Failed to update ban status.');
    }
  };

  const handleResetPassword = async (u: AdminUser) => {
    const res = await adminResetPassword(u.email);
    toast(res.message);
  };

  const handleDelete = async (u: AdminUser) => {
    if (!confirm(`Delete user "${u.name}"? This cannot be undone.`)) return;
    await deleteAdminUser(u.id);
    refresh();
    toast(`${u.name} has been deleted`);
  };

  return (
    <>
      <div className="app-head">
        <div>
          <h2>
            User Management{' '}
            <span className="tag blue" style={{ verticalAlign: 'middle', marginLeft: '.5rem' }}>
              {users.length} users
            </span>
          </h2>
          <p>View, manage, and moderate platform users</p>
        </div>
      </div>

      <div className="widget" style={{ marginBottom: '1rem' }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}
            />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.2rem', width: '100%' }}
            />
          </div>
        </div>
      </div>

      <div className="widget">
        <div className="table-wrap">
          <table className="adm">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Plan</th>
                <th>Interviews</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>
                    <span
                      className="mini-ava"
                      style={{ 
                        background: u.color,
                        backgroundImage: u.imageUrl ? `url(${u.imageUrl})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        color: u.imageUrl ? 'transparent' : 'inherit'
                      }}
                    >
                      {u.initials}
                    </span>
                    {u.name}
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`tag ${planColor[u.plan] || 'blue'}`}>{u.plan}</span>
                  </td>
                  <td>{u.interviews}</td>
                  <td>{u.joined}</td>
                  <td>
                    <span className={`tag ${statusColor[u.status] || 'blue'}`}>{u.status}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleView(u)}>
                        View
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleToggleStatus(u)}>
                        {u.status === 'Suspended' ? 'Unban' : 'Ban'}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleResetPassword(u)}>
                        Reset password
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: '#EF4444' }}
                        onClick={() => handleDelete(u)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '2rem' }}>
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

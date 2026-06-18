'use client';

import { useEffect, useState } from 'react';
import { Users, Mic, IndianRupee, TicketCheck, CheckCircle } from 'lucide-react';
import { getAdminStats, getAdminUsers, type AdminUser } from '@/lib/admin-store';

export default function AdminDashboard() {
  const [stats, setStats] = useState<{ totalUsers: number; interviewsThisWeek: number; revenue: string; openTickets: number } | null>(null);
  const [recentUsers, setRecentUsers] = useState<AdminUser[]>([]);

  useEffect(() => {
    setStats(getAdminStats());
    setRecentUsers(getAdminUsers().slice(0, 5));
  }, []);

  if (!stats) return null;

  const kpis = [
    { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: Users, color: '#2563EB' },
    { label: 'Interviews this week', value: stats.interviewsThisWeek.toString(), icon: Mic, color: '#06B6D4' },
    { label: 'Revenue this month', value: `₹${stats.revenue}`, icon: IndianRupee, color: '#22C55E' },
    { label: 'Open Tickets', value: stats.openTickets.toString(), icon: TicketCheck, color: '#F59E0B' },
  ];

  const statusTag = (s: string) => {
    if (s === 'Active') return 'green';
    if (s === 'Trial') return 'blue';
    if (s === 'Payment due') return 'amber';
    return 'red';
  };

  return (
    <>
      <div className="app-head">
        <div>
          <h2>Admin Dashboard</h2>
          <p>Platform overview and key metrics</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="dash-grid">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div className="widget" key={k.label}>
              <div className="kpi">
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.3rem' }}>
                  <span
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: `${k.color}22`,
                      display: 'grid',
                      placeItems: 'center',
                      color: k.color,
                    }}
                  >
                    <Icon size={18} />
                  </span>
                </div>
                <span className="v">{k.value}</span>
                <span className="l">{k.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick overview */}
      <div className="dash-grid-2">
        <div className="widget">
          <h4>
            Recent Users
            <a href="/admin/users">View all</a>
          </h4>
          {recentUsers.map((u) => (
            <div className="list-row" key={u.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                <span className="mini-ava" style={{ background: u.color }}>{u.initials}</span>
                <div>
                  <b style={{ fontSize: '.88rem' }}>{u.name}</b>
                  <div className="meta">{u.email}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                <span className={`tag ${statusTag(u.status)}`}>{u.status}</span>
                <span className="tag blue">{u.plan}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="widget">
          <h4>System Status</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 0' }}>
            {[
              { label: 'API Gateway', ok: true },
              { label: 'Interview Engine', ok: true },
              { label: 'ATS Analyzer', ok: true },
              { label: 'Payment Gateway', ok: true },
              { label: 'Database Cluster', ok: true },
            ].map((s) => (
              <div key={s.label} className="list-row" style={{ padding: '.45rem 0' }}>
                <span style={{ fontSize: '.88rem' }}>{s.label}</span>
                <span className="tag green" style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                  <CheckCircle size={12} /> Operational
                </span>
              </div>
            ))}
            <div style={{ textAlign: 'center', marginTop: '.5rem' }}>
              <span className="tag green" style={{ fontSize: '.78rem', padding: '.35rem .9rem' }}>
                All systems operational
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp, Users, Mic, IndianRupee, Wallet, Percent, XCircle, CheckCircle } from 'lucide-react';
import { getAnalytics, getFinancialStats, type AnalyticsData, type FinancialStats } from '@/lib/admin-store';

function BarChart({ data, color, prefix }: { data: { label: string; value: number }[]; color: string; prefix?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '.6rem', height: 180, padding: '1rem 0' }}>
      {data.map((d) => (
        <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.4rem', height: '100%', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '.72rem', color: 'var(--text-2)', fontWeight: 600 }}>{prefix}{d.value.toLocaleString()}</span>
          <div style={{ width: '100%', maxWidth: 46, height: `${(d.value / max) * 100}%`, minHeight: 4, background: color, borderRadius: '6px 6px 0 0', transition: 'height .4s ease' }} />
          <span style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [fin, setFin] = useState<FinancialStats | null>(null);

  useEffect(() => {
    getAnalytics().then(setData);
    getFinancialStats().then(setFin).catch(() => {});
  }, []);

  if (!data) return null;

  const totalSignups = data.signupsByMonth.reduce((s, d) => s + d.value, 0);
  const totalInterviews = data.interviewsByMonth.reduce((s, d) => s + d.value, 0);
  const totalRevenue = data.revenueByMonth.reduce((s, d) => s + d.value, 0);
  const paidUsers = data.planBreakdown.filter((p) => p.plan !== 'free').reduce((s, p) => s + p.count, 0);
  const allUsers = data.planBreakdown.reduce((s, p) => s + p.count, 0);

  const kpis = [
    { label: 'Signups (6 mo)', value: totalSignups.toLocaleString(), icon: Users, color: '#2563EB' },
    { label: 'Interviews (6 mo)', value: totalInterviews.toLocaleString(), icon: Mic, color: '#06B6D4' },
    { label: 'Revenue (6 mo)', value: `₹${totalRevenue.toLocaleString()}`, icon: IndianRupee, color: '#22C55E' },
    { label: 'Paid conversion', value: allUsers ? `${Math.round((paidUsers / allUsers) * 100)}%` : '0%', icon: TrendingUp, color: '#F59E0B' },
  ];

  return (
    <>
      <div className="app-head"><div><h2>Analytics</h2><p>Platform growth over the last 6 months.</p></div></div>

      <div className="dash-grid">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div className="widget kpi" key={k.label}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.3rem' }}>
                <span style={{ width: 36, height: 36, borderRadius: 10, background: `${k.color}22`, display: 'grid', placeItems: 'center', color: k.color }}><Icon size={18} /></span>
              </div>
              <span className="v">{k.value}</span>
              <span className="l">{k.label}</span>
            </div>
          );
        })}
      </div>

      {/* Coaching marketplace financials */}
      {fin && (
        <div className="widget" style={{ marginTop: '1rem' }}>
          <h4 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Coaching financials
            <Link href="/admin/payouts" style={{ fontSize: '.82rem', color: 'var(--blue)' }}>Manage payouts →</Link>
          </h4>
          <div className="dash-grid" style={{ marginTop: '.6rem' }}>
            {[
              { label: 'Total revenue (paid bookings)', value: `₹${fin.totalRevenue.toLocaleString()}`, icon: IndianRupee, color: '#22C55E' },
              { label: 'Coach earnings', value: `₹${fin.coachEarnings.toLocaleString()}`, icon: Wallet, color: '#2563EB' },
              { label: 'Platform commission', value: `₹${fin.platformCommission.toLocaleString()}`, icon: Percent, color: '#7C3AED' },
              { label: 'Pending payouts', value: `₹${fin.pendingPayouts.toLocaleString()}`, icon: Wallet, color: '#F59E0B' },
            ].map((k) => {
              const Icon = k.icon;
              return (
                <div className="widget kpi" key={k.label} style={{ boxShadow: 'none', border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.3rem' }}>
                    <span style={{ width: 36, height: 36, borderRadius: 10, background: `${k.color}22`, display: 'grid', placeItems: 'center', color: k.color }}><Icon size={18} /></span>
                  </div>
                  <span className="v">{k.value}</span>
                  <span className="l">{k.label}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '.8rem', fontSize: '.88rem', color: 'var(--text-2)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}><CheckCircle size={15} style={{ color: '#22C55E' }} /> Completion rate: <b>{fin.completionRate}%</b> ({fin.completedBookings}/{fin.totalBookings})</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}><XCircle size={15} style={{ color: '#ef4444' }} /> Cancellation rate: <b>{fin.cancellationRate}%</b> ({fin.cancelledBookings}/{fin.totalBookings})</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}><Wallet size={15} style={{ color: '#22C55E' }} /> Paid out so far: <b>₹{fin.paidPayouts.toLocaleString()}</b></span>
          </div>
        </div>
      )}

      <div className="dash-grid-2" style={{ marginTop: '1rem' }}>
        <div className="widget"><h4>New signups</h4><BarChart data={data.signupsByMonth} color="#2563EB" /></div>
        <div className="widget"><h4>Interviews completed</h4><BarChart data={data.interviewsByMonth} color="#06B6D4" /></div>
        <div className="widget"><h4>Revenue (₹)</h4><BarChart data={data.revenueByMonth} color="#22C55E" prefix="₹" /></div>
        <div className="widget">
          <h4>Plan breakdown</h4>
          {data.planBreakdown.map((p) => {
            const pct = allUsers ? Math.round((p.count / allUsers) * 100) : 0;
            return (
              <div className="skill-row" key={p.plan}>
                <div className="top"><b style={{ textTransform: 'capitalize' }}>{p.plan}</b><span>{p.count} · {pct}%</span></div>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

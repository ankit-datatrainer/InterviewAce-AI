'use client';

import { useState, useEffect } from 'react';
import { IndianRupee, Wallet, Clock } from 'lucide-react';
import CoachShell from '@/components/CoachShell';
import { getMyEarnings, type CoachProfile, type CoachEarnings } from '@/lib/coach-store';

function EarningsInner({ coach }: { coach: CoachProfile }) {
  const [earnings, setEarnings] = useState<CoachEarnings | null>(null);

  useEffect(() => { getMyEarnings(coach).then(setEarnings); }, [coach]);

  if (!earnings) return null;

  const kpis = [
    { label: 'Paid out', value: `₹${earnings.paidTotal.toLocaleString()}`, icon: Wallet, color: '#22C55E' },
    { label: 'Pending payout', value: `₹${earnings.pendingTotal.toLocaleString()}`, icon: Clock, color: '#F59E0B' },
    { label: 'Lifetime earnings (est.)', value: `₹${earnings.lifetimeGross.toLocaleString()}`, icon: IndianRupee, color: '#2563EB' },
  ];

  return (
    <>
      <div className="app-head">
        <div><h2>Earnings</h2><p>Your payouts and lifetime earnings (after {coach.commissionPct}% platform fee).</p></div>
      </div>

      <div className="dash-grid">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div className="widget kpi" key={k.label}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.3rem' }}>
                <span style={{ width: 36, height: 36, borderRadius: 10, background: `${k.color}22`, display: 'grid', placeItems: 'center', color: k.color }}>
                  <Icon size={18} />
                </span>
              </div>
              <span className="v">{k.value}</span>
              <span className="l">{k.label}</span>
            </div>
          );
        })}
      </div>

      <div className="widget" style={{ marginTop: '1rem' }}>
        <h4>Payout history</h4>
        {earnings.payouts.length === 0 ? (
          <p style={{ color: 'var(--text-3)', padding: '1rem 0' }}>No payouts yet. Earnings appear here once an admin processes a payout.</p>
        ) : (
          <div className="table-wrap">
            <table className="adm">
              <thead><tr><th>Period</th><th>Amount</th><th>Status</th><th>Paid on</th></tr></thead>
              <tbody>
                {earnings.payouts.map((p) => (
                  <tr key={p.id}>
                    <td>{p.periodStart && p.periodEnd ? `${p.periodStart} → ${p.periodEnd}` : '—'}</td>
                    <td><strong>₹{p.amount.toLocaleString()}</strong></td>
                    <td><span className={`tag ${p.status === 'paid' ? 'green' : 'amber'}`}>{p.status}</span></td>
                    <td>{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}</td>
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

export default function CoachEarningsPage() {
  return <CoachShell>{(coach) => <EarningsInner coach={coach} />}</CoachShell>;
}

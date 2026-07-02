'use client';

import { useState, useEffect, useCallback } from 'react';
import { Wallet, Plus, Check, X } from 'lucide-react';
import { useToast } from '@/components/Toast';
import {
  getAdminPayouts,
  getAdminCoaches,
  createPayout,
  markPayoutPaid,
  type AdminPayout,
  type AdminCoach,
} from '@/lib/admin-store';

export default function PayoutsPage() {
  const { toast } = useToast();
  const [payouts, setPayouts] = useState<AdminPayout[]>([]);
  const [coaches, setCoaches] = useState<AdminCoach[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [coachId, setCoachId] = useState('');
  const [amount, setAmount] = useState(0);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const refresh = useCallback(async () => {
    setPayouts(await getAdminPayouts());
    setCoaches(await getAdminCoaches());
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const pendingTotal = payouts.filter((p) => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  const paidTotal = payouts.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);

  const handleCreate = async () => {
    if (!coachId || amount <= 0) { toast('Pick a coach and enter an amount.'); return; }
    await createPayout(coachId, amount, start || undefined, end || undefined);
    toast('Payout created.');
    setShowAdd(false); setCoachId(''); setAmount(0); setStart(''); setEnd('');
    refresh();
  };

  const handlePaid = async (id: string) => {
    await markPayoutPaid(id);
    toast('Payout marked as paid.');
    refresh();
  };

  return (
    <>
      <div className="app-head">
        <div><h2>Coach Payouts</h2><p>Pending: ₹{pendingTotal.toLocaleString('en-IN')} · Paid: ₹{paidTotal.toLocaleString('en-IN')}</p></div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}><Plus size={16} /> New payout</button>
      </div>

      <div className="widget">
        <div className="table-wrap">
          <table className="adm">
            <thead><tr><th>Coach</th><th>Period</th><th>Amount</th><th>Status</th><th>Paid on</th><th>Actions</th></tr></thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.coachName}</strong></td>
                  <td>{p.periodStart && p.periodEnd ? `${p.periodStart} → ${p.periodEnd}` : '—'}</td>
                  <td>₹{p.amount.toLocaleString('en-IN')}</td>
                  <td><span className={`tag ${p.status === 'paid' ? 'green' : 'amber'}`}>{p.status}</span></td>
                  <td>{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}</td>
                  <td>{p.status === 'pending' && <button className="btn btn-primary btn-sm" onClick={() => handlePaid(p.id)}><Check size={14} /> Mark paid</button>}</td>
                </tr>
              ))}
              {payouts.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '2rem' }}><Wallet size={28} style={{ opacity: 0.3, display: 'block', margin: '0 auto .5rem' }} />No payouts yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowAdd(false)}>
          <div className="widget" style={{ maxWidth: 460, width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0 }}>New payout</h4>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}><X size={16} /></button>
            </div>
            <div className="field"><label>Coach</label><select className="input" value={coachId} onChange={(e) => setCoachId(e.target.value)}><option value="">Select…</option>{coaches.map((c) => <option key={c.id} value={c.id}>{c.name} (due ₹{c.payoutDue})</option>)}</select></div>
            <div className="field"><label>Amount (₹)</label><input type="number" className="input" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></div>
            <div className="dash-grid-2">
              <div className="field"><label>Period start</label><input type="date" className="input" value={start} onChange={(e) => setStart(e.target.value)} /></div>
              <div className="field"><label>Period end</label><input type="date" className="input" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
            </div>
            <div style={{ display: 'flex', gap: '.5rem', marginTop: '.5rem' }}>
              <button className="btn btn-primary" onClick={handleCreate}>Create payout</button>
              <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

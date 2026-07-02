'use client';

import { useState, useEffect, useCallback } from 'react';
import { GraduationCap, Star, Plus, X, Link2, Check, Ban } from 'lucide-react';
import { useToast } from '@/components/Toast';
import {
  getAdminCoaches,
  setCoachStatus,
  createCoach,
  linkCoachToUser,
  type AdminCoach,
  type NewCoachInput,
} from '@/lib/admin-store';

const statusColor = (s: string) => (s === 'Approved' ? 'green' : s === 'Pending' ? 'amber' : 'red');

const CATEGORIES = ['communication', 'personality', 'interview', 'hr', 'corporate', 'career'];

const emptyCoach: NewCoachInput = { name: '', email: '', title: '', bio: '', category: 'interview', pricePerSession: 1000, experienceYears: 5, tags: [], commissionPct: 20 };

export default function CoachManagementPage() {
  const { toast } = useToast();
  const [coaches, setCoaches] = useState<AdminCoach[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<NewCoachInput>(emptyCoach);
  const [tagsStr, setTagsStr] = useState('');
  const [linkFor, setLinkFor] = useState<AdminCoach | null>(null);
  const [linkEmail, setLinkEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => setCoaches(await getAdminCoaches()), []);
  useEffect(() => { refresh(); }, [refresh]);

  const totalPayout = coaches.reduce((sum, c) => sum + (Number(c.payoutDue.replace(/,/g, '')) || 0), 0);
  const pending = coaches.filter((c) => c.status === 'Pending').length;

  const handleStatus = async (id: string, status: 'approved' | 'suspended' | 'pending') => {
    await setCoachStatus(id, status);
    await refresh();
    toast(`Coach ${status}.`);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) { toast('Coach name is required.'); return; }
    setSaving(true);
    const id = await createCoach({ ...form, tags: tagsStr.split(',').map((t) => t.trim()).filter(Boolean) });
    setSaving(false);
    if (!id) { toast('Failed to create coach.'); return; }
    toast('Coach created (status: pending). Link them to a user account next.');
    setShowAdd(false);
    setForm(emptyCoach);
    setTagsStr('');
    refresh();
  };

  const handleLink = async () => {
    if (!linkFor || !linkEmail.trim()) return;
    setSaving(true);
    const res = await linkCoachToUser(linkFor.id, linkEmail.trim());
    setSaving(false);
    toast(res.message);
    if (res.ok) { setLinkFor(null); setLinkEmail(''); refresh(); }
  };

  return (
    <>
      <div className="app-head">
        <div>
          <h2>Coach Management</h2>
          <p>{coaches.length} coaches · {pending} pending · Total payout due: ₹{totalPayout.toLocaleString('en-IN')}</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}><Plus size={16} /> Add coach</button>
      </div>

      <div className="widget">
        <div className="table-wrap">
          <table className="adm">
            <thead>
              <tr><th>Coach</th><th>Category</th><th>Rating</th><th>Sessions</th><th>Payout due</th><th>Account</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {coaches.map((c) => (
                <tr key={c.id}>
                  <td><span className="mini-ava" style={{ background: c.color }}>{c.initials}</span> {c.name}</td>
                  <td style={{ textTransform: 'capitalize' }}>{c.category}</td>
                  <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem' }}>{c.rating} <Star size={13} fill="#FBBF24" stroke="#FBBF24" /></span></td>
                  <td>{c.sessions}</td>
                  <td>₹{c.payoutDue}</td>
                  <td>{c.linked ? <span className="tag green">Linked</span> : <span className="tag amber">Unlinked</span>}</td>
                  <td><span className={`tag ${statusColor(c.status)}`}>{c.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                      {c.status !== 'Approved' && <button className="btn btn-primary btn-sm" onClick={() => handleStatus(c.id, 'approved')}><Check size={14} /> Approve</button>}
                      {c.status === 'Approved' && <button className="btn btn-ghost btn-sm" onClick={() => handleStatus(c.id, 'suspended')}><Ban size={14} /> Suspend</button>}
                      <button className="btn btn-ghost btn-sm" onClick={() => { setLinkFor(c); setLinkEmail(c.email || ''); }}><Link2 size={14} /> Link</button>
                    </div>
                  </td>
                </tr>
              ))}
              {coaches.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '2rem' }}>No coaches yet. Add your first coach.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add coach modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }} onClick={() => setShowAdd(false)}>
          <div className="widget" style={{ maxWidth: 560, width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '.5rem' }}><GraduationCap size={18} /> Add a new coach</h4>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}><X size={16} /></button>
            </div>
            <div className="dash-grid-2">
              <div className="field"><label>Name *</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="field"><label>Email (account to link)</label><input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="field"><label>Headline / Title</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="field"><label>Category</label><select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}</select></div>
              <div className="field"><label>Price / session (₹)</label><input type="number" className="input" value={form.pricePerSession} onChange={(e) => setForm({ ...form, pricePerSession: Number(e.target.value) })} /></div>
              <div className="field"><label>Experience (years)</label><input type="number" className="input" value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: Number(e.target.value) })} /></div>
              <div className="field"><label>Commission %</label><input type="number" className="input" value={form.commissionPct} onChange={(e) => setForm({ ...form, commissionPct: Number(e.target.value) })} /></div>
              <div className="field"><label>Tags (comma separated)</label><input className="input" value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} /></div>
            </div>
            <div className="field"><label>Bio</label><textarea className="input" rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
            <div style={{ display: 'flex', gap: '.5rem', marginTop: '.5rem' }}>
              <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? 'Creating…' : 'Create coach'}</button>
              <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Link to user modal */}
      {linkFor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setLinkFor(null)}>
          <div className="widget" style={{ maxWidth: 440, width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0 }}>Link {linkFor.name} to an account</h4>
              <button className="btn btn-ghost btn-sm" onClick={() => setLinkFor(null)}><X size={16} /></button>
            </div>
            <p style={{ color: 'var(--text-2)', fontSize: '.9rem', marginBottom: '1rem' }}>The user must already have signed up. This grants them the <b>coach</b> role and access to the Coach Portal.</p>
            <div className="field"><label>User email</label><input className="input" value={linkEmail} onChange={(e) => setLinkEmail(e.target.value)} placeholder="coach@example.com" /></div>
            <div style={{ display: 'flex', gap: '.5rem', marginTop: '.5rem' }}>
              <button className="btn btn-primary" onClick={handleLink} disabled={saving}>{saving ? 'Linking…' : 'Link account'}</button>
              <button className="btn btn-ghost" onClick={() => setLinkFor(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

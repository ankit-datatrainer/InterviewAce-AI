'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Star, Plus, X, Link2, Check, Ban, Settings2, Trash2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/components/Toast';
import {
  getAdminCoaches,
  setCoachStatus,
  createCoach,
  linkCoachToUser,
  deleteAdminCoach,
  type AdminCoach,
  type NewCoachInput,
} from '@/lib/admin-store';

const statusColor = (s: string) => (s === 'Approved' ? 'green' : s === 'Pending' ? 'amber' : 'red');

const CATEGORIES = ['communication', 'personality', 'interview', 'hr', 'corporate', 'career'];

const emptyCoach: NewCoachInput = { name: '', email: '', title: '', bio: '', category: 'interview', pricePerSession: 1000, experienceYears: 5, tags: [], commissionPct: 20, imageUrl: '', introVideoUrl: '' };

/* ── Shared modal overlay style (scrollable, top-aligned) ── */
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  zIndex: 9999,
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: '2rem 1rem',
  overflowY: 'auto',
};

/* ── Password input with show/hide toggle ── */
function PasswordField({ label, value, onChange, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="field">
      <label>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          className="input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ paddingRight: 40 }}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: 'var(--text-3)',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
          }}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

export default function CoachManagementPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [coaches, setCoaches] = useState<AdminCoach[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<NewCoachInput>(emptyCoach);
  const [tagsStr, setTagsStr] = useState('');
  const [linkFor, setLinkFor] = useState<AdminCoach | null>(null);
  const [linkEmail, setLinkEmail] = useState('');
  const [saving, setSaving] = useState(false);

  // Add-coach password fields
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

  // Link-modal password fields
  const [linkPassword, setLinkPassword] = useState('');
  const [linkPasswordConfirm, setLinkPasswordConfirm] = useState('');

  const refresh = useCallback(async () => setCoaches(await getAdminCoaches()), []);
  useEffect(() => { refresh(); }, [refresh]);

  const totalPayout = coaches.reduce((sum, c) => sum + (Number(c.payoutDue.replace(/,/g, '')) || 0), 0);
  const pending = coaches.filter((c) => c.status === 'Pending').length;

  const handleStatus = async (id: string, status: 'approved' | 'suspended' | 'pending') => {
    await setCoachStatus(id, status);
    await refresh();
    toast(`Coach ${status}.`);
  };

  const handleDelete = async (c: AdminCoach) => {
    if (!confirm(`Delete "${c.name}" permanently? This removes them from the marketplace and cannot be undone.`)) return;
    await deleteAdminCoach(c.id);
    await refresh();
    toast(`${c.name} deleted.`);
  };

  // Creates the coach's login account and emails them their credentials.
  const createLoginAccount = async (coachId: string, name: string, email: string, password?: string): Promise<boolean> => {
    if (password && password.length < 8) { toast('Password must be at least 8 characters.'); return false; }
    try {
      const res = await fetch('/api/admin/coaches/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachId, name, email, password: password || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error || 'Could not create the login account.'); return false; }
      toast(data.emailSent
        ? `Login created — credentials emailed to ${email}.`
        : 'Login created, but the email could not be sent. Share the credentials manually.');
      return true;
    } catch {
      toast('Could not create the login account.');
      return false;
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim()) { toast('Coach name is required.'); return; }

    // Password validation (only when email is provided — account will be created)
    const coachEmail = (form.email || '').trim();
    if (coachEmail) {
      if (!newPassword.trim()) { toast('Please enter a password for the coach account.'); return; }
      if (newPassword.length < 8) { toast('Password must be at least 8 characters.'); return; }
      if (newPassword !== newPasswordConfirm) { toast('Passwords do not match. Please re-enter.'); return; }
    }

    setSaving(true);
    const id = await createCoach({ ...form, tags: tagsStr.split(',').map((t) => t.trim()).filter(Boolean) });
    if (!id) { setSaving(false); toast('Failed to create coach.'); return; }
    // If an email was provided, also create their login and email the credentials.
    if (coachEmail) {
      await createLoginAccount(id, form.name.trim(), coachEmail, newPassword.trim());
    } else {
      toast('Coach created (status: pending). Add an account via "Link / Account" next.');
    }
    setSaving(false);
    setShowAdd(false);
    setForm(emptyCoach);
    setTagsStr('');
    setNewPassword('');
    setNewPasswordConfirm('');
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
              <tr><th>Coach</th><th>Category</th><th>Tier</th><th>Rating</th><th>Sessions</th><th>Price</th><th>Payout due</th><th>Account</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {coaches.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span 
                      className="mini-ava" 
                      style={{ 
                        background: c.color,
                        backgroundImage: c.imageUrl ? `url(${c.imageUrl})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        color: c.imageUrl ? 'transparent' : 'inherit'
                      }}
                    >
                      {c.initials}
                    </span> {c.name}
                    {!c.visibility && <span className="tag red" style={{ marginLeft: 6 }}>Hidden</span>}
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{c.category}</td>
                  <td><span className={`tag ${c.priority === 'Premium' ? 'green' : c.priority === 'Featured' ? 'blue' : 'amber'}`}>{c.priority}</span></td>
                  <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem' }}>{c.rating} <Star size={13} fill="#FBBF24" stroke="#FBBF24" /></span></td>
                  <td>{c.sessions}</td>
                  <td>₹{c.pricePerSession.toLocaleString()}</td>
                  <td>₹{c.payoutDue}</td>
                  <td>{c.linked ? <span className="tag green">Linked</span> : <span className="tag amber">Unlinked</span>}</td>
                  <td><span className={`tag ${statusColor(c.status)}`}>{c.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                      {c.status !== 'Approved' && <button className="btn btn-primary btn-sm" onClick={() => handleStatus(c.id, 'approved')}><Check size={14} /> Approve</button>}
                      {c.status === 'Approved' && <button className="btn btn-ghost btn-sm" onClick={() => handleStatus(c.id, 'suspended')}><Ban size={14} /> Suspend</button>}
                      <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/admin/coaches/${c.id}`)}><Settings2 size={14} /> Manage</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setLinkFor(c); setLinkEmail(c.email || ''); }}><Link2 size={14} /> {c.linked ? 'Account' : 'Link / Create login'}</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} onClick={() => handleDelete(c)}><Trash2 size={14} /> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {coaches.length === 0 && <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '2rem' }}>No coaches yet. Add your first coach.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════════ Add coach modal ═══════════ */}
      {showAdd && (
        <div style={overlayStyle} onClick={() => setShowAdd(false)}>
          <div
            className="widget"
            style={{ maxWidth: 680, width: '100%', marginTop: '1rem', marginBottom: '2rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '.5rem' }}><GraduationCap size={18} /> Add a new coach</h4>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}><X size={16} /></button>
            </div>

            {/* Form fields */}
            <div className="dash-grid-2">
              <div className="field"><label>Name *</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="field"><label>Email (account to link)</label><input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="field"><label>Headline / Title</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="field"><label>Category</label><select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}</select></div>
              <div className="field"><label>Price / session (₹)</label><input type="number" className="input" value={form.pricePerSession} onChange={(e) => setForm({ ...form, pricePerSession: Number(e.target.value) })} /></div>
              <div className="field"><label>Experience (years)</label><input type="number" className="input" value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: Number(e.target.value) })} /></div>
              <div className="field"><label>Commission %</label><input type="number" className="input" value={form.commissionPct} onChange={(e) => setForm({ ...form, commissionPct: Number(e.target.value) })} /></div>
              <div className="field"><label>Tags (comma separated)</label><input className="input" value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} /></div>
              <div className="field"><label>Profile Image URL</label><input className="input" placeholder="https://..." value={form.imageUrl || ''} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} /></div>
              <div className="field" style={{ gridColumn: '1 / -1' }}><label>Intro Video URL</label><input className="input" placeholder="https://youtube.com/..." value={form.introVideoUrl || ''} onChange={(e) => setForm({ ...form, introVideoUrl: e.target.value })} /></div>
            </div>

            {/* Password section */}
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              borderRadius: 12,
              border: '1px solid var(--line)',
              background: 'var(--card)',
            }}>
              <p style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '.75rem', textTransform: 'uppercase', letterSpacing: '.03em' }}>
                Coach Login Password
              </p>
              <div className="dash-grid-2">
                <PasswordField
                  label="Password *"
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder="Min 8 characters"
                />
                <PasswordField
                  label="Confirm Password *"
                  value={newPasswordConfirm}
                  onChange={setNewPasswordConfirm}
                  placeholder="Re-enter password"
                />
              </div>
              {newPassword && newPasswordConfirm && newPassword !== newPasswordConfirm && (
                <p style={{ color: 'var(--error-text)', fontSize: '.8rem', marginTop: '.35rem' }}>⚠ Passwords do not match</p>
              )}
              {newPassword && newPasswordConfirm && newPassword === newPasswordConfirm && newPassword.length >= 8 && (
                <p style={{ color: 'var(--success-text)', fontSize: '.8rem', marginTop: '.35rem' }}>✓ Passwords match</p>
              )}
            </div>

            <p style={{ color: 'var(--text-3)', fontSize: '.8rem', margin: '.75rem 0' }}>
              If an email is filled in, a login account is created automatically and the ID + password are emailed to the coach. Passwords are stored securely (hashed) — never in plain text.
            </p>

            {/* Bio */}
            <div className="field"><label>Bio</label><textarea className="input" rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '.5rem', marginTop: '.75rem' }}>
              <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? 'Creating…' : 'Create coach'}</button>
              <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ Link to user modal ═══════════ */}
      {linkFor && (
        <div style={overlayStyle} onClick={() => setLinkFor(null)}>
          <div className="widget" style={{ maxWidth: 440, width: '100%', marginTop: '3rem' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0 }}>Link {linkFor.name} to an account</h4>
              <button className="btn btn-ghost btn-sm" onClick={() => setLinkFor(null)}><X size={16} /></button>
            </div>
            <p style={{ color: 'var(--text-2)', fontSize: '.9rem', marginBottom: '1rem' }}>
              <b>Link account</b> — the user already signed up; grants them the <b>coach</b> role.<br />
              <b>Create account</b> — makes a brand-new login and <b>emails them their ID, password and login link</b> automatically.
            </p>
            <div className="field"><label>Coach email</label><input className="input" value={linkEmail} onChange={(e) => setLinkEmail(e.target.value)} placeholder="coach@example.com" /></div>

            {/* Password section for link modal */}
            <div style={{
              marginTop: '.5rem',
              padding: '1rem',
              borderRadius: 12,
              border: '1px solid var(--line)',
              background: 'var(--card)',
              marginBottom: '.75rem',
            }}>
              <p style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '.75rem', textTransform: 'uppercase', letterSpacing: '.03em' }}>
                Password (for &quot;Create account&quot; only)
              </p>
              <div className="dash-grid-2">
                <PasswordField
                  label="Password"
                  value={linkPassword}
                  onChange={setLinkPassword}
                  placeholder="Min 8 characters"
                />
                <PasswordField
                  label="Confirm Password"
                  value={linkPasswordConfirm}
                  onChange={setLinkPasswordConfirm}
                  placeholder="Re-enter password"
                />
              </div>
              {linkPassword && linkPasswordConfirm && linkPassword !== linkPasswordConfirm && (
                <p style={{ color: 'var(--error-text)', fontSize: '.8rem', marginTop: '.35rem' }}>⚠ Passwords do not match</p>
              )}
              {linkPassword && linkPasswordConfirm && linkPassword === linkPasswordConfirm && linkPassword.length >= 8 && (
                <p style={{ color: 'var(--success-text)', fontSize: '.8rem', marginTop: '.35rem' }}>✓ Passwords match</p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '.5rem', marginTop: '.5rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={handleLink} disabled={saving}>{saving ? 'Working…' : 'Link existing account'}</button>
              <button
                className="btn btn-primary"
                disabled={saving}
                onClick={async () => {
                  if (!linkFor || !linkEmail.trim()) { toast('Enter the coach\'s email first.'); return; }
                  if (linkPassword && linkPasswordConfirm && linkPassword !== linkPasswordConfirm) {
                    toast('Passwords do not match.'); return;
                  }
                  if (linkPassword && linkPassword.length < 8) { toast('Password must be at least 8 characters.'); return; }
                  setSaving(true);
                  const ok = await createLoginAccount(linkFor.id, linkFor.name, linkEmail.trim(), linkPassword.trim() || undefined);
                  setSaving(false);
                  if (ok) { setLinkFor(null); setLinkEmail(''); setLinkPassword(''); setLinkPasswordConfirm(''); refresh(); }
                }}
              >
                {saving ? 'Working…' : 'Create account & email credentials'}
              </button>
              <button className="btn btn-ghost" onClick={() => setLinkFor(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

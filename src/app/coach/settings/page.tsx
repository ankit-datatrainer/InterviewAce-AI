'use client';

import { useState } from 'react';
import { User, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useToast } from '@/components/Toast';
import CoachShell from '@/components/CoachShell';
import { updateMyCoachProfile, type CoachProfile } from '@/lib/coach-store';
import { createClient } from '@/lib/supabase';

function SettingsInner({ coach }: { coach: CoachProfile }) {
  const { toast } = useToast();

  // Profile
  const [name, setName] = useState(coach.name);
  const [title, setTitle] = useState(coach.title || '');
  const [bio, setBio] = useState(coach.bio || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Credentials
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingCreds, setSavingCreds] = useState(false);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast('Name cannot be empty.'); return; }
    setSavingProfile(true);
    try {
      await updateMyCoachProfile(coach.id, { name: name.trim(), title: title.trim(), bio: bio.trim() });
      toast('Profile saved.');
    } catch {
      toast('Could not save your profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { toast('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { toast('Passwords do not match.'); return; }
    setSavingCreds(true);
    try {
      // Supabase stores passwords securely (hashed) — never in plain text.
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      toast('Password changed successfully. Use the new password next time you log in.');
    } catch (err: any) {
      toast(err?.message || 'Could not change the password.');
    } finally {
      setSavingCreds(false);
    }
  };

  const changeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail.trim())) { toast('Enter a valid email address.'); return; }
    setSavingCreds(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser(
        { email: newEmail.trim() },
        { emailRedirectTo: `${window.location.origin}/auth/verified` },
      );
      if (error) throw error;
      toast('Check your new inbox — confirm the link there to finish changing your login email.');
      setNewEmail('');
    } catch (err: any) {
      toast(err?.message || 'Could not change the email.');
    } finally {
      setSavingCreds(false);
    }
  };

  return (
    <>
      <div className="app-head">
        <div>
          <h2>Coach Settings</h2>
          <p>Manage your profile and login credentials.</p>
        </div>
      </div>

      {/* Profile */}
      <div className="widget" style={{ marginBottom: '1rem' }}>
        <h4><span style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}><User size={18} /> Profile Information</span></h4>
        <form onSubmit={saveProfile}>
          <div className="field">
            <label>Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>Specialization / Headline</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Senior Product Manager Coach" />
          </div>
          <div className="field">
            <label>Bio</label>
            <textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell students about your experience…" />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={savingProfile}>
            {savingProfile ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="widget" style={{ marginBottom: '1rem' }}>
        <h4><span style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}><Lock size={18} /> Change Password</span></h4>
        <p style={{ color: 'var(--text-2)', fontSize: '.88rem', marginBottom: '1rem' }}>
          Your password is stored securely (hashed) — it is never saved or emailed in plain text after this change.
        </p>
        <form onSubmit={changePassword}>
          <div className="field">
            <label>New password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" />
          </div>
          <div className="field">
            <label>Confirm new password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={savingCreds}>
            {savingCreds ? 'Working…' : 'Change password'}
          </button>
        </form>
      </div>

      {/* Change login email */}
      <div className="widget" style={{ marginBottom: '1rem' }}>
        <h4><span style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}><Mail size={18} /> Change Login Email</span></h4>
        <p style={{ color: 'var(--text-2)', fontSize: '.88rem', marginBottom: '1rem' }}>
          Current login: <b>{coach.email || 'your account email'}</b>. For security, a confirmation link is sent to the new address — the change applies after you click it.
        </p>
        <form onSubmit={changeEmail}>
          <div className="field">
            <label>New email address</label>
            <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new-email@example.com" />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={savingCreds}>
            {savingCreds ? 'Working…' : 'Send confirmation link'}
          </button>
        </form>
      </div>

      <div className="widget">
        <h4><span style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}><ShieldCheck size={18} /> Live Sessions</span></h4>
        <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginBottom: '1.2rem', lineHeight: 1.5 }}>
          Your live sessions are powered by VideoSDK. Rooms are generated automatically when a student books you,
          and open 5 minutes before the scheduled time — join from My Sessions.
        </p>
        <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '1rem', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 8px rgba(34,197,94,0.5)' }}></div>
          <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#22C55E' }}>Live video service is connected and active.</span>
        </div>
      </div>
    </>
  );
}

export default function CoachSettingsPage() {
  return <CoachShell>{(coach) => <SettingsInner coach={coach} />}</CoachShell>;
}

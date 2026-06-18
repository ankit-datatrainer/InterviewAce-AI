'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/Toast';
import { User, Lock, Palette, Trash2, Download, Shield } from 'lucide-react';
import { getInterviews, clearInterviews } from '@/lib/interview-store';
import { getResumes, clearResumes } from '@/lib/resume-store';
import { getBookings, clearBookings } from '@/lib/booking-store';

function downloadFile(content: string, filename: string, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SettingsPage() {
  const { toast } = useToast();

  // Profile state
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Preferences state
  const [darkMode, setDarkMode] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  // Danger zone state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmDeleteRecordings, setConfirmDeleteRecordings] = useState(false);
  const [confirmDeleteResumes, setConfirmDeleteResumes] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || '');
        setFullName(user.user_metadata?.full_name || '');
        setPhone(user.user_metadata?.phone || '');
        setEmailNotifications(user.user_metadata?.email_notifications !== false);
      }
    }

    // Load theme preference
    const currentTheme = document.documentElement.getAttribute('data-theme');
    setDarkMode(currentTheme !== 'light');

    loadUser();
  }, []);

  async function handleSaveProfile() {
    setProfileLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName, phone },
      });
      if (error) {
        toast(`Error: ${error.message}`);
      } else {
        toast('Profile updated successfully');
      }
    } catch {
      toast('Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleUpdatePassword() {
    if (newPassword !== confirmPassword) {
      toast('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast('Password must be at least 6 characters');
      return;
    }
    setPasswordLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        toast(`Error: ${error.message}`);
      } else {
        toast('Password updated successfully');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      toast('Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  }

  function handleToggleTheme() {
    const next = darkMode ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    setDarkMode(!darkMode);
    toast(`Switched to ${next} mode`);
  }

  async function handleToggleEmailNotifications() {
    const next = !emailNotifications;
    setEmailNotifications(next);
    try {
      const supabase = createClient();
      await supabase.auth.updateUser({
        data: { email_notifications: next },
      });
      toast(next ? 'Email notifications enabled' : 'Email notifications disabled');
    } catch {
      toast('Failed to update notification preference');
    }
  }

  function handleDeleteAccount() {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    toast('Contact support@interviewace.ai to delete your account');
    setShowDeleteConfirm(false);
  }

  function handleDownloadData() {
    const data = {
      exportedAt: new Date().toISOString(),
      interviews: getInterviews(),
      resumes: getResumes(),
      bookings: getBookings(),
    };
    downloadFile(JSON.stringify(data, null, 2), 'interviewace-data-export.json', 'application/json');
    toast('Data exported successfully');
  }

  function handleDeleteRecordings() {
    if (!confirmDeleteRecordings) {
      setConfirmDeleteRecordings(true);
      return;
    }
    clearInterviews();
    setConfirmDeleteRecordings(false);
    toast('All interview data deleted');
  }

  function handleDeleteResumes() {
    if (!confirmDeleteResumes) {
      setConfirmDeleteResumes(true);
      return;
    }
    clearResumes();
    setConfirmDeleteResumes(false);
    toast('All resumes deleted');
  }

  return (
    <>
      <div className="app-head">
        <div>
          <h2>Settings</h2>
          <p>Manage your account, preferences, and privacy.</p>
        </div>
      </div>

      {/* Profile Section */}
      <div className="widget" style={{ marginBottom: '1rem' }}>
        <h4>
          <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <User size={18} /> Profile
          </span>
        </h4>

        <div className="field">
          <label>Email</label>
          <input type="email" value={email} readOnly style={{ opacity: 0.6, cursor: 'not-allowed' }} />
        </div>

        <div className="field">
          <label>Full name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
          />
        </div>

        <div className="field">
          <label>Phone number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter your phone number"
          />
        </div>

        <button className="btn btn-primary btn-sm" onClick={handleSaveProfile} disabled={profileLoading}>
          {profileLoading ? 'Saving...' : 'Save changes'}
        </button>
      </div>

      {/* Password Section */}
      <div className="widget" style={{ marginBottom: '1rem' }}>
        <h4>
          <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <Lock size={18} /> Password
          </span>
        </h4>

        <div className="field">
          <label>New password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
          />
        </div>

        <div className="field">
          <label>Confirm password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
          />
        </div>

        <button className="btn btn-primary btn-sm" onClick={handleUpdatePassword} disabled={passwordLoading}>
          {passwordLoading ? 'Updating...' : 'Update password'}
        </button>
      </div>

      {/* Preferences Section */}
      <div className="widget" style={{ marginBottom: '1rem' }}>
        <h4>
          <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <Palette size={18} /> Preferences
          </span>
        </h4>

        <div className="list-row">
          <div>
            <span>Theme</span>
            <div className="meta">{darkMode ? 'Dark mode' : 'Light mode'}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleToggleTheme}>
            {darkMode ? 'Switch to light' : 'Switch to dark'}
          </button>
        </div>

        <div className="list-row">
          <div>
            <span>Email notifications</span>
            <div className="meta">{emailNotifications ? 'Enabled' : 'Disabled'}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleToggleEmailNotifications}>
            {emailNotifications ? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>

      {/* Danger Zone Section */}
      <div className="widget" style={{ marginBottom: '1rem', borderColor: 'rgba(239,68,68,.3)' }}>
        <h4>
          <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem', color: '#EF4444' }}>
            <Trash2 size={18} /> Danger Zone
          </span>
        </h4>

        <div className="list-row">
          <div>
            <span>Delete my account</span>
            <div className="meta">Permanently delete your account and all associated data.</div>
          </div>
          <button
            className="btn btn-sm"
            style={{ background: 'rgba(239,68,68,.14)', color: '#EF4444', border: '1px solid rgba(239,68,68,.3)' }}
            onClick={handleDeleteAccount}
          >
            {showDeleteConfirm ? 'Confirm deletion' : 'Delete account'}
          </button>
        </div>
        {showDeleteConfirm && (
          <p style={{ fontSize: '.82rem', color: '#EF4444', marginTop: '.5rem' }}>
            Click again to confirm. You will be directed to contact support.
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginLeft: '.5rem' }}
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </button>
          </p>
        )}

        <div className="list-row">
          <div>
            <span>Download my data</span>
            <div className="meta">Export all your data as a downloadable file.</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleDownloadData}>
            <Download size={14} /> Download
          </button>
        </div>
      </div>

      {/* Data & Privacy Section */}
      <div className="widget" style={{ marginBottom: '1rem' }}>
        <h4>
          <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <Shield size={18} /> Data &amp; Privacy
          </span>
        </h4>

        <div className="list-row">
          <div>
            <span>Privacy Policy</span>
            <div className="meta">Read our privacy policy and data handling practices.</div>
          </div>
          <a href="/privacy" className="btn btn-ghost btn-sm">View</a>
        </div>

        <div className="list-row">
          <div>
            <span>Delete all interview recordings</span>
            <div className="meta">Remove all saved interview data permanently.</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            {confirmDeleteRecordings && (
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDeleteRecordings(false)}>Cancel</button>
            )}
            <button
              className="btn btn-sm"
              style={{ background: 'rgba(239,68,68,.14)', color: '#EF4444', border: '1px solid rgba(239,68,68,.3)' }}
              onClick={handleDeleteRecordings}
            >
              {confirmDeleteRecordings ? 'Confirm delete' : 'Delete recordings'}
            </button>
          </div>
        </div>

        <div className="list-row">
          <div>
            <span>Delete all resumes</span>
            <div className="meta">Remove all uploaded resume data permanently.</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            {confirmDeleteResumes && (
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDeleteResumes(false)}>Cancel</button>
            )}
            <button
              className="btn btn-sm"
              style={{ background: 'rgba(239,68,68,.14)', color: '#EF4444', border: '1px solid rgba(239,68,68,.3)' }}
              onClick={handleDeleteResumes}
            >
              {confirmDeleteResumes ? 'Confirm delete' : 'Delete resumes'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

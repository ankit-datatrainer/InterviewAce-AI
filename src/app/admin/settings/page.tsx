'use client';

import { useState } from 'react';
import { Settings, Trash2, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/Toast';

const ADMIN_KEYS = [
  'interviewace_admin_users',
  'interviewace_admin_interviews',
  'interviewace_admin_resumes',
  'interviewace_admin_coaches',
  'interviewace_admin_payments',
  'interviewace_admin_tickets',
];

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [maintenance, setMaintenance] = useState(false);
  const [signups, setSignups] = useState(true);

  const handleToggleMaintenance = () => {
    setMaintenance((v) => !v);
    toast(maintenance ? 'Maintenance mode disabled' : 'Maintenance mode enabled');
  };

  const handleToggleSignups = () => {
    setSignups((v) => !v);
    toast(signups ? 'New user signups disabled' : 'New user signups enabled');
  };

  const handleClearData = () => {
    ADMIN_KEYS.forEach((key) => localStorage.removeItem(key));
    toast('All demo data cleared');
  };

  const handleReseed = () => {
    ADMIN_KEYS.forEach((key) => localStorage.removeItem(key));
    window.location.reload();
  };

  return (
    <>
      <div className="app-head">
        <div>
          <h2>Admin Settings</h2>
          <p>Platform configuration and data management</p>
        </div>
        <span className="tag blue" style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
          <Settings size={14} /> Settings
        </span>
      </div>

      <div className="widget" style={{ marginBottom: '1rem' }}>
        <h4>Platform</h4>

        <div className="builder-sec">
          <div>
            <b>Platform name</b>
            <span style={{ color: 'var(--text-3)', fontSize: '.8rem', marginLeft: '.5rem' }}>InterviewAce AI</span>
          </div>
          <span className="tag blue">Read-only</span>
        </div>

        <div className="builder-sec">
          <div>
            <b>Support email</b>
            <span style={{ color: 'var(--text-3)', fontSize: '.8rem', marginLeft: '.5rem' }}>support@interviewace.ai</span>
          </div>
        </div>

        <div className="builder-sec">
          <div>
            <b>Maintenance mode</b>
            <span style={{ color: 'var(--text-3)', fontSize: '.8rem', marginLeft: '.5rem' }}>
              {maintenance ? 'Enabled - site is offline for users' : 'Disabled - site is live'}
            </span>
          </div>
          <button
            className={`switch${maintenance ? ' on' : ''}`}
            onClick={handleToggleMaintenance}
            aria-label="Toggle maintenance mode"
            style={{ flexShrink: 0 }}
          />
        </div>

        <div className="builder-sec">
          <div>
            <b>New user signups</b>
            <span style={{ color: 'var(--text-3)', fontSize: '.8rem', marginLeft: '.5rem' }}>
              {signups ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <button
            className={`switch${signups ? ' on' : ''}`}
            onClick={handleToggleSignups}
            aria-label="Toggle new user signups"
            style={{ flexShrink: 0 }}
          />
        </div>
      </div>

      <div className="widget">
        <h4>Data Management</h4>

        <div className="builder-sec">
          <div>
            <b>Clear all demo data</b>
            <span style={{ color: 'var(--text-3)', fontSize: '.8rem', marginLeft: '.5rem' }}>
              Removes all admin localStorage keys
            </span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleClearData} style={{ color: '#EF4444' }}>
            <Trash2 size={14} /> Clear data
          </button>
        </div>

        <div className="builder-sec">
          <div>
            <b>Re-seed demo data</b>
            <span style={{ color: 'var(--text-3)', fontSize: '.8rem', marginLeft: '.5rem' }}>
              Clears and reloads page to re-seed default data
            </span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleReseed}>
            <RefreshCw size={14} /> Re-seed
          </button>
        </div>
      </div>
    </>
  );
}

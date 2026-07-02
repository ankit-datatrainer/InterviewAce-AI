'use client';

import { User, Lock, Bell, Check } from 'lucide-react';
import { useToast } from '@/components/Toast';

export default function CoachSettingsPage() {
  const { toast } = useToast();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast('Settings saved — your profile information has been updated.');
  };

  return (
    <>
      <div className="app-head">
        <div>
          <h2>Coach Settings</h2>
          <p>Manage your profile, credentials, and notification preferences.</p>
        </div>
      </div>

      <div className="widget" style={{ marginBottom: '1rem' }}>
        <h4>
          <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <User size={18} /> Profile Information
          </span>
        </h4>
        
        <form onSubmit={handleSave}>
          <div className="field">
            <label>Full Name</label>
            <input type="text" defaultValue="Sarah Jennings" />
          </div>

          <div className="field">
            <label>Email Address</label>
            <input type="email" defaultValue="sarah.coach@interviewace.ai" readOnly style={{ opacity: 0.6, cursor: 'not-allowed' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: '0.3rem', display: 'block' }}>Email address cannot be changed. Contact admin for support.</span>
          </div>

          <div className="field">
            <label>Specialization / Role</label>
            <input type="text" defaultValue="Senior Product Manager Coach" />
          </div>

          <div className="field">
            <label>Bio</label>
            <textarea 
              rows={4} 
              defaultValue="Ex-FAANG Product Manager with 10+ years of experience. I help candidates crack product sense and execution interviews."
            />
          </div>

          <button type="submit" className="btn btn-primary btn-sm">
            Save changes
          </button>
        </form>
      </div>

      <div className="widget">
        <h4>
          <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <Lock size={18} /> 100ms Integration
          </span>
        </h4>
        
        <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginBottom: '1.2rem', lineHeight: 1.5 }}>
          Your live sessions are powered by 100ms. Rooms are automatically generated when a student books a session with you. 
          No additional configuration is required.
        </p>
        <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '1rem', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 8px rgba(34,197,94,0.5)' }}></div>
          <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#22C55E' }}>100ms Live Service is connected and active.</span>
        </div>
      </div>
    </>
  );
}

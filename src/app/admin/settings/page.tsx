'use client';

import { useState, useEffect } from 'react';
import { Settings, Trash2, RefreshCw, Save, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { getPlatformSettings, updatePlatformSettings, DEFAULT_SETTINGS, type PlatformSettings } from '@/lib/platform-settings';

const ADMIN_KEYS = [
  'interviewace_admin_users',
  'interviewace_admin_interviews',
  'interviewace_admin_resumes',
  'interviewace_admin_coaches',
  'interviewace_admin_payments',
  'interviewace_admin_tickets',
];

const INTEGRATION_LABELS: Record<string, string> = {
  supabase: 'Supabase (database & auth)',
  supabaseAdmin: 'Supabase service role',
  razorpay: 'Razorpay (payments)',
  videosdk: 'VideoSDK (live rooms)',
  heygen: 'HeyGen (AI avatar)',
  deepgram: 'Deepgram (speech)',
  nim: 'NVIDIA NIM (AI model)',
  email: 'SMTP (email)',
};

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontWeight: 600, fontSize: '.85rem', marginBottom: '.35rem' }}>{label}</label>
      {children}
      {hint && <span style={{ display: 'block', color: 'var(--text-3)', fontSize: '.76rem', marginTop: '.3rem' }}>{hint}</span>}
    </div>
  );
}

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [maintenance, setMaintenance] = useState(false);
  const [signups, setSignups] = useState(true);

  const [s, setS] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [integrations, setIntegrations] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((d) => { setMaintenance(d.maintenance); setSignups(d.signups); }).catch(() => {});
    getPlatformSettings().then(setS);
    fetch('/api/admin/integrations').then((r) => r.json()).then(setIntegrations).catch(() => setIntegrations({}));
  }, []);

  const set = <K extends keyof PlatformSettings>(k: K, v: PlatformSettings[K]) => setS((p) => ({ ...p, [k]: v }));

  const saveSettings = async () => {
    setSaving(true);
    try {
      await updatePlatformSettings(s);
      toast('Platform settings saved.');
    } catch {
      toast('Could not save — did you run deploy/phase3-update.sql?');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMaintenance = async () => {
    const v = !maintenance; setMaintenance(v);
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ maintenance: v }) });
    toast(v ? 'Maintenance mode enabled' : 'Maintenance mode disabled');
  };
  const handleToggleSignups = async () => {
    const v = !signups; setSignups(v);
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ signups: v }) });
    toast(v ? 'New user signups enabled' : 'New user signups disabled');
  };
  const handleClearData = () => { ADMIN_KEYS.forEach((k) => localStorage.removeItem(k)); toast('All demo data cleared'); };
  const handleReseed = () => { ADMIN_KEYS.forEach((k) => localStorage.removeItem(k)); window.location.reload(); };

  return (
    <>
      <div className="app-head">
        <div><h2>Platform Settings</h2><p>Branding, pricing, taxes, legal documents and integrations</p></div>
        <span className="tag blue" style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}><Settings size={14} /> Settings</span>
      </div>

      {/* ── Branding ─────────────────────────────────────────── */}
      <div className="widget" style={{ marginBottom: '1rem' }}>
        <h4>Branding</h4>
        <Field label="Platform name"><input className="input" value={s.platformName} onChange={(e) => set('platformName', e.target.value)} /></Field>
        <Field label="Support email"><input className="input" value={s.supportEmail} onChange={(e) => set('supportEmail', e.target.value)} /></Field>
        <Field label="Logo URL" hint="Shown on invoices. Paste a hosted image URL.">
          <input className="input" value={s.logoUrl ?? ''} onChange={(e) => set('logoUrl', e.target.value || null)} placeholder="https://…" />
        </Field>
      </div>

      {/* ── Pricing, tax & trial ─────────────────────────────── */}
      <div className="widget" style={{ marginBottom: '1rem' }}>
        <h4>Pricing, tax &amp; free trial</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <Field label="Currency code"><input className="input" value={s.currency} onChange={(e) => set('currency', e.target.value.toUpperCase())} placeholder="INR" /></Field>
          <Field label="Currency symbol"><input className="input" value={s.currencySymbol} onChange={(e) => set('currencySymbol', e.target.value)} placeholder="₹" /></Field>
          <Field label="Tax label"><input className="input" value={s.taxLabel} onChange={(e) => set('taxLabel', e.target.value)} placeholder="GST" /></Field>
          <Field label="Tax percent"><input className="input" type="number" value={s.taxPercent} onChange={(e) => set('taxPercent', Number(e.target.value))} /></Field>
          <Field label="Free trial (days)" hint="0 = disabled"><input className="input" type="number" value={s.freeTrialDays} onChange={(e) => set('freeTrialDays', Number(e.target.value))} /></Field>
        </div>
      </div>

      {/* ── Legal documents ──────────────────────────────────── */}
      <div className="widget" style={{ marginBottom: '1rem' }}>
        <h4>Legal documents</h4>
        <Field label="Terms of Service"><textarea className="input" rows={5} value={s.termsContent} onChange={(e) => set('termsContent', e.target.value)} placeholder="Paste your Terms of Service…" /></Field>
        <Field label="Privacy Policy"><textarea className="input" rows={5} value={s.privacyContent} onChange={(e) => set('privacyContent', e.target.value)} placeholder="Paste your Privacy Policy…" /></Field>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <button className="btn btn-primary" onClick={saveSettings} disabled={saving}>
          {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />} Save all settings
        </button>
      </div>

      {/* ── Integrations (read-only status) ──────────────────── */}
      <div className="widget" style={{ marginBottom: '1rem' }}>
        <h4>Integrations &amp; API keys</h4>
        <p style={{ color: 'var(--text-3)', fontSize: '.82rem', marginTop: '-.3rem', marginBottom: '.8rem' }}>
          Secret keys are stored securely in server environment variables, never in the database. This shows which are configured.
        </p>
        {integrations === null ? (
          <p style={{ color: 'var(--text-3)' }}>Checking…</p>
        ) : (
          <div style={{ display: 'grid', gap: '.5rem' }}>
            {Object.entries(INTEGRATION_LABELS).map(([key, label]) => {
              const ok = integrations[key];
              return (
                <div key={key} className="builder-sec" style={{ margin: 0 }}>
                  <div><b>{label}</b></div>
                  <span className={`tag ${ok ? 'green' : 'amber'}`} style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                    {ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />} {ok ? 'Configured' : 'Not set'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── System toggles ───────────────────────────────────── */}
      <div className="widget" style={{ marginBottom: '1rem' }}>
        <h4>System</h4>
        <div className="builder-sec">
          <div><b>Maintenance mode</b><span style={{ color: 'var(--text-3)', fontSize: '.8rem', marginLeft: '.5rem' }}>{maintenance ? 'Site offline for users' : 'Site live'}</span></div>
          <button className={`switch${maintenance ? ' on' : ''}`} onClick={handleToggleMaintenance} aria-label="Toggle maintenance mode" style={{ flexShrink: 0 }} />
        </div>
        <div className="builder-sec">
          <div><b>New user signups</b><span style={{ color: 'var(--text-3)', fontSize: '.8rem', marginLeft: '.5rem' }}>{signups ? 'Enabled' : 'Disabled'}</span></div>
          <button className={`switch${signups ? ' on' : ''}`} onClick={handleToggleSignups} aria-label="Toggle new user signups" style={{ flexShrink: 0 }} />
        </div>
      </div>

      <div className="widget">
        <h4>Data Management</h4>
        <div className="builder-sec">
          <div><b>Clear all demo data</b><span style={{ color: 'var(--text-3)', fontSize: '.8rem', marginLeft: '.5rem' }}>Removes admin localStorage keys</span></div>
          <button className="btn btn-ghost btn-sm" onClick={handleClearData} style={{ color: '#EF4444' }}><Trash2 size={14} /> Clear data</button>
        </div>
        <div className="builder-sec">
          <div><b>Re-seed demo data</b><span style={{ color: 'var(--text-3)', fontSize: '.8rem', marginLeft: '.5rem' }}>Clears and reloads to re-seed defaults</span></div>
          <button className="btn btn-ghost btn-sm" onClick={handleReseed}><RefreshCw size={14} /> Re-seed</button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`}</style>
    </>
  );
}

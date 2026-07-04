'use client';

import { useState, useEffect, useCallback } from 'react';
import { Percent, Plus, Trash2, Power, Star, TicketPercent } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import {
  getCoupons,
  createCoupon,
  setCouponActive,
  deleteCoupon,
  getAdminCoaches,
  updateCoachMarketplace,
  type Coupon,
  type AdminCoach,
} from '@/lib/admin-store';

export default function MarketingPage() {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [coaches, setCoaches] = useState<AdminCoach[]>([]);
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState(10);
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [dbMissing, setDbMissing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setCoupons(await getCoupons());
    } catch {
      setDbMissing(true);
    }
    setCoaches(await getAdminCoaches());
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async () => {
    if (!code.trim()) { toast('Enter a coupon code.'); return; }
    if (discount < 1 || discount > 100) { toast('Discount must be 1-100%.'); return; }
    setSaving(true);
    try {
      await createCoupon(code, discount, maxUses ? Number(maxUses) : undefined, expiresAt || undefined);
      toast(`Coupon ${code.toUpperCase()} created.`);
      setCode(''); setDiscount(10); setMaxUses(''); setExpiresAt('');
      refresh();
    } catch (e: any) {
      toast(e?.message?.includes('relation') ? 'Run deploy/marketplace-update.sql in Supabase first.' : (e?.message || 'Failed to create coupon.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c: Coupon) => {
    await setCouponActive(c.id, !c.active);
    toast(c.active ? `Coupon ${c.code} deactivated.` : `Coupon ${c.code} activated.`);
    refresh();
  };

  const handleDelete = async (c: Coupon) => {
    await deleteCoupon(c.id);
    toast(`Coupon ${c.code} deleted.`);
    refresh();
  };

  const setTier = async (coach: AdminCoach, priority: string) => {
    try {
      await updateCoachMarketplace(coach.id, { priority });
      toast(`${coach.name} → ${priority}.`);
      refresh();
    } catch (e: any) {
      toast(e?.message || 'Failed — run deploy/marketplace-update.sql first.');
    }
  };

  return (
    <>
      <div className="app-head">
        <div>
          <h2>Marketing &amp; Coupons</h2>
          <p>Discount codes and featured-coach placement for the marketplace.</p>
        </div>
      </div>

      {dbMissing && (
        <div className="widget" style={{ marginBottom: '1rem', borderColor: 'var(--amber, #F59E0B)' }}>
          <p style={{ margin: 0, fontSize: '.9rem' }}>
            ⚠ The coupons table doesn&apos;t exist yet. Run <b>deploy/marketplace-update.sql</b> in your Supabase SQL Editor, then reload this page.
          </p>
        </div>
      )}

      <div className="dash-grid-2">
        {/* Create coupon */}
        <div className="widget" style={{ alignSelf: 'start' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}><TicketPercent size={17} /> Create a coupon</h4>
          <div className="field"><label>Code</label><input className="input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="WELCOME20" /></div>
          <div className="dash-grid-2">
            <div className="field"><label>Discount (%)</label><input type="number" className="input" value={discount} min={1} max={100} onChange={(e) => setDiscount(Number(e.target.value))} /></div>
            <div className="field"><label>Max uses (blank = unlimited)</label><input type="number" className="input" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="∞" /></div>
          </div>
          <div className="field"><label>Expires on (optional)</label><input type="date" className="input" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></div>
          <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={saving}><Plus size={15} /> {saving ? 'Creating…' : 'Create coupon'}</button>
        </div>

        {/* Coupon list */}
        <div className="widget">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}><Percent size={17} /> Active coupons</h4>
          {coupons.length === 0 ? (
            <p style={{ color: 'var(--text-3)', padding: '1rem 0' }}>No coupons yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="adm">
                <thead><tr><th>Code</th><th>Discount</th><th>Used</th><th>Expires</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {coupons.map((c) => (
                    <tr key={c.id}>
                      <td><b>{c.code}</b></td>
                      <td>{c.discountPercentage}%</td>
                      <td>{c.currentUses}{c.maxUses ? ` / ${c.maxUses}` : ''}</td>
                      <td>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '—'}</td>
                      <td><span className={`tag ${c.active ? 'green' : 'red'}`}>{c.active ? 'Active' : 'Inactive'}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '.4rem' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(c)} title={c.active ? 'Deactivate' : 'Activate'}><Power size={14} /></button>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(c)} title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Featured coaches */}
      <div className="widget" style={{ marginTop: '1rem' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}><Star size={17} /> Featured placement</h4>
        <p style={{ color: 'var(--text-3)', fontSize: '.86rem', margin: '0 0 1rem' }}>
          Premium and Featured coaches appear first on the student marketplace. Full controls are in{' '}
          <Link href="/admin/coaches" style={{ color: 'var(--blue)' }}>Coach Management → Manage</Link>.
        </p>
        <div className="table-wrap">
          <table className="adm">
            <thead><tr><th>Coach</th><th>Current tier</th><th>Set tier</th></tr></thead>
            <tbody>
              {coaches.map((c) => (
                <tr key={c.id}>
                  <td><span className="mini-ava" style={{ background: c.color }}>{c.initials}</span> {c.name}</td>
                  <td><span className={`tag ${c.priority === 'Premium' ? 'green' : c.priority === 'Featured' ? 'blue' : 'amber'}`}>{c.priority}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                      {['Premium', 'Featured', 'Standard', 'New'].filter((p) => p !== c.priority).map((p) => (
                        <button key={p} className="btn btn-ghost btn-sm" onClick={() => setTier(c, p)}>{p}</button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {coaches.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '1.5rem' }}>No coaches yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

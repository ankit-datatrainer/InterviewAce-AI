'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, Star, Upload, FileText, Trash2, ShieldCheck, Loader2,
  Lock, Eye, EyeOff, Link2, MessageSquarePlus,
} from 'lucide-react';
import { useToast } from '@/components/Toast';
import {
  getAdminCoachById,
  updateAdminCoachFull,
  adminSetCoachPassword,
  linkCoachToUser,
  getCoachReviewsAdmin,
  addCoachReviewAdmin,
  editCoachReviewAdmin,
  deleteCoachReviewAdmin,
  type AdminCoachDetail,
  type AdminReviewItem,
} from '@/lib/admin-store';
import { uploadCertificate } from '@/lib/coach-store';

function PasswordField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ paddingRight: 40 }}
      />
      <button type="button" onClick={() => setShow(!show)}
        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 0, display: 'flex' }}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export default function AdminCoachEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params?.id as string;

  const [coach, setCoach] = useState<AdminCoachDetail | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable form state
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [tags, setTags] = useState('');
  const [languages, setLanguages] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [introVideoUrl, setIntroVideoUrl] = useState('');
  const [exp, setExp] = useState(0);
  const [certificates, setCertificates] = useState<string[]>([]);
  const [price, setPrice] = useState(0);
  const [commission, setCommission] = useState(20);
  const [priority, setPriority] = useState('Standard');
  const [visible, setVisible] = useState(true);
  const [verified, setVerified] = useState(false);
  const [kyc, setKyc] = useState(false);
  const [uploading, setUploading] = useState(false);
  const certRef = useRef<HTMLInputElement>(null);

  // Account
  const [linkEmail, setLinkEmail] = useState('');
  const [linking, setLinking] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [settingPassword, setSettingPassword] = useState(false);

  // Reviews
  const [reviews, setReviews] = useState<AdminReviewItem[]>([]);
  const [reviewerName, setReviewerName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [addingReview, setAddingReview] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const c = await getAdminCoachById(id);
    setCoach(c);
    if (c) {
      setName(c.name); setTitle(c.title); setBio(c.bio);
      setTags(c.tags.join(', ')); setLanguages(c.languages.join(', '));
      setImageUrl(c.imageUrl); setIntroVideoUrl(c.introVideoUrl);
      setExp(c.experienceYears); setCertificates(c.certificates);
      setPrice(c.pricePerSession); setCommission(c.commissionPct);
      setPriority(c.priority); setVisible(c.visibility);
      setVerified(c.isVerified); setKyc(c.kycVerified);
      setLinkEmail(c.email || '');
      setReviews(await getCoachReviewsAdmin(id));
    }
    setLoaded(true);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!coach) return;
    setSaving(true);
    try {
      await updateAdminCoachFull(coach.id, {
        name, title, bio,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        languages: languages.split(',').map((t) => t.trim()).filter(Boolean),
        imageUrl, introVideoUrl, experienceYears: Number(exp) || 0,
        pricePerSession: Number(price) || 0,
        commissionPct: Math.max(0, Math.min(100, Number(commission) || 0)),
        priority, visibility: visible, isVerified: verified, kycVerified: kyc,
      });
      toast('Coach profile saved — changes are live on the marketplace.');
      load();
    } catch (e: any) {
      toast(e?.message?.includes('column') ? 'Run deploy/marketplace-update.sql in Supabase first.' : (e?.message || 'Failed to save.'));
    } finally {
      setSaving(false);
    }
  };

  const handleCertUpload = async () => {
    const file = certRef.current?.files?.[0];
    if (!file || !coach) return;
    setUploading(true);
    try {
      const url = await uploadCertificate(coach.id, file);
      const next = [...certificates, url];
      setCertificates(next);
      await updateAdminCoachFull(coach.id, { certificates: next });
      toast('Certificate uploaded.');
    } catch (e: any) {
      toast(e?.message || 'Upload failed.');
    } finally {
      setUploading(false);
      if (certRef.current) certRef.current.value = '';
    }
  };

  const removeCert = async (url: string) => {
    if (!coach) return;
    const next = certificates.filter((c) => c !== url);
    setCertificates(next);
    try { await updateAdminCoachFull(coach.id, { certificates: next }); toast('Certificate removed.'); } catch { /* ignore */ }
  };

  const handleLink = async () => {
    if (!coach || !linkEmail.trim()) return;
    setLinking(true);
    const res = await linkCoachToUser(coach.id, linkEmail.trim());
    setLinking(false);
    toast(res.message);
    if (res.ok) load();
  };

  const handleSetPassword = async () => {
    if (!coach?.userId) { toast('Link this coach to a login account first.'); return; }
    if (newPassword.length < 8) { toast('Password must be at least 8 characters.'); return; }
    if (newPassword !== newPasswordConfirm) { toast('Passwords do not match.'); return; }
    setSettingPassword(true);
    const res = await adminSetCoachPassword(coach.userId, newPassword);
    setSettingPassword(false);
    toast(res.message);
    if (res.ok) { setNewPassword(''); setNewPasswordConfirm(''); }
  };

  const handleAddReview = async () => {
    if (!coach) return;
    if (!reviewerName.trim()) { toast('Enter a reviewer name.'); return; }
    setAddingReview(true);
    try {
      if (editingReviewId) {
        await editCoachReviewAdmin(editingReviewId, coach.id, reviewRating, reviewComment.trim(), reviewerName.trim());
        toast('Review updated.');
      } else {
        await addCoachReviewAdmin(coach.id, reviewRating, reviewComment.trim(), reviewerName.trim());
        toast('Review added.');
      }
      setReviewerName(''); setReviewComment(''); setReviewRating(5); setEditingReviewId(null);
      load();
    } catch (e: any) {
      toast(e?.message?.includes('column') || e?.message?.includes('null') ? 'Run deploy/admin-review-update.sql in Supabase first.' : (e?.message || 'Failed to save review.'));
    } finally {
      setAddingReview(false);
    }
  };

  const startEditReview = (r: AdminReviewItem) => {
    setEditingReviewId(r.id);
    setReviewerName(r.studentName);
    setReviewRating(r.rating);
    setReviewComment(r.comment || '');
  };

  const cancelEditReview = () => {
    setEditingReviewId(null);
    setReviewerName('');
    setReviewRating(5);
    setReviewComment('');
  };

  const handleDeleteReview = async (r: AdminReviewItem) => {
    if (!coach) return;
    if (!confirm('Are you sure you want to delete this review?')) return;
    try {
      await deleteCoachReviewAdmin(r.id, coach.id);
      toast('Review deleted.');
      if (editingReviewId === r.id) cancelEditReview();
      load();
    } catch (e: any) {
      toast(e?.message || 'Failed to delete review.');
    }
  };

  const certName = (url: string) => decodeURIComponent(url.split('/').pop() || 'certificate');

  if (!loaded) return null;
  if (!coach) {
    return (
      <div className="widget" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <p style={{ marginBottom: '1rem' }}>Coach not found.</p>
        <button className="btn btn-ghost btn-sm" onClick={() => router.push('/admin/coaches')}><ArrowLeft size={15} /> Back to Coach Management</button>
      </div>
    );
  }

  return (
    <>
      <div className="app-head">
        <div>
          <h2>Manage {coach.name}</h2>
          <p>Full profile control — everything the coach can edit, plus admin-only marketplace settings.</p>
        </div>
        <div style={{ display: 'flex', gap: '.6rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => router.push('/admin/coaches')}><ArrowLeft size={15} /> Back</button>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}><Save size={15} /> {saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </div>

      <div className="dash-grid-2">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Profile details — same fields the coach edits themselves */}
          <div className="widget">
            <h4>Profile details</h4>
            <div className="field"><label>Name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="field"><label>Headline / Title</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="field"><label>Bio</label><textarea className="input" rows={5} value={bio} onChange={(e) => setBio(e.target.value)} /></div>
            <div className="field"><label>Expertise tags (comma separated)</label><input className="input" value={tags} onChange={(e) => setTags(e.target.value)} /></div>
            <div className="field"><label>Languages (comma separated)</label><input className="input" value={languages} onChange={(e) => setLanguages(e.target.value)} /></div>
            <div className="dash-grid-2">
              <div className="field"><label>Years of experience</label><input type="number" className="input" value={exp} onChange={(e) => setExp(Number(e.target.value))} /></div>
              <div className="field"><label>Photo URL</label><input className="input" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" /></div>
            </div>
            <div className="field"><label>Introduction video URL</label><input className="input" value={introVideoUrl} onChange={(e) => setIntroVideoUrl(e.target.value)} /></div>
          </div>

          {/* Certificates */}
          <div className="widget">
            <h4>Certificates</h4>
            {certificates.length === 0 ? (
              <p style={{ color: 'var(--text-3)', fontSize: '.9rem', padding: '.5rem 0' }}>No certificates uploaded.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginBottom: '.8rem' }}>
                {certificates.map((url) => (
                  <div key={url} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: '.55rem .8rem' }}>
                    <FileText size={16} style={{ color: 'var(--blue)', flexShrink: 0 }} />
                    <a href={url} target="_blank" rel="noreferrer" style={{ flex: 1, fontSize: '.86rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{certName(url)}</a>
                    <button className="btn btn-ghost btn-sm" onClick={() => removeCert(url)}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
            <input ref={certRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" style={{ display: 'none' }} onChange={handleCertUpload} />
            <button className="btn btn-ghost btn-sm" onClick={() => certRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 size={15} className="spin" /> : <Upload size={15} />} {uploading ? 'Uploading…' : 'Upload certificate'}
            </button>
          </div>

          {/* Account & security */}
          <div className="widget">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}><Lock size={15} /> Account & security</h4>
            {coach.userId ? (
              <>
                <p style={{ color: 'var(--text-2)', fontSize: '.88rem', marginBottom: '.8rem' }}>Linked account: <b>{coach.email}</b></p>
                <div className="dash-grid-2" style={{ marginBottom: '.6rem' }}>
                  <div className="field"><label>New password</label><PasswordField value={newPassword} onChange={setNewPassword} placeholder="Min 8 characters" /></div>
                  <div className="field"><label>Confirm new password</label><PasswordField value={newPasswordConfirm} onChange={setNewPasswordConfirm} placeholder="Re-enter password" /></div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={handleSetPassword} disabled={settingPassword}>{settingPassword ? 'Updating…' : 'Set new password'}</button>
              </>
            ) : (
              <>
                <p style={{ color: 'var(--text-2)', fontSize: '.88rem', marginBottom: '.8rem' }}>This coach has no login account yet.</p>
                <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                  <input className="input" style={{ flex: 1, minWidth: 220 }} value={linkEmail} onChange={(e) => setLinkEmail(e.target.value)} placeholder="Student's registered email" />
                  <button className="btn btn-primary btn-sm" onClick={handleLink} disabled={linking}><Link2 size={14} /> {linking ? 'Linking…' : 'Link account'}</button>
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Admin-only marketplace controls */}
          <div className="widget" style={{ border: '1px solid var(--line-2, rgba(255,255,255,0.08))' }}>
            <h4>Marketplace controls (admin only)</h4>
            <div className="dash-grid-2">
              <div className="field"><label>Price per session (₹)</label><input type="number" className="input" value={price} onChange={(e) => setPrice(Number(e.target.value))} /></div>
              <div className="field"><label>Platform commission (%)</label><input type="number" className="input" value={commission} onChange={(e) => setCommission(Number(e.target.value))} /></div>
              <div className="field">
                <label>Marketplace tier</label>
                <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                  {['Premium', 'Featured', 'Standard', 'New'].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Visibility</label>
                <select className="input" value={visible ? 'visible' : 'hidden'} onChange={(e) => setVisible(e.target.value === 'visible')}>
                  <option value="visible">Visible to students</option>
                  <option value="hidden">Hidden from marketplace</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap', marginTop: '.4rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '.45rem', cursor: 'pointer', fontSize: '.9rem' }}>
                <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} /> <ShieldCheck size={15} /> Verified badge
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '.45rem', cursor: 'pointer', fontSize: '.9rem' }}>
                <input type="checkbox" checked={kyc} onChange={(e) => setKyc(e.target.checked)} /> KYC verified
              </label>
            </div>
          </div>

          {/* Live preview */}
          <div className="widget">
            <h4>Card preview</h4>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-2)', display: 'grid', placeItems: 'center', fontWeight: 700, color: 'var(--text-2)' }}>
                {imageUrl ? <img src={imageUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name.charAt(0)}
              </div>
              <div>
                <h3 style={{ margin: '0 0 .2rem', fontSize: '1.1rem' }}>{name}</h3>
                <p style={{ margin: 0, color: 'var(--text-2)', fontSize: '.88rem' }}>{title || 'Headline'}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginTop: '.3rem', color: '#F59E0B', fontWeight: 700, fontSize: '.88rem' }}>
                  <Star size={13} fill="currentColor" /> {coach.rating.toFixed(1)} <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>({coach.totalReviews} reviews)</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: '.8rem' }}>
              <b>₹{Number(price).toLocaleString()}</b>
              <span className={`tag ${priority === 'Premium' ? 'green' : priority === 'Featured' ? 'blue' : 'amber'}`}>{priority}</span>
            </div>
          </div>

          {/* Reviews */}
          <div className="widget">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}><MessageSquarePlus size={16} /> Reviews ({reviews.length})</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem', marginBottom: reviews.length ? '1rem' : 0 }}>
              {reviews.map((r) => (
                <div key={r.id} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '.6rem .8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.86rem', marginBottom: '.2rem' }}>
                    <b>{r.studentName}</b>
                    <span style={{ color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '.2rem' }}><Star size={12} fill="currentColor" /> {r.rating}</span>
                  </div>
                  {r.comment && <p style={{ margin: 0, fontSize: '.85rem', color: 'var(--text-2)' }}>{r.comment}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '.4rem' }}>
                    <span style={{ fontSize: '.74rem', color: 'var(--text-3)' }}>{r.date}</span>
                    <div style={{ display: 'flex', gap: '.4rem' }}>
                      <button className="btn btn-ghost btn-sm" style={{ padding: '0 .4rem', height: 24, fontSize: '.75rem' }} onClick={() => startEditReview(r)}>Edit</button>
                      <button className="btn btn-ghost btn-sm" style={{ padding: '0 .4rem', height: 24, color: '#ef4444' }} onClick={() => handleDeleteReview(r)} title="Delete review"><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
              <p style={{ margin: 0, fontSize: '.82rem', fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.03em' }}>
                {editingReviewId ? 'Edit Review' : 'Add a review'}
              </p>
              {editingReviewId && (
                <button className="btn btn-ghost btn-sm" style={{ padding: '0 .4rem', height: 24, fontSize: '.75rem' }} onClick={cancelEditReview}>Cancel</button>
              )}
            </div>
            <div className="dash-grid-2" style={{ marginBottom: '.5rem' }}>
              <div className="field" style={{ marginBottom: 0 }}><input className="input" placeholder="Reviewer name" value={reviewerName} onChange={(e) => setReviewerName(e.target.value)} /></div>
              <div className="field" style={{ marginBottom: 0 }}>
                <select className="input" value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))}>
                  {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
                </select>
              </div>
            </div>
            <textarea className="input" rows={2} placeholder="Review comment (optional)" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} style={{ marginBottom: '.6rem' }} />
            <button className="btn btn-primary btn-sm" onClick={handleAddReview} disabled={addingReview}>{addingReview ? 'Saving…' : (editingReviewId ? 'Save changes' : 'Add review')}</button>
          </div>
        </div>
      </div>
    </>
  );
}

'use client';

import { useState, useRef } from 'react';
import { Save, Star, Lock, Upload, FileText, Trash2, ShieldCheck, Loader2 } from 'lucide-react';
import { useToast } from '@/components/Toast';
import CoachShell from '@/components/CoachShell';
import { updateMyCoachProfile, uploadCertificate, uploadCoachImage, type CoachProfile } from '@/lib/coach-store';

function ProfileInner({ coach }: { coach: CoachProfile }) {
  const { toast } = useToast();
  const [title, setTitle] = useState(coach.title || '');
  const [bio, setBio] = useState(coach.bio || '');
  const [tags, setTags] = useState((coach.tags || []).join(', '));
  const [languages, setLanguages] = useState((coach.languages || []).join(', '));
  const [imageUrl, setImageUrl] = useState(coach.imageUrl || '');
  const [introVideoUrl, setIntroVideoUrl] = useState(coach.introVideoUrl || '');
  const [exp, setExp] = useState(coach.experienceYears ?? 0);
  const [certificates, setCertificates] = useState<string[]>(coach.certificates || []);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const certRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async () => {
    const file = photoRef.current?.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const url = await uploadCoachImage(coach.id, file);
      setImageUrl(url);
      // Persist immediately so the new photo shows on their public card at once.
      await updateMyCoachProfile(coach.id, { imageUrl: url });
      toast('Profile photo updated.');
    } catch (e: any) {
      toast(e?.message || 'Upload failed. Ask the admin to run deploy/phase6-update.sql.');
    } finally {
      setPhotoUploading(false);
      if (photoRef.current) photoRef.current.value = '';
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateMyCoachProfile(coach.id, {
        title,
        bio,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        languages: languages.split(',').map((t) => t.trim()).filter(Boolean),
        imageUrl,
        introVideoUrl,
        experienceYears: Number(exp) || 0,
        certificates,
      });
      toast('Profile updated — this is what students see on your coach card.');
    } catch {
      toast('Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleCertUpload = async () => {
    const file = certRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadCertificate(coach.id, file);
      const next = [...certificates, url];
      setCertificates(next);
      await updateMyCoachProfile(coach.id, { certificates: next });
      toast('Certificate uploaded.');
    } catch (e: any) {
      toast(e?.message || 'Upload failed. Ask the admin to run the marketplace database update.');
    } finally {
      setUploading(false);
      if (certRef.current) certRef.current.value = '';
    }
  };

  const removeCert = async (url: string) => {
    const next = certificates.filter((c) => c !== url);
    setCertificates(next);
    try { await updateMyCoachProfile(coach.id, { certificates: next }); toast('Certificate removed.'); } catch { /* ignore */ }
  };

  const certName = (url: string) => decodeURIComponent(url.split('/').pop() || 'certificate');

  return (
    <>
      <div className="app-head">
        <div><h2>My Public Profile</h2><p>This information appears on your coach card in the marketplace.</p></div>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}><Save size={15} /> {saving ? 'Saving…' : 'Save changes'}</button>
      </div>

      <div className="dash-grid-2">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="widget">
            <h4>Details</h4>
            <div className="field"><label>Name</label><input className="input" value={coach.name} readOnly style={{ opacity: 0.6 }} /></div>
            <div className="field"><label>Headline / Title</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Senior HR Manager, ex-Infosys" /></div>
            <div className="field"><label>Bio</label><textarea className="input" rows={5} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell students about your experience and how you help." /></div>
            <div className="field"><label>Expertise tags (comma separated)</label><input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="HR, Behavioral, Mock Interviews" /></div>
            <div className="field"><label>Languages (comma separated)</label><input className="input" value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="English, Hindi" /></div>
            <div className="dash-grid-2">
              <div className="field"><label>Years of experience</label><input type="number" className="input" value={exp} onChange={(e) => setExp(Number(e.target.value))} /></div>
              <div className="field">
                <label>Profile photo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-2)', display: 'grid', placeItems: 'center', border: '1px solid var(--line)', fontWeight: 700 }}>
                    {imageUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : coach.name.charAt(0)}
                  </div>
                  <input ref={photoRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handlePhotoUpload} />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => photoRef.current?.click()} disabled={photoUploading}>
                    {photoUploading ? <Loader2 size={14} className="spin" /> : <Upload size={14} />} {photoUploading ? 'Uploading…' : 'Upload photo'}
                  </button>
                </div>
                <input className="input" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="…or paste an image URL" style={{ marginTop: '.5rem' }} />
              </div>
            </div>
            <div className="field"><label>Introduction video URL (optional)</label><input className="input" value={introVideoUrl} onChange={(e) => setIntroVideoUrl(e.target.value)} placeholder="YouTube / Drive link" /></div>
          </div>

          {/* Admin-managed, read-only for coaches */}
          <div className="widget" style={{ border: '1px solid var(--line-2, rgba(255,255,255,0.08))' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}><Lock size={15} /> Set by the platform admin</h4>
            <p style={{ color: 'var(--text-3)', fontSize: '.82rem', margin: '0 0 .8rem' }}>
              These are managed by InterviewAce. Contact the admin to change them.
            </p>
            <div className="dash-grid-2">
              <div className="field"><label>Price per session</label><input className="input" value={`₹${coach.pricePerSession.toLocaleString()}`} readOnly style={{ opacity: 0.6 }} /></div>
              <div className="field"><label>Platform commission</label><input className="input" value={`${coach.commissionPct}%`} readOnly style={{ opacity: 0.6 }} /></div>
            </div>
            <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
              <span className={`tag ${coach.isVerified ? 'green' : 'amber'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem' }}>
                <ShieldCheck size={13} /> {coach.isVerified ? 'Verified coach' : 'Verification pending'}
              </span>
              <span className={`tag ${coach.kycVerified ? 'green' : 'amber'}`}>KYC: {coach.kycVerified ? 'verified' : 'pending'}</span>
              <span className="tag blue">Tier: {coach.priority}</span>
            </div>
          </div>

          {/* Certificates */}
          <div className="widget">
            <h4>Certificates</h4>
            <p style={{ color: 'var(--text-3)', fontSize: '.82rem', margin: '0 0 .8rem' }}>
              Upload your certifications as PDF or image (max 5 MB each). They appear on your public profile.
            </p>
            {certificates.length === 0 ? (
              <p style={{ color: 'var(--text-3)', fontSize: '.9rem', padding: '.5rem 0' }}>No certificates uploaded yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginBottom: '.8rem' }}>
                {certificates.map((url) => (
                  <div key={url} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: '.55rem .8rem' }}>
                    <FileText size={16} style={{ color: 'var(--blue)', flexShrink: 0 }} />
                    <a href={url} target="_blank" rel="noreferrer" style={{ flex: 1, fontSize: '.86rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {certName(url)}
                    </a>
                    <button className="btn btn-ghost btn-sm" onClick={() => removeCert(url)} title="Remove"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
            <input ref={certRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" style={{ display: 'none' }} onChange={handleCertUpload} />
            <button className="btn btn-ghost btn-sm" onClick={() => certRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 size={15} className="spin" /> : <Upload size={15} />} {uploading ? 'Uploading…' : 'Upload certificate'}
            </button>
          </div>
        </div>

        {/* Live preview of the marketplace card */}
        <div className="widget" style={{ alignSelf: 'start' }}>
          <h4>Card preview</h4>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-2)', display: 'grid', placeItems: 'center', fontWeight: 700, color: 'var(--text-2)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {imageUrl ? <img src={imageUrl} alt={coach.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : coach.name.charAt(0)}
              </div>
              <div>
                <h3 style={{ margin: '0 0 .2rem', fontSize: '1.15rem' }}>{coach.name}</h3>
                <p style={{ margin: 0, color: 'var(--text-2)', fontSize: '.9rem' }}>{title || 'Your headline'}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginTop: '.4rem', color: '#F59E0B', fontWeight: 700, fontSize: '.9rem' }}>
                  <Star size={14} fill="currentColor" /> {coach.rating?.toFixed(1) || '0.0'} <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>({coach.totalReviews} reviews)</span>
                </div>
              </div>
            </div>
            <p style={{ color: 'var(--text)', fontSize: '.92rem', marginBottom: '1rem', lineHeight: 1.5 }}>{bio || 'Your bio will appear here.'}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: '1rem' }}>
              {tags.split(',').map((t) => t.trim()).filter(Boolean).map((t) => (
                <span key={t} style={{ background: 'var(--bg-2)', color: 'var(--text-2)', padding: '.2rem .6rem', borderRadius: '1rem', fontSize: '.8rem' }}>{t}</span>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: '1rem' }}>
              <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>₹{coach.pricePerSession.toLocaleString()}</span>
              <span className="btn btn-primary btn-sm">Book Session</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function CoachProfilePage() {
  return <CoachShell>{(coach) => <ProfileInner coach={coach} />}</CoachShell>;
}

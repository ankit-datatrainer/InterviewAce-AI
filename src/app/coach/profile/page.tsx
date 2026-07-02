'use client';

import { useState } from 'react';
import { Save, Star } from 'lucide-react';
import { useToast } from '@/components/Toast';
import CoachShell from '@/components/CoachShell';
import { updateMyCoachProfile, type CoachProfile } from '@/lib/coach-store';

function ProfileInner({ coach }: { coach: CoachProfile }) {
  const { toast } = useToast();
  const [title, setTitle] = useState(coach.title || '');
  const [bio, setBio] = useState(coach.bio || '');
  const [tags, setTags] = useState((coach.tags || []).join(', '));
  const [imageUrl, setImageUrl] = useState(coach.imageUrl || '');
  const [price, setPrice] = useState(coach.pricePerSession);
  const [exp, setExp] = useState(coach.experienceYears ?? 0);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateMyCoachProfile(coach.id, {
        title,
        bio,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        imageUrl,
        pricePerSession: Number(price) || 0,
        experienceYears: Number(exp) || 0,
      });
      toast('Profile updated — this is what students see on your coach card.');
    } catch {
      toast('Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="app-head">
        <div><h2>My Public Profile</h2><p>This information appears on your coach card in the marketplace.</p></div>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}><Save size={15} /> {saving ? 'Saving…' : 'Save changes'}</button>
      </div>

      <div className="dash-grid-2">
        <div className="widget">
          <h4>Details</h4>
          <div className="field"><label>Name</label><input className="input" value={coach.name} readOnly style={{ opacity: 0.6 }} /></div>
          <div className="field"><label>Headline / Title</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Senior HR Manager, ex-Infosys" /></div>
          <div className="field"><label>Bio</label><textarea className="input" rows={5} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell students about your experience and how you help." /></div>
          <div className="field"><label>Expertise tags (comma separated)</label><input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="HR, Behavioral, Mock Interviews" /></div>
          <div className="dash-grid-2">
            <div className="field"><label>Price per session (₹)</label><input type="number" className="input" value={price} onChange={(e) => setPrice(Number(e.target.value))} /></div>
            <div className="field"><label>Years of experience</label><input type="number" className="input" value={exp} onChange={(e) => setExp(Number(e.target.value))} /></div>
          </div>
          <div className="field"><label>Photo URL</label><input className="input" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" /></div>
        </div>

        {/* Live preview of the marketplace card */}
        <div className="widget">
          <h4>Card preview</h4>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-2)', display: 'grid', placeItems: 'center', fontWeight: 700, color: 'var(--text-2)' }}>
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
              <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>₹{Number(price).toLocaleString()}</span>
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

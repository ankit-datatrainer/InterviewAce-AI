'use client';

import { useState } from 'react';
import { X, Check, Palette, ShieldCheck } from 'lucide-react';
import ResumeTemplate, { TEMPLATES, ACCENTS, PAGE_W, PAGE_H, type ResumeData } from '@/lib/resume-templates';

/**
 * A live, true-to-output thumbnail: the real template rendered at full A4 size
 * and scaled down, so the card is exactly what the user will get — no separate
 * preview images to keep in sync.
 */
function Thumb({ templateId, data, accent, width }: { templateId: string; data: ResumeData; accent: string; width: number }) {
  const scale = width / PAGE_W;
  return (
    <div style={{ width, height: PAGE_H * scale, overflow: 'hidden', position: 'relative', background: '#fff', flexShrink: 0 }}>
      <div style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
        <ResumeTemplate templateId={templateId} data={data} accent={accent} />
      </div>
    </div>
  );
}

export default function TemplateGallery({
  open, onClose, data, templateId, accent, onPick,
}: {
  open: boolean;
  onClose: () => void;
  data: ResumeData;
  templateId: string;
  accent: string;
  onPick: (templateId: string, accent: string) => void;
}) {
  // Local draft so browsing designs doesn't disturb the live preview until Apply.
  const [draftId, setDraftId] = useState(templateId);
  const [draftAccent, setDraftAccent] = useState(accent);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 10000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem', overflowY: 'auto' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="widget tg-shell"
        style={{ maxWidth: 980, width: '100%', padding: '1.5rem', position: 'relative' }}
      >
        <style>{`
          .tg-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
          @media (max-width: 900px) { .tg-grid { grid-template-columns: repeat(3, 1fr); } }
          @media (max-width: 680px) { .tg-grid { grid-template-columns: repeat(2, 1fr); } .tg-shell { padding: 1rem !important; } }
          .tg-card { cursor: pointer; border-radius: 12px; overflow: hidden; border: 2px solid var(--line); background: #fff; transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease; }
          .tg-card:hover { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(0,0,0,0.35); }
        `}</style>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '.5rem' }}><Palette size={18} /> Choose a template</h3>
            <p style={{ margin: '.25rem 0 0', color: 'var(--text-3)', fontSize: '.85rem' }}>
              Your details carry over to every design — switch any time.
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Accent colours */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-3)', marginBottom: '.5rem' }}>
            Accent colour
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
            {ACCENTS.map((c) => (
              <button
                key={c}
                onClick={() => setDraftAccent(c)}
                title={c}
                aria-label={`Accent ${c}`}
                style={{
                  width: 30, height: 30, borderRadius: '50%', background: c, cursor: 'pointer',
                  border: draftAccent === c ? '3px solid var(--text)' : '2px solid var(--line)',
                  display: 'grid', placeItems: 'center', padding: 0,
                }}
              >
                {draftAccent === c && <Check size={14} color="#fff" strokeWidth={3} />}
              </button>
            ))}
            <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginLeft: '.35rem', fontSize: '.8rem', color: 'var(--text-3)', cursor: 'pointer' }}>
              <input type="color" value={draftAccent} onChange={(e) => setDraftAccent(e.target.value)} style={{ width: 30, height: 30, padding: 0, border: '1px solid var(--line)', borderRadius: 6, background: 'none', cursor: 'pointer' }} />
              Custom
            </label>
          </div>
        </div>

        {/* Template cards */}
        <div className="tg-grid">
          {TEMPLATES.map((t) => {
            const selected = draftId === t.id;
            return (
              <div
                key={t.id}
                className="tg-card"
                onClick={() => setDraftId(t.id)}
                style={{ borderColor: selected ? draftAccent : 'var(--line)', boxShadow: selected ? `0 0 0 3px ${draftAccent}55` : undefined }}
              >
                <div style={{ position: 'relative' }}>
                  <Thumb templateId={t.id} data={data} accent={draftAccent} width={210} />
                  {selected && (
                    <div style={{ position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: '50%', background: draftAccent, display: 'grid', placeItems: 'center' }}>
                      <Check size={14} color="#fff" strokeWidth={3} />
                    </div>
                  )}
                </div>
                <div style={{ padding: '.6rem .7rem', background: 'var(--bg-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                    <strong style={{ fontSize: '.88rem' }}>{t.name}</strong>
                    {t.atsSafe && <ShieldCheck size={13} style={{ color: '#10b981' }} />}
                  </div>
                  <p style={{ margin: '.15rem 0 0', fontSize: '.74rem', color: 'var(--text-3)' }}>{t.blurb}</p>
                </div>
              </div>
            );
          })}
        </div>

        <p style={{ fontSize: '.76rem', color: 'var(--text-3)', margin: '1rem 0 0', display: 'flex', alignItems: 'center', gap: '.35rem' }}>
          <ShieldCheck size={13} style={{ color: '#10b981' }} /> Marked designs parse most reliably in applicant-tracking systems.
        </p>

        <div style={{ display: 'flex', gap: '.6rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => { onPick(draftId, draftAccent); onClose(); }}>
            Use this template
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

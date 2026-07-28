import React from 'react';

// ────────────────────────────────────────────────────────────────────────────
// Resume template library.
//
// Every template renders the SAME `ResumeData` shape, so the user can switch
// designs at any time without losing or re-entering anything. Each one takes an
// `accent` colour so a single layout yields many looks (Canva-style).
//
// Print note: browsers strip background colours by default when printing, which
// would gut the colourful templates. `PRINT_EXACT` opts every coloured surface
// back in, so what you see in the preview is what lands in the PDF.
// ────────────────────────────────────────────────────────────────────────────

export interface ResumeExperience { id: number; company: string; role: string; date: string; desc: string }
export interface ResumeEducation { id: number; school: string; degree: string; date: string }

export interface ResumeData {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  summary: string;
  experience: ResumeExperience[];
  education: ResumeEducation[];
  skills: string;
}

export const PRINT_EXACT: React.CSSProperties = {
  WebkitPrintColorAdjust: 'exact',
  printColorAdjust: 'exact',
} as React.CSSProperties;

/** A4 at 96dpi. Every template renders at exactly this size. */
export const PAGE_W = 794;
export const PAGE_H = 1123;

const page = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: '#fff',
  color: '#1f2937',
  width: '100%',
  maxWidth: `${PAGE_W}px`,
  minHeight: `${PAGE_H}px`,
  margin: '0 auto',
  fontFamily: '"Inter", system-ui, sans-serif',
  lineHeight: 1.6,
  ...PRINT_EXACT,
  ...extra,
});

/** Splits a description into bullet lines (blank lines ignored). */
function bullets(desc: string): string[] {
  return (desc || '').split(/\r?\n/).map((l) => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
}

/** Splits the comma/newline separated skills field into individual skills. */
function skillList(skills: string): string[] {
  return (skills || '').split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
}

function contactItems(d: ResumeData): string[] {
  return [d.email, d.phone, d.location, d.linkedin.replace(/^https?:\/\//, '')].filter(Boolean);
}

// ═══════════════════════ 1. Classic — ATS-safe, timeless ═══════════════════
function Classic({ data, accent }: { data: ResumeData; accent: string }) {
  const H = ({ children }: { children: React.ReactNode }) => (
    <h2 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: '#111827', borderBottom: `2px solid ${accent}`, paddingBottom: 5, marginBottom: 12, letterSpacing: 1.2, ...PRINT_EXACT }}>{children}</h2>
  );
  return (
    <div style={page({ padding: '50px 60px' })}>
      <div style={{ marginBottom: 26, borderBottom: `3px solid ${accent}`, paddingBottom: 18, ...PRINT_EXACT }}>
        <h1 style={{ fontSize: 34, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 4px', color: '#111827' }}>{data.name || 'Your Name'}</h1>
        <h2 style={{ fontSize: 17, fontWeight: 500, margin: '0 0 12px', color: accent, ...PRINT_EXACT }}>{data.title || 'Target Job Title'}</h2>
        <div style={{ fontSize: 12.5, color: '#4b5563', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {contactItems(data).map((c) => <span key={c}>{c}</span>)}
        </div>
      </div>
      {data.summary && (<div style={{ marginBottom: 22 }}><H>Professional Summary</H><p style={{ fontSize: 13.5, color: '#374151', margin: 0, textAlign: 'justify' }}>{data.summary}</p></div>)}
      {data.experience.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <H>Professional Experience</H>
          {data.experience.map((e) => (
            <div key={e.id} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h3 style={{ fontSize: 14.5, margin: 0, fontWeight: 700, color: '#111827' }}>{e.role}</h3>
                <span style={{ fontSize: 12.5, color: '#6b7280' }}>{e.date}</span>
              </div>
              <div style={{ fontSize: 13.5, color: accent, fontWeight: 600, marginBottom: 6, ...PRINT_EXACT }}>{e.company}</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.8, color: '#374151' }}>
                {bullets(e.desc).map((b, i) => <li key={i} style={{ marginBottom: 3 }}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
      {data.education.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <H>Education</H>
          {data.education.map((e) => (
            <div key={e.id} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h3 style={{ fontSize: 14, margin: 0, fontWeight: 700, color: '#111827' }}>{e.school}</h3>
                <span style={{ fontSize: 12.5, color: '#6b7280' }}>{e.date}</span>
              </div>
              <p style={{ fontSize: 13, color: '#4b5563', margin: '2px 0 0' }}>{e.degree}</p>
            </div>
          ))}
        </div>
      )}
      {data.skills && (<div><H>Skills &amp; Technologies</H><p style={{ fontSize: 13, color: '#374151', margin: 0 }}>{data.skills}</p></div>)}
    </div>
  );
}

// ═══════════════════════ 2. Sidebar — bold coloured rail ═══════════════════
function Sidebar({ data, accent }: { data: ResumeData; accent: string }) {
  const SH = ({ children }: { children: React.ReactNode }) => (
    <h2 style={{ fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.4, color: 'rgba(255,255,255,0.75)', margin: '0 0 8px', ...PRINT_EXACT }}>{children}</h2>
  );
  const MH = ({ children }: { children: React.ReactNode }) => (
    <h2 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, color: accent, margin: '0 0 10px', ...PRINT_EXACT }}>{children}</h2>
  );
  return (
    <div style={page({ display: 'flex', padding: 0 })}>
      <aside style={{ width: '34%', background: accent, color: '#fff', padding: '38px 24px', ...PRINT_EXACT }}>
        <div style={{ width: 78, height: 78, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 800, marginBottom: 16, ...PRINT_EXACT }}>
          {(data.name || 'Y').charAt(0).toUpperCase()}
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px', lineHeight: 1.2 }}>{data.name || 'Your Name'}</h1>
        <p style={{ fontSize: 13, margin: '0 0 26px', color: 'rgba(255,255,255,0.85)' }}>{data.title}</p>
        <div style={{ marginBottom: 24 }}>
          <SH>Contact</SH>
          {contactItems(data).map((c) => (
            <p key={c} style={{ fontSize: 11.5, margin: '0 0 6px', wordBreak: 'break-word', color: 'rgba(255,255,255,0.95)' }}>{c}</p>
          ))}
        </div>
        {data.skills && (
          <div style={{ marginBottom: 24 }}>
            <SH>Skills</SH>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {skillList(data.skills).map((s) => (
                <span key={s} style={{ fontSize: 10.5, background: 'rgba(255,255,255,0.18)', padding: '3px 8px', borderRadius: 20, ...PRINT_EXACT }}>{s}</span>
              ))}
            </div>
          </div>
        )}
        {data.education.length > 0 && (
          <div>
            <SH>Education</SH>
            {data.education.map((e) => (
              <div key={e.id} style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 12.5, fontWeight: 700, margin: 0 }}>{e.school}</p>
                <p style={{ fontSize: 11.5, margin: '2px 0 0', color: 'rgba(255,255,255,0.85)' }}>{e.degree}</p>
                <p style={{ fontSize: 10.5, margin: '2px 0 0', color: 'rgba(255,255,255,0.7)' }}>{e.date}</p>
              </div>
            ))}
          </div>
        )}
      </aside>
      <main style={{ flex: 1, padding: '38px 32px' }}>
        {data.summary && (<div style={{ marginBottom: 24 }}><MH>Profile</MH><p style={{ fontSize: 13, color: '#374151', margin: 0, textAlign: 'justify' }}>{data.summary}</p></div>)}
        {data.experience.length > 0 && (
          <div>
            <MH>Experience</MH>
            {data.experience.map((e) => (
              <div key={e.id} style={{ marginBottom: 18 }}>
                <h3 style={{ fontSize: 14.5, margin: 0, fontWeight: 700, color: '#111827' }}>{e.role}</h3>
                <div style={{ fontSize: 12.5, color: '#6b7280', marginBottom: 6 }}>{e.company}{e.company && e.date ? ' · ' : ''}{e.date}</div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, color: '#374151' }}>
                  {bullets(e.desc).map((b, i) => <li key={i} style={{ marginBottom: 3 }}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ═══════════════════════ 3. Gradient — vivid header band ═══════════════════
function Gradient({ data, accent }: { data: ResumeData; accent: string }) {
  const H = ({ children }: { children: React.ReactNode }) => (
    <h2 style={{ fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.3, color: accent, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 8, ...PRINT_EXACT }}>
      {children}<span style={{ flex: 1, height: 2, background: `linear-gradient(90deg, ${accent}, transparent)`, ...PRINT_EXACT }} />
    </h2>
  );
  return (
    <div style={page({ padding: 0 })}>
      <div style={{ background: `linear-gradient(135deg, ${accent} 0%, ${shade(accent, -35)} 100%)`, color: '#fff', padding: '44px 55px 36px', ...PRINT_EXACT }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 6px', letterSpacing: -0.5 }}>{data.name || 'Your Name'}</h1>
        <h2 style={{ fontSize: 16, fontWeight: 500, margin: '0 0 16px', color: 'rgba(255,255,255,0.9)' }}>{data.title}</h2>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'rgba(255,255,255,0.95)' }}>
          {contactItems(data).map((c) => <span key={c}>{c}</span>)}
        </div>
      </div>
      <div style={{ padding: '32px 55px 50px' }}>
        {data.summary && (<div style={{ marginBottom: 24 }}><H>About</H><p style={{ fontSize: 13, color: '#374151', margin: 0, textAlign: 'justify' }}>{data.summary}</p></div>)}
        {data.experience.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <H>Experience</H>
            {data.experience.map((e) => (
              <div key={e.id} style={{ marginBottom: 16, background: '#f9fafb', borderLeft: `4px solid ${accent}`, borderRadius: '0 8px 8px 0', padding: '12px 16px', ...PRINT_EXACT }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: 14.5, margin: 0, fontWeight: 700, color: '#111827' }}>{e.role}</h3>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{e.date}</span>
                </div>
                <div style={{ fontSize: 13, color: accent, fontWeight: 600, marginBottom: 5, ...PRINT_EXACT }}>{e.company}</div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, color: '#374151' }}>
                  {bullets(e.desc).map((b, i) => <li key={i} style={{ marginBottom: 2 }}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
        {data.education.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <H>Education</H>
            {data.education.map((e) => (
              <div key={e.id} style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <h3 style={{ fontSize: 14, margin: 0, fontWeight: 700, color: '#111827' }}>{e.school}</h3>
                  <p style={{ fontSize: 12.5, color: '#4b5563', margin: '2px 0 0' }}>{e.degree}</p>
                </div>
                <span style={{ fontSize: 12, color: '#6b7280' }}>{e.date}</span>
              </div>
            ))}
          </div>
        )}
        {data.skills && (
          <div>
            <H>Skills</H>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {skillList(data.skills).map((s) => (
                <span key={s} style={{ fontSize: 11.5, background: hexA(accent, 0.12), color: shade(accent, -30), padding: '4px 11px', borderRadius: 20, fontWeight: 600, ...PRINT_EXACT }}>{s}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════ 4. Elegant — refined serif ════════════════════════
function Elegant({ data, accent }: { data: ResumeData; accent: string }) {
  const H = ({ children }: { children: React.ReactNode }) => (
    <h2 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2.5, color: accent, textAlign: 'center', margin: '0 0 14px', ...PRINT_EXACT }}>{children}</h2>
  );
  return (
    <div style={page({ padding: '55px 65px', fontFamily: 'Georgia, "Times New Roman", serif' })}>
      <div style={{ textAlign: 'center', marginBottom: 30 }}>
        <h1 style={{ fontSize: 38, fontWeight: 400, letterSpacing: 3, margin: '0 0 8px', color: '#111827' }}>{(data.name || 'Your Name').toUpperCase()}</h1>
        <div style={{ height: 1, background: accent, width: 90, margin: '0 auto 10px', ...PRINT_EXACT }} />
        <p style={{ fontSize: 15, fontStyle: 'italic', color: accent, margin: '0 0 12px', ...PRINT_EXACT }}>{data.title}</p>
        <div style={{ fontSize: 11.5, color: '#4b5563', display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {contactItems(data).map((c) => <span key={c}>{c}</span>)}
        </div>
      </div>
      {data.summary && (<div style={{ marginBottom: 26 }}><H>Profile</H><p style={{ fontSize: 13.5, color: '#374151', margin: 0, textAlign: 'center', fontStyle: 'italic', lineHeight: 1.8 }}>{data.summary}</p></div>)}
      {data.experience.length > 0 && (
        <div style={{ marginBottom: 26 }}>
          <H>Experience</H>
          {data.experience.map((e) => (
            <div key={e.id} style={{ marginBottom: 18, textAlign: 'center' }}>
              <h3 style={{ fontSize: 15, margin: 0, fontWeight: 700, color: '#111827' }}>{e.role}</h3>
              <div style={{ fontSize: 13, color: accent, margin: '2px 0 4px', ...PRINT_EXACT }}>{e.company} · <span style={{ color: '#6b7280' }}>{e.date}</span></div>
              <ul style={{ margin: '0 auto', paddingLeft: 18, fontSize: 12.8, color: '#374151', textAlign: 'left', maxWidth: 560 }}>
                {bullets(e.desc).map((b, i) => <li key={i} style={{ marginBottom: 3 }}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
      {data.education.length > 0 && (
        <div style={{ marginBottom: 26 }}>
          <H>Education</H>
          {data.education.map((e) => (
            <div key={e.id} style={{ marginBottom: 10, textAlign: 'center' }}>
              <h3 style={{ fontSize: 14, margin: 0, fontWeight: 700, color: '#111827' }}>{e.school}</h3>
              <p style={{ fontSize: 12.5, color: '#4b5563', margin: '2px 0 0' }}>{e.degree} · {e.date}</p>
            </div>
          ))}
        </div>
      )}
      {data.skills && (<div><H>Expertise</H><p style={{ fontSize: 13, color: '#374151', margin: 0, textAlign: 'center' }}>{skillList(data.skills).join('  ·  ')}</p></div>)}
    </div>
  );
}

// ═══════════════════════ 5. Bold — big colour block ════════════════════════
function Bold({ data, accent }: { data: ResumeData; accent: string }) {
  const H = ({ children }: { children: React.ReactNode }) => (
    <h2 style={{ fontSize: 12.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1.5, color: '#111827', margin: '0 0 12px', paddingLeft: 12, borderLeft: `5px solid ${accent}`, ...PRINT_EXACT }}>{children}</h2>
  );
  return (
    <div style={page({ padding: 0 })}>
      <div style={{ background: accent, padding: '40px 55px', ...PRINT_EXACT }}>
        <h1 style={{ fontSize: 42, fontWeight: 900, margin: 0, color: '#fff', lineHeight: 1.05, letterSpacing: -1 }}>{data.name || 'Your Name'}</h1>
        <h2 style={{ fontSize: 17, fontWeight: 600, margin: '6px 0 0', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: 2 }}>{data.title}</h2>
      </div>
      <div style={{ background: '#111827', padding: '12px 55px', display: 'flex', gap: 18, flexWrap: 'wrap', ...PRINT_EXACT }}>
        {contactItems(data).map((c) => <span key={c} style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.9)' }}>{c}</span>)}
      </div>
      <div style={{ padding: '30px 55px 50px' }}>
        {data.summary && (<div style={{ marginBottom: 24 }}><H>Summary</H><p style={{ fontSize: 13, color: '#374151', margin: 0, textAlign: 'justify' }}>{data.summary}</p></div>)}
        {data.experience.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <H>Experience</H>
            {data.experience.map((e) => (
              <div key={e.id} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: 15, margin: 0, fontWeight: 800, color: '#111827' }}>{e.role}</h3>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: '#fff', background: accent, padding: '2px 9px', borderRadius: 4, ...PRINT_EXACT }}>{e.date}</span>
                </div>
                <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 600, marginBottom: 5 }}>{e.company}</div>
                <ul style={{ margin: 0, paddingLeft: 17, fontSize: 12.5, color: '#374151' }}>
                  {bullets(e.desc).map((b, i) => <li key={i} style={{ marginBottom: 3 }}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
        {data.education.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <H>Education</H>
            {data.education.map((e) => (
              <div key={e.id} style={{ marginBottom: 10 }}>
                <h3 style={{ fontSize: 14, margin: 0, fontWeight: 800, color: '#111827' }}>{e.school}</h3>
                <p style={{ fontSize: 12.5, color: '#4b5563', margin: '2px 0 0' }}>{e.degree} · {e.date}</p>
              </div>
            ))}
          </div>
        )}
        {data.skills && (
          <div>
            <H>Skills</H>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {skillList(data.skills).map((s) => (
                <span key={s} style={{ fontSize: 11.5, background: '#111827', color: '#fff', padding: '4px 11px', borderRadius: 3, fontWeight: 600, ...PRINT_EXACT }}>{s}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════ 6. Minimal — maximum ATS safety ═══════════════════
function Minimal({ data, accent }: { data: ResumeData; accent: string }) {
  const H = ({ children }: { children: React.ReactNode }) => (
    <h2 style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: '#6b7280', margin: '0 0 10px' }}>{children}</h2>
  );
  return (
    <div style={page({ padding: '60px 70px' })}>
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, margin: '0 0 3px', color: '#111827', letterSpacing: -0.3 }}>{data.name || 'Your Name'}</h1>
        <p style={{ fontSize: 14.5, color: '#4b5563', margin: '0 0 10px' }}>{data.title}</p>
        <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {contactItems(data).map((c, i) => (
            <span key={c}>{i > 0 && <span style={{ marginRight: 10, color: accent, ...PRINT_EXACT }}>·</span>}{c}</span>
          ))}
        </div>
      </div>
      {data.summary && (<div style={{ marginBottom: 24 }}><H>Summary</H><p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.75 }}>{data.summary}</p></div>)}
      {data.experience.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <H>Experience</H>
          {data.experience.map((e) => (
            <div key={e.id} style={{ marginBottom: 17 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h3 style={{ fontSize: 14, margin: 0, fontWeight: 600, color: '#111827' }}>{e.role} <span style={{ color: '#9ca3af', fontWeight: 400 }}>at</span> {e.company}</h3>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>{e.date}</span>
              </div>
              <ul style={{ margin: '5px 0 0', paddingLeft: 16, fontSize: 12.5, color: '#4b5563' }}>
                {bullets(e.desc).map((b, i) => <li key={i} style={{ marginBottom: 3 }}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
      {data.education.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <H>Education</H>
          {data.education.map((e) => (
            <div key={e.id} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 13, color: '#111827' }}><strong style={{ fontWeight: 600 }}>{e.school}</strong> — {e.degree}</span>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>{e.date}</span>
            </div>
          ))}
        </div>
      )}
      {data.skills && (<div><H>Skills</H><p style={{ fontSize: 12.8, color: '#4b5563', margin: 0 }}>{data.skills}</p></div>)}
    </div>
  );
}

// ═══════════════════════ 7. Timeline — visual career path ══════════════════
function Timeline({ data, accent }: { data: ResumeData; accent: string }) {
  const H = ({ children }: { children: React.ReactNode }) => (
    <h2 style={{ fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.4, color: accent, margin: '0 0 14px', ...PRINT_EXACT }}>{children}</h2>
  );
  return (
    <div style={page({ padding: '45px 55px' })}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ width: 68, height: 68, borderRadius: 14, background: `linear-gradient(135deg, ${accent}, ${shade(accent, -35)})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, flexShrink: 0, ...PRINT_EXACT }}>
          {(data.name || 'Y').charAt(0).toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 29, fontWeight: 800, margin: '0 0 2px', color: '#111827' }}>{data.name || 'Your Name'}</h1>
          <p style={{ fontSize: 14.5, color: accent, fontWeight: 600, margin: '0 0 6px', ...PRINT_EXACT }}>{data.title}</p>
          <div style={{ fontSize: 11.5, color: '#6b7280', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {contactItems(data).map((c) => <span key={c}>{c}</span>)}
          </div>
        </div>
      </div>
      {data.summary && (<div style={{ marginBottom: 24 }}><H>About Me</H><p style={{ fontSize: 13, color: '#374151', margin: 0, textAlign: 'justify' }}>{data.summary}</p></div>)}
      {data.experience.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <H>Career Timeline</H>
          <div style={{ position: 'relative', paddingLeft: 22 }}>
            <div style={{ position: 'absolute', left: 5, top: 4, bottom: 4, width: 2, background: hexA(accent, 0.25), ...PRINT_EXACT }} />
            {data.experience.map((e) => (
              <div key={e.id} style={{ position: 'relative', marginBottom: 18 }}>
                <div style={{ position: 'absolute', left: -22, top: 4, width: 12, height: 12, borderRadius: '50%', background: accent, border: '2px solid #fff', boxShadow: `0 0 0 2px ${hexA(accent, 0.3)}`, ...PRINT_EXACT }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: 14.5, margin: 0, fontWeight: 700, color: '#111827' }}>{e.role}</h3>
                  <span style={{ fontSize: 11.5, color: accent, fontWeight: 600, ...PRINT_EXACT }}>{e.date}</span>
                </div>
                <div style={{ fontSize: 12.5, color: '#6b7280', marginBottom: 5 }}>{e.company}</div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, color: '#374151' }}>
                  {bullets(e.desc).map((b, i) => <li key={i} style={{ marginBottom: 3 }}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap' }}>
        {data.education.length > 0 && (
          <div style={{ flex: '1 1 45%', minWidth: 200 }}>
            <H>Education</H>
            {data.education.map((e) => (
              <div key={e.id} style={{ marginBottom: 10 }}>
                <h3 style={{ fontSize: 13.5, margin: 0, fontWeight: 700, color: '#111827' }}>{e.school}</h3>
                <p style={{ fontSize: 12, color: '#4b5563', margin: '2px 0 0' }}>{e.degree}</p>
                <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '1px 0 0' }}>{e.date}</p>
              </div>
            ))}
          </div>
        )}
        {data.skills && (
          <div style={{ flex: '1 1 45%', minWidth: 200 }}>
            <H>Skills</H>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {skillList(data.skills).map((s) => (
                <span key={s} style={{ fontSize: 11, background: hexA(accent, 0.1), color: shade(accent, -30), padding: '3px 9px', borderRadius: 6, fontWeight: 600, ...PRINT_EXACT }}>{s}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════ 8. Executive — dark, authoritative ════════════════
function Executive({ data, accent }: { data: ResumeData; accent: string }) {
  const H = ({ children }: { children: React.ReactNode }) => (
    <h2 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.6, color: '#111827', margin: '0 0 12px', paddingBottom: 5, borderBottom: '2px solid #111827' }}>{children}</h2>
  );
  return (
    <div style={page({ padding: 0 })}>
      <div style={{ background: '#111827', padding: '42px 55px 32px', borderBottom: `5px solid ${accent}`, ...PRINT_EXACT }}>
        <h1 style={{ fontSize: 34, fontWeight: 800, margin: '0 0 5px', color: '#fff', letterSpacing: 0.5 }}>{data.name || 'Your Name'}</h1>
        <h2 style={{ fontSize: 15, fontWeight: 500, margin: '0 0 14px', color: accent, textTransform: 'uppercase', letterSpacing: 2.5, ...PRINT_EXACT }}>{data.title}</h2>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11.5, color: 'rgba(255,255,255,0.75)' }}>
          {contactItems(data).map((c) => <span key={c}>{c}</span>)}
        </div>
      </div>
      <div style={{ padding: '30px 55px 50px' }}>
        {data.summary && (<div style={{ marginBottom: 24 }}><H>Executive Summary</H><p style={{ fontSize: 13, color: '#374151', margin: 0, textAlign: 'justify' }}>{data.summary}</p></div>)}
        {data.experience.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <H>Professional Experience</H>
            {data.experience.map((e) => (
              <div key={e.id} style={{ marginBottom: 17 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: 14.5, margin: 0, fontWeight: 700, color: '#111827' }}>{e.role}</h3>
                  <span style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>{e.date}</span>
                </div>
                <div style={{ fontSize: 13, color: accent, fontWeight: 700, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5, ...PRINT_EXACT }}>{e.company}</div>
                <ul style={{ margin: 0, paddingLeft: 17, fontSize: 12.5, color: '#374151' }}>
                  {bullets(e.desc).map((b, i) => <li key={i} style={{ marginBottom: 3 }}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
        {data.education.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <H>Education</H>
            {data.education.map((e) => (
              <div key={e.id} style={{ marginBottom: 9, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <h3 style={{ fontSize: 13.5, margin: 0, fontWeight: 700, color: '#111827' }}>{e.school}</h3>
                  <p style={{ fontSize: 12.5, color: '#4b5563', margin: '2px 0 0' }}>{e.degree}</p>
                </div>
                <span style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>{e.date}</span>
              </div>
            ))}
          </div>
        )}
        {data.skills && (
          <div>
            <H>Core Competencies</H>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px 14px' }}>
              {skillList(data.skills).map((s) => (
                <span key={s} style={{ fontSize: 12, color: '#374151' }}>
                  <span style={{ color: accent, fontWeight: 800, marginRight: 6, ...PRINT_EXACT }}>▪</span>{s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── colour helpers ─────────────────────────
/** Lightens (positive) or darkens (negative) a #rrggbb hex by `amt` (0-255). */
export function shade(hex: string, amt: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(((n >> 16) & 0xff) + amt);
  const g = clamp(((n >> 8) & 0xff) + amt);
  const b = clamp((n & 0xff) + amt);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** #rrggbb → rgba(...) with the given alpha. */
export function hexA(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 0xff}, ${(n >> 8) & 0xff}, ${n & 0xff}, ${alpha})`;
}

// ───────────────────────── registry ─────────────────────────
export interface TemplateDef {
  id: string;
  name: string;
  blurb: string;
  /** True for layouts that parse cleanly in applicant-tracking systems. */
  atsSafe: boolean;
  defaultAccent: string;
  Render: React.FC<{ data: ResumeData; accent: string }>;
}

export const TEMPLATES: TemplateDef[] = [
  { id: 'classic', name: 'Classic', blurb: 'Timeless and recruiter-friendly', atsSafe: true, defaultAccent: '#2563eb', Render: Classic },
  { id: 'sidebar', name: 'Sidebar', blurb: 'Bold colour rail with skills', atsSafe: false, defaultAccent: '#0f766e', Render: Sidebar },
  { id: 'gradient', name: 'Gradient', blurb: 'Vivid header, modern cards', atsSafe: false, defaultAccent: '#7c3aed', Render: Gradient },
  { id: 'elegant', name: 'Elegant', blurb: 'Refined serif, centred', atsSafe: true, defaultAccent: '#b45309', Render: Elegant },
  { id: 'bold', name: 'Bold', blurb: 'Big colour block statement', atsSafe: false, defaultAccent: '#dc2626', Render: Bold },
  { id: 'minimal', name: 'Minimal', blurb: 'Clean, maximum ATS safety', atsSafe: true, defaultAccent: '#0891b2', Render: Minimal },
  { id: 'timeline', name: 'Timeline', blurb: 'Visual career progression', atsSafe: false, defaultAccent: '#db2777', Render: Timeline },
  { id: 'executive', name: 'Executive', blurb: 'Dark, authoritative header', atsSafe: false, defaultAccent: '#f59e0b', Render: Executive },
];

/** Curated accents that stay legible on white in every template. */
export const ACCENTS = [
  '#2563eb', '#0f766e', '#7c3aed', '#db2777',
  '#dc2626', '#ea580c', '#f59e0b', '#0891b2',
  '#4338ca', '#15803d', '#be123c', '#334155',
];

export function getTemplate(id: string): TemplateDef {
  return TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
}

/** Renders the chosen template. */
export default function ResumeTemplate({ templateId, data, accent }: { templateId: string; data: ResumeData; accent: string }) {
  const { Render } = getTemplate(templateId);
  return <Render data={data} accent={accent} />;
}

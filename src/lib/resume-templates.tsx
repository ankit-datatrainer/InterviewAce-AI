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
export interface ResumeProject { id: number; name: string; date: string; desc: string; technologies: string }

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
  projects?: ResumeProject[];
  achievements?: string[];
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
      {(data.projects?.length || 0) > 0 && (
        <div style={{ marginBottom: 22 }}>
          <H>Projects</H>
          {data.projects?.map((project) => (
            <div key={project.id} style={{ marginBottom: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h3 style={{ fontSize: 14, margin: 0, fontWeight: 700, color: '#111827' }}>{project.name}</h3>
                <span style={{ fontSize: 12, color: '#6b7280' }}>{project.date}</span>
              </div>
              {project.desc && <p style={{ fontSize: 12.8, color: '#374151', margin: '4px 0' }}>{project.desc}</p>}
              {project.technologies && <p style={{ fontSize: 12.2, color: accent, margin: 0, ...PRINT_EXACT }}>Technologies: {project.technologies}</p>}
            </div>
          ))}
        </div>
      )}
      {(data.achievements?.length || 0) > 0 && (
        <div style={{ marginBottom: 22 }}>
          <H>Achievements</H>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.8, color: '#374151' }}>
            {data.achievements?.map((achievement, index) => <li key={`${achievement}-${index}`}>{achievement}</li>)}
          </ul>
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

// ═══════════════════════ 9. Compact — balanced two-column ══════════════════
function TwoColumn({ data, accent }: { data: ResumeData; accent: string }) {
  const MH = ({ children }: { children: React.ReactNode }) => (
    <h2 style={{ fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.3, color: '#111827', margin: '0 0 10px', paddingBottom: 4, borderBottom: `2px solid ${accent}`, ...PRINT_EXACT }}>{children}</h2>
  );
  const RH = ({ children }: { children: React.ReactNode }) => (
    <h2 style={{ fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, color: accent, margin: '0 0 8px', paddingBottom: 3, borderBottom: `1px solid ${hexA(accent, 0.35)}`, ...PRINT_EXACT }}>{children}</h2>
  );
  return (
    <div style={page({ padding: '44px 50px' })}>
      <div style={{ marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid #e5e7eb' }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: '0 0 3px', color: '#111827', letterSpacing: -0.3 }}>{data.name || 'Your Name'}</h1>
        <p style={{ fontSize: 14, fontWeight: 600, color: accent, margin: 0, ...PRINT_EXACT }}>{data.title}</p>
      </div>
      <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 0', minWidth: 0 }}>
          {data.summary && (
            <div style={{ marginBottom: 20 }}>
              <MH>Summary</MH>
              <p style={{ fontSize: 12.5, color: '#374151', margin: 0, textAlign: 'justify' }}>{data.summary}</p>
            </div>
          )}
          {data.experience.length > 0 && (
            <div>
              <MH>Experience</MH>
              {data.experience.map((e) => (
                <div key={e.id} style={{ marginBottom: 15 }}>
                  <h3 style={{ fontSize: 13.8, margin: 0, fontWeight: 700, color: '#111827' }}>{e.role}</h3>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 5 }}>
                    {e.company}{e.company && e.date ? ' · ' : ''}{e.date}
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 15, fontSize: 12.2, color: '#374151' }}>
                    {bullets(e.desc).map((b, i) => <li key={i} style={{ marginBottom: 3 }}>{b}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
        <aside style={{ width: 218, flexShrink: 0 }}>
          <div style={{ marginBottom: 20 }}>
            <RH>Contact</RH>
            {contactItems(data).map((c) => (
              <p key={c} style={{ fontSize: 11.5, margin: '0 0 4px', color: '#4b5563', wordBreak: 'break-word' }}>{c}</p>
            ))}
          </div>
          {data.skills && (
            <div style={{ marginBottom: 20 }}>
              <RH>Skills</RH>
              {skillList(data.skills).map((s) => (
                <p key={s} style={{ fontSize: 11.5, margin: '0 0 4px', color: '#374151' }}>
                  <span style={{ color: accent, fontWeight: 800, marginRight: 6, ...PRINT_EXACT }}>—</span>{s}
                </p>
              ))}
            </div>
          )}
          {data.education.length > 0 && (
            <div>
              <RH>Education</RH>
              {data.education.map((e) => (
                <div key={e.id} style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 12.2, fontWeight: 700, margin: 0, color: '#111827' }}>{e.school}</p>
                  <p style={{ fontSize: 11.5, margin: '1px 0 0', color: '#4b5563' }}>{e.degree}</p>
                  <p style={{ fontSize: 11, margin: '1px 0 0', color: '#9ca3af' }}>{e.date}</p>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

// ═══════════════════════ 10. Banner — monogram hero band ═══════════════════
function Banner({ data, accent }: { data: ResumeData; accent: string }) {
  const H = ({ children }: { children: React.ReactNode }) => (
    <h2 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.8, color: accent, margin: '0 0 10px', ...PRINT_EXACT }}>{children}</h2>
  );
  return (
    <div style={page({ padding: 0 })}>
      <div style={{ background: accent, color: '#fff', padding: '34px 55px', display: 'flex', alignItems: 'center', gap: 24, ...PRINT_EXACT }}>
        <div style={{ width: 92, height: 92, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', border: '3px solid rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, fontWeight: 800, flexShrink: 0, letterSpacing: 1, ...PRINT_EXACT }}>
          {(data.name || 'Your Name').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('') || 'Y'}
        </div>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 4px', lineHeight: 1.1 }}>{data.name || 'Your Name'}</h1>
          <p style={{ fontSize: 15, margin: 0, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: 2 }}>{data.title}</p>
        </div>
      </div>
      <div style={{ background: shade(accent, -55), color: 'rgba(255,255,255,0.92)', padding: '10px 55px', display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 11.5, ...PRINT_EXACT }}>
        {contactItems(data).map((c) => <span key={c}>{c}</span>)}
      </div>
      <div style={{ padding: '30px 55px 50px' }}>
        {data.summary && (
          <div style={{ marginBottom: 24 }}>
            <H>Profile</H>
            <p style={{ fontSize: 13, color: '#374151', margin: 0, textAlign: 'justify' }}>{data.summary}</p>
          </div>
        )}
        {data.experience.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <H>Experience</H>
            {data.experience.map((e) => (
              <div key={e.id} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: 14.5, margin: 0, fontWeight: 700, color: '#111827' }}>{e.role}</h3>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{e.date}</span>
                </div>
                <div style={{ fontSize: 12.8, color: '#4b5563', fontWeight: 600, marginBottom: 5 }}>{e.company}</div>
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
                <span style={{ fontSize: 12, color: '#6b7280' }}>{e.date}</span>
              </div>
            ))}
          </div>
        )}
        {data.skills && (
          <div>
            <H>Skills</H>
            <p style={{ fontSize: 12.8, color: '#374151', margin: 0 }}>{skillList(data.skills).join('  ·  ')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════ 11. Cards — soft shadowed blocks ══════════════════
function Cards({ data, accent }: { data: ResumeData; accent: string }) {
  const H = ({ children }: { children: React.ReactNode }) => (
    <h2 style={{ fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.4, color: '#111827', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent, ...PRINT_EXACT }} />{children}
    </h2>
  );
  const card: React.CSSProperties = {
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #eef1f5',
    borderLeft: `4px solid ${accent}`,
    boxShadow: '0 2px 10px rgba(15, 23, 42, 0.07)',
    padding: '13px 17px',
    ...PRINT_EXACT,
  };
  return (
    <div style={page({ padding: '40px 48px', background: '#f6f8fb' })}>
      <div style={{ ...card, borderLeftWidth: 6, padding: '22px 24px', marginBottom: 20 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: '0 0 3px', color: '#111827', letterSpacing: -0.3 }}>{data.name || 'Your Name'}</h1>
        <p style={{ fontSize: 14, fontWeight: 600, color: accent, margin: '0 0 9px', ...PRINT_EXACT }}>{data.title}</p>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11.8, color: '#6b7280' }}>
          {contactItems(data).map((c) => <span key={c}>{c}</span>)}
        </div>
      </div>
      {data.summary && (
        <div style={{ marginBottom: 20 }}>
          <H>Profile</H>
          <div style={card}>
            <p style={{ fontSize: 12.5, color: '#374151', margin: 0, textAlign: 'justify' }}>{data.summary}</p>
          </div>
        </div>
      )}
      {data.experience.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <H>Experience</H>
          {data.experience.map((e) => (
            <div key={e.id} style={{ ...card, marginBottom: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: 14, margin: 0, fontWeight: 700, color: '#111827' }}>{e.role}</h3>
                <span style={{ fontSize: 11.2, fontWeight: 600, color: shade(accent, -30), background: hexA(accent, 0.12), padding: '2px 9px', borderRadius: 20, ...PRINT_EXACT }}>{e.date}</span>
              </div>
              <div style={{ fontSize: 12.5, color: '#6b7280', fontWeight: 600, marginBottom: 5 }}>{e.company}</div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.2, color: '#374151' }}>
                {bullets(e.desc).map((b, i) => <li key={i} style={{ marginBottom: 3 }}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {data.education.length > 0 && (
          <div style={{ flex: '1 1 45%', minWidth: 220 }}>
            <H>Education</H>
            {data.education.map((e) => (
              <div key={e.id} style={{ ...card, marginBottom: 10 }}>
                <h3 style={{ fontSize: 13, margin: 0, fontWeight: 700, color: '#111827' }}>{e.school}</h3>
                <p style={{ fontSize: 12, color: '#4b5563', margin: '2px 0 0' }}>{e.degree}</p>
                <p style={{ fontSize: 11.2, color: '#9ca3af', margin: '1px 0 0' }}>{e.date}</p>
              </div>
            ))}
          </div>
        )}
        {data.skills && (
          <div style={{ flex: '1 1 45%', minWidth: 220 }}>
            <H>Skills</H>
            <div style={card}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {skillList(data.skills).map((s) => (
                  <span key={s} style={{ fontSize: 11.2, background: hexA(accent, 0.1), color: shade(accent, -30), padding: '4px 10px', borderRadius: 8, fontWeight: 600, ...PRINT_EXACT }}>{s}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════ 12. Academic — serif CV, education first ══════════
function Academic({ data, accent }: { data: ResumeData; accent: string }) {
  const H = ({ children }: { children: React.ReactNode }) => (
    <h2 style={{ fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.6, color: '#111827', margin: '0 0 9px', paddingBottom: 3, borderBottom: `1px solid ${accent}`, ...PRINT_EXACT }}>{children}</h2>
  );
  return (
    <div style={page({ padding: '52px 64px', fontFamily: '"Times New Roman", Times, Georgia, serif', lineHeight: 1.5 })}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 2px', color: '#111827', letterSpacing: 0.3 }}>{data.name || 'Your Name'}</h1>
        {data.title && <p style={{ fontSize: 13.5, fontStyle: 'italic', color: '#374151', margin: '0 0 6px' }}>{data.title}</p>}
        <div style={{ fontSize: 11.5, color: '#4b5563' }}>{contactItems(data).join('  |  ')}</div>
      </div>
      {data.education.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <H>Education</H>
          {data.education.map((e) => (
            <div key={e.id} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 14 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111827' }}>{e.school}</div>
                <div style={{ fontSize: 12.5, color: '#374151', fontStyle: 'italic' }}>{e.degree}</div>
              </div>
              <span style={{ fontSize: 12, color: '#4b5563', whiteSpace: 'nowrap' }}>{e.date}</span>
            </div>
          ))}
        </div>
      )}
      {data.summary && (
        <div style={{ marginBottom: 18 }}>
          <H>Research Statement</H>
          <p style={{ fontSize: 12.5, color: '#1f2937', margin: 0, textAlign: 'justify' }}>{data.summary}</p>
        </div>
      )}
      {data.experience.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <H>Appointments &amp; Experience</H>
          {data.experience.map((e) => (
            <div key={e.id} style={{ marginBottom: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 14 }}>
                <span style={{ fontSize: 13, color: '#111827' }}>
                  <strong style={{ fontWeight: 700 }}>{e.role}</strong>
                  {e.role && e.company ? ', ' : ''}
                  <span style={{ fontStyle: 'italic' }}>{e.company}</span>
                </span>
                <span style={{ fontSize: 12, color: '#4b5563', whiteSpace: 'nowrap' }}>{e.date}</span>
              </div>
              <ul style={{ margin: '3px 0 0', paddingLeft: 18, fontSize: 12, color: '#1f2937' }}>
                {bullets(e.desc).map((b, i) => <li key={i} style={{ marginBottom: 1.5 }}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
      {data.skills && (
        <div>
          <H>Areas of Expertise</H>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2px 22px' }}>
            {skillList(data.skills).map((s) => (
              <span key={s} style={{ fontSize: 12, color: '#1f2937' }}>
                <span style={{ color: accent, marginRight: 6, ...PRINT_EXACT }}>·</span>{s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════ 13. Tech — monospace, grid skills ═════════════════
const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

function TechGrid({ data, accent }: { data: ResumeData; accent: string }) {
  const H = ({ children }: { children: React.ReactNode }) => (
    <h2 style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 700, color: accent, margin: '0 0 11px', letterSpacing: 0.4, ...PRINT_EXACT }}>
      <span style={{ color: '#9ca3af' }}>{'// '}</span>{children}
    </h2>
  );
  return (
    <div style={page({ padding: '42px 52px' })}>
      <div style={{ border: `1px solid ${hexA(accent, 0.4)}`, borderRadius: 6, padding: '18px 20px', marginBottom: 22, background: hexA(accent, 0.04), ...PRINT_EXACT }}>
        <div style={{ fontFamily: MONO, fontSize: 11, color: accent, marginBottom: 4, ...PRINT_EXACT }}>{'~ $ whoami'}</div>
        <h1 style={{ fontSize: 29, fontWeight: 800, margin: '0 0 3px', color: '#111827', letterSpacing: -0.4 }}>{data.name || 'Your Name'}</h1>
        <p style={{ fontFamily: MONO, fontSize: 13, color: '#374151', margin: '0 0 10px' }}>{data.title}</p>
        <div style={{ fontFamily: MONO, fontSize: 11, color: '#6b7280', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {contactItems(data).map((c, i) => (
            <span key={c}>{i > 0 && <span style={{ color: accent, marginRight: 8, ...PRINT_EXACT }}>|</span>}{c}</span>
          ))}
        </div>
      </div>
      {data.summary && (
        <div style={{ marginBottom: 22 }}>
          <H>readme</H>
          <p style={{ fontSize: 12.5, color: '#374151', margin: 0, textAlign: 'justify' }}>{data.summary}</p>
        </div>
      )}
      {data.skills && (
        <div style={{ marginBottom: 22 }}>
          <H>stack</H>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, border: '1px solid #e5e7eb', ...PRINT_EXACT }}>
            {skillList(data.skills).map((s) => (
              <div key={s} style={{ fontFamily: MONO, fontSize: 11, color: '#374151', padding: '7px 9px', borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', wordBreak: 'break-word', ...PRINT_EXACT }}>{s}</div>
            ))}
          </div>
        </div>
      )}
      {data.experience.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <H>experience</H>
          {data.experience.map((e) => (
            <div key={e.id} style={{ marginBottom: 15, paddingLeft: 13, borderLeft: `2px solid ${hexA(accent, 0.35)}`, ...PRINT_EXACT }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: 14, margin: 0, fontWeight: 700, color: '#111827' }}>{e.role}</h3>
                <span style={{ fontFamily: MONO, fontSize: 11, color: '#6b7280' }}>{e.date}</span>
              </div>
              <div style={{ fontFamily: MONO, fontSize: 12, color: accent, marginBottom: 5, ...PRINT_EXACT }}>{e.company}</div>
              <ul style={{ margin: 0, paddingLeft: 15, fontSize: 12.2, color: '#374151', listStyleType: 'square' }}>
                {bullets(e.desc).map((b, i) => <li key={i} style={{ marginBottom: 3 }}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
      {data.education.length > 0 && (
        <div>
          <H>education</H>
          {data.education.map((e) => (
            <div key={e.id} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 14 }}>
              <span style={{ fontSize: 12.8, color: '#111827' }}><strong style={{ fontWeight: 700 }}>{e.school}</strong> <span style={{ color: '#6b7280' }}>{e.degree}</span></span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>{e.date}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════ 14. Infographic — bars + stat chips ═══════════════
/** Stable pseudo-proficiency (70-95%) derived from the skill name. */
function skillLevel(skill: string): number {
  let h = 0;
  for (let i = 0; i < skill.length; i++) h = (h * 31 + skill.charCodeAt(i)) >>> 0;
  return 70 + (h % 26);
}

function Infographic({ data, accent }: { data: ResumeData; accent: string }) {
  const H = ({ children }: { children: React.ReactNode }) => (
    <h2 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#111827', margin: '0 0 12px' }}>
      {children}
      <span style={{ display: 'block', width: 36, height: 3, background: accent, borderRadius: 2, marginTop: 5, ...PRINT_EXACT }} />
    </h2>
  );
  const skills = skillList(data.skills);
  const stats: { label: string; value: string }[] = [
    { label: 'Roles', value: String(data.experience.length) },
    { label: 'Skills', value: String(skills.length) },
    { label: 'Degrees', value: String(data.education.length) },
  ].filter((s) => s.value !== '0');
  return (
    <div style={page({ padding: '40px 50px' })}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, marginBottom: 22 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 30, fontWeight: 800, margin: '0 0 2px', color: '#111827', letterSpacing: -0.4 }}>{data.name || 'Your Name'}</h1>
          <p style={{ fontSize: 14, fontWeight: 600, color: accent, margin: '0 0 8px', ...PRINT_EXACT }}>{data.title}</p>
          <div style={{ fontSize: 11.5, color: '#6b7280', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {contactItems(data).map((c) => <span key={c}>{c}</span>)}
          </div>
        </div>
        {stats.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {stats.map((s) => (
              <div key={s.label} style={{ background: hexA(accent, 0.1), border: `1px solid ${hexA(accent, 0.3)}`, borderRadius: 10, padding: '8px 12px', textAlign: 'center', minWidth: 56, ...PRINT_EXACT }}>
                <div style={{ fontSize: 19, fontWeight: 800, color: shade(accent, -35), lineHeight: 1.1, ...PRINT_EXACT }}>{s.value}</div>
                <div style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.8, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {data.summary && (
        <div style={{ marginBottom: 22 }}>
          <H>About</H>
          <p style={{ fontSize: 12.5, color: '#374151', margin: 0, textAlign: 'justify' }}>{data.summary}</p>
        </div>
      )}
      {skills.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <H>Skill Strength</H>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '9px 26px' }}>
            {skills.map((s) => {
              const lvl = skillLevel(s);
              return (
                <div key={s}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#374151', marginBottom: 3 }}>
                    <span style={{ fontWeight: 600 }}>{s}</span>
                    <span style={{ color: '#9ca3af' }}>{lvl}%</span>
                  </div>
                  <div style={{ height: 7, borderRadius: 4, background: '#eef1f5', overflow: 'hidden', ...PRINT_EXACT }}>
                    <div style={{ width: `${lvl}%`, height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${shade(accent, 30)}, ${accent})`, ...PRINT_EXACT }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {data.experience.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <H>Experience</H>
          {data.experience.map((e) => (
            <div key={e.id} style={{ marginBottom: 14, display: 'flex', gap: 12 }}>
              <div style={{ width: 4, borderRadius: 3, background: hexA(accent, 0.35), flexShrink: 0, ...PRINT_EXACT }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: 14, margin: 0, fontWeight: 700, color: '#111827' }}>{e.role}</h3>
                  <span style={{ fontSize: 11.5, color: '#6b7280' }}>{e.date}</span>
                </div>
                <div style={{ fontSize: 12.5, color: accent, fontWeight: 600, marginBottom: 4, ...PRINT_EXACT }}>{e.company}</div>
                <ul style={{ margin: 0, paddingLeft: 15, fontSize: 12.2, color: '#374151' }}>
                  {bullets(e.desc).map((b, i) => <li key={i} style={{ marginBottom: 3 }}>{b}</li>)}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
      {data.education.length > 0 && (
        <div>
          <H>Education</H>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px 20px' }}>
            {data.education.map((e) => (
              <div key={e.id} style={{ background: '#f8fafc', borderRadius: 8, padding: '9px 12px', ...PRINT_EXACT }}>
                <p style={{ fontSize: 12.5, fontWeight: 700, margin: 0, color: '#111827' }}>{e.school}</p>
                <p style={{ fontSize: 11.5, margin: '1px 0 0', color: '#4b5563' }}>{e.degree}</p>
                <p style={{ fontSize: 11, margin: '1px 0 0', color: '#9ca3af' }}>{e.date}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════ 15. Swiss — strict grid, big type ═════════════════
function Swiss({ data, accent }: { data: ResumeData; accent: string }) {
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ display: 'flex', gap: 30, paddingTop: 14, marginBottom: 20, borderTop: '1px solid #111827' }}>
      <div style={{ width: 120, flexShrink: 0 }}>
        <h2 style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.6, color: '#111827', margin: 0 }}>{label}</h2>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
  return (
    <div style={page({ padding: '58px 60px' })}>
      <div style={{ height: 8, background: accent, marginBottom: 30, ...PRINT_EXACT }} />
      <h1 style={{ fontSize: 52, fontWeight: 700, margin: '0 0 6px', color: '#111827', letterSpacing: -1.8, lineHeight: 1 }}>{data.name || 'Your Name'}</h1>
      <p style={{ fontSize: 17, fontWeight: 400, color: '#4b5563', margin: '0 0 34px' }}>{data.title}</p>
      <Row label="Contact">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '3px 24px', fontSize: 12, color: '#374151' }}>
          {contactItems(data).map((c) => <span key={c} style={{ wordBreak: 'break-word' }}>{c}</span>)}
        </div>
      </Row>
      {data.summary && (
        <Row label="Profile">
          <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.75 }}>{data.summary}</p>
        </Row>
      )}
      {data.experience.length > 0 && (
        <Row label="Experience">
          {data.experience.map((e) => (
            <div key={e.id} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11.5, color: '#9ca3af', marginBottom: 2, letterSpacing: 0.6 }}>{e.date}</div>
              <h3 style={{ fontSize: 15.5, margin: 0, fontWeight: 700, color: '#111827', letterSpacing: -0.2 }}>{e.role}</h3>
              <div style={{ fontSize: 12.8, color: '#4b5563', marginBottom: 6 }}>{e.company}</div>
              <ul style={{ margin: 0, paddingLeft: 15, fontSize: 12.5, color: '#374151', lineHeight: 1.65 }}>
                {bullets(e.desc).map((b, i) => <li key={i} style={{ marginBottom: 3 }}>{b}</li>)}
              </ul>
            </div>
          ))}
        </Row>
      )}
      {data.education.length > 0 && (
        <Row label="Education">
          {data.education.map((e) => (
            <div key={e.id} style={{ marginBottom: 11 }}>
              <div style={{ fontSize: 11.5, color: '#9ca3af', marginBottom: 1, letterSpacing: 0.6 }}>{e.date}</div>
              <h3 style={{ fontSize: 13.8, margin: 0, fontWeight: 700, color: '#111827' }}>{e.school}</h3>
              <p style={{ fontSize: 12.5, color: '#4b5563', margin: '1px 0 0' }}>{e.degree}</p>
            </div>
          ))}
        </Row>
      )}
      {data.skills && (
        <Row label="Skills">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px 18px', fontSize: 12.2, color: '#374151' }}>
            {skillList(data.skills).map((s) => <span key={s}>{s}</span>)}
          </div>
        </Row>
      )}
    </div>
  );
}

// ═══════════════════════ 16. Corporate — two-tone formal bar ═══════════════
const CORP_NAVY = '#1e2a44';

function Corporate({ data, accent }: { data: ResumeData; accent: string }) {
  const H = ({ children }: { children: React.ReactNode }) => (
    <h2 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: CORP_NAVY, margin: '0 0 9px', paddingBottom: 4, borderBottom: `1px solid #cbd5e1`, ...PRINT_EXACT }}>
      {children}
      <span style={{ display: 'block', width: 52, height: 3, background: accent, marginTop: 4, marginBottom: -6, ...PRINT_EXACT }} />
    </h2>
  );
  return (
    <div style={page({ padding: 0, lineHeight: 1.55 })}>
      <div style={{ display: 'flex', ...PRINT_EXACT }}>
        <div style={{ flex: 1, background: CORP_NAVY, color: '#fff', padding: '30px 20px 26px 55px', minWidth: 0, ...PRINT_EXACT }}>
          <h1 style={{ fontSize: 30, fontWeight: 700, margin: '0 0 4px', letterSpacing: 0.4 }}>{data.name || 'Your Name'}</h1>
          <p style={{ fontSize: 13.5, margin: 0, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 2 }}>{data.title}</p>
        </div>
        <div style={{ width: 235, flexShrink: 0, background: accent, color: '#fff', padding: '30px 55px 26px 22px', ...PRINT_EXACT }}>
          {contactItems(data).map((c) => (
            <p key={c} style={{ fontSize: 11.2, margin: '0 0 4px', wordBreak: 'break-word', color: 'rgba(255,255,255,0.95)' }}>{c}</p>
          ))}
        </div>
      </div>
      <div style={{ padding: '26px 55px 46px' }}>
        {data.summary && (
          <div style={{ marginBottom: 20 }}>
            <H>Professional Profile</H>
            <p style={{ fontSize: 12.5, color: '#374151', margin: 0, textAlign: 'justify' }}>{data.summary}</p>
          </div>
        )}
        {data.experience.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <H>Career History</H>
            {data.experience.map((e) => (
              <div key={e.id} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: 13.8, margin: 0, fontWeight: 700, color: CORP_NAVY, ...PRINT_EXACT }}>{e.role}</h3>
                  <span style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>{e.date}</span>
                </div>
                <div style={{ fontSize: 12.5, color: '#475569', fontWeight: 600, marginBottom: 4 }}>{e.company}</div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.2, color: '#374151' }}>
                  {bullets(e.desc).map((b, i) => <li key={i} style={{ marginBottom: 2 }}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 30, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {data.education.length > 0 && (
            <div style={{ flex: '1 1 46%', minWidth: 230 }}>
              <H>Education</H>
              {data.education.map((e) => (
                <div key={e.id} style={{ marginBottom: 9 }}>
                  <h3 style={{ fontSize: 12.8, margin: 0, fontWeight: 700, color: CORP_NAVY, ...PRINT_EXACT }}>{e.school}</h3>
                  <p style={{ fontSize: 12, color: '#475569', margin: '1px 0 0' }}>{e.degree}</p>
                  <p style={{ fontSize: 11.2, color: '#94a3b8', margin: '1px 0 0' }}>{e.date}</p>
                </div>
              ))}
            </div>
          )}
          {data.skills && (
            <div style={{ flex: '1 1 46%', minWidth: 230 }}>
              <H>Core Competencies</H>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '3px 16px' }}>
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
  { id: 'twoColumn', name: 'Compact', blurb: 'Balanced two-column, no dark rail', atsSafe: true, defaultAccent: '#334155', Render: TwoColumn },
  { id: 'banner', name: 'Banner', blurb: 'Monogram hero band, single column', atsSafe: false, defaultAccent: '#4338ca', Render: Banner },
  { id: 'cards', name: 'Cards', blurb: 'Soft shadowed cards per role', atsSafe: false, defaultAccent: '#0891b2', Render: Cards },
  { id: 'academic', name: 'Academic', blurb: 'Serif CV, education first', atsSafe: true, defaultAccent: '#15803d', Render: Academic },
  { id: 'techGrid', name: 'Tech', blurb: 'Monospace accents, skill grid', atsSafe: false, defaultAccent: '#0f766e', Render: TechGrid },
  { id: 'infographic', name: 'Infographic', blurb: 'Skill bars and stat chips', atsSafe: false, defaultAccent: '#db2777', Render: Infographic },
  { id: 'swiss', name: 'Swiss', blurb: 'Strict grid, big type, whitespace', atsSafe: true, defaultAccent: '#dc2626', Render: Swiss },
  { id: 'corporate', name: 'Corporate', blurb: 'Two-tone formal header bar', atsSafe: false, defaultAccent: '#be123c', Render: Corporate },
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

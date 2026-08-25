'use client';

import { useState, useEffect, useRef, DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  RotateCcw,
  Download,
  RefreshCw,
  FileEdit,
  Briefcase,
  Wrench,
  Rocket,
  GraduationCap,
  Check,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/components/Toast';
import RoleCombobox, { COMMON_ROLES } from '@/components/RoleCombobox';
import { saveResume, getLatestResume, updateResumeRecord, type ResumeRecord } from '@/lib/resume-store';
import { addXP, addGems, updateQuestProgress, playDuoSound } from '@/lib/gamification';
import ResumeKeywordLab from '@/components/ResumeKeywordLab';
import {
  EMPTY_RESUME_PROFILE,
  normalizeResumeProfile,
  saveResumeBuilderProfile,
  type ResumeProfile,
} from '@/lib/resume-profile';

/* ----------- keyword banks per role ----------- */
const roleKeywordBank: Record<string, { all: string[]; common: string[] }> = {
  'Product Manager': {
    all: ['roadmap prioritization', 'stakeholder management', 'A/B testing', 'OKRs', 'user research', 'SQL', 'market analysis', 'go-to-market', 'KPIs', 'competitive analysis', 'wireframing', 'JIRA', 'sprint planning', 'user stories', 'PRD'],
    common: ['agile', 'product strategy', 'analytics', 'cross-functional', 'data-driven'],
  },
  'Software Engineer': {
    all: ['system design', 'CI/CD', 'microservices', 'REST APIs', 'unit testing', 'Docker', 'Kubernetes', 'AWS', 'data structures', 'algorithms', 'code review', 'Git', 'TypeScript', 'Python', 'SQL'],
    common: ['agile', 'full-stack', 'scalability', 'performance optimization', 'debugging'],
  },
  'Frontend Developer': {
    all: ['React', 'TypeScript', 'CSS-in-JS', 'accessibility', 'responsive design', 'webpack', 'Next.js', 'state management', 'REST APIs', 'GraphQL', 'Figma', 'design systems', 'performance optimization', 'SEO', 'testing'],
    common: ['JavaScript', 'HTML', 'CSS', 'Git', 'agile'],
  },
  'Data Analyst': {
    all: ['SQL', 'Python', 'Tableau', 'Power BI', 'statistical analysis', 'ETL', 'data modeling', 'A/B testing', 'regression analysis', 'data pipelines', 'Excel', 'R', 'machine learning', 'data visualization', 'BigQuery'],
    common: ['data-driven', 'reporting', 'dashboards', 'KPIs', 'insights'],
  },
  'Business Analyst': {
    all: ['requirements gathering', 'stakeholder management', 'process mapping', 'JIRA', 'user stories', 'UAT', 'gap analysis', 'SQL', 'Tableau', 'wireframing', 'BRD', 'agile', 'scrum', 'data analysis', 'KPIs'],
    common: ['cross-functional', 'documentation', 'communication', 'problem-solving', 'Excel'],
  },
  'Management Trainee': {
    all: ['leadership', 'project management', 'business development', 'strategic planning', 'market research', 'P&L management', 'team management', 'operations', 'supply chain', 'CRM', 'sales strategy', 'client relations', 'budgeting', 'KPIs', 'stakeholder management'],
    common: ['communication', 'problem-solving', 'analytical skills', 'teamwork', 'adaptability'],
  },
};

const targetRoles = Object.keys(roleKeywordBank);

/* ----------- helpers ----------- */
function impactColor(impact: string) {
  if (impact === 'high') return 'red';
  if (impact === 'medium') return 'amber';
  return 'blue';
}

const builderSections = [
  { icon: FileEdit, label: 'Professional summary', detail: '3 AI suggestions' },
  { icon: Briefcase, label: 'Work experience', detail: '2 entries \u00b7 1 needs metrics' },
  { icon: Wrench, label: 'Skills', detail: '6 missing keywords ready to insert' },
  { icon: Rocket, label: 'Projects', detail: '3 entries' },
  { icon: GraduationCap, label: 'Education', detail: 'complete' },
];

export default function ATSPage() {
  const [view, setView] = useState<'upload' | 'analyzing' | 'result'>('upload');
  const [dragging, setDragging] = useState(false);
  const [animated, setAnimated] = useState(false);
  const [targetRole, setTargetRole] = useState(targetRoles[0]);
  const [result, setResult] = useState<ResumeRecord | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null);
  const [builderProfile, setBuilderProfile] = useState<ResumeProfile>(EMPTY_RESUME_PROFILE);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  const openInBuilder = (section: string) => {
    // The analysis flow already stores extracted data under `resumeBuilderData`.
    if (result?.extractedData && typeof window !== 'undefined') {
      saveResumeBuilderProfile(normalizeResumeProfile(result.extractedData), 'ats-report');
    }
    toast(`Opening ${section} in the Resume Builder…`);
    router.push('/dashboard/resume-builder');
  };

  /* on mount, check for a previous analysis */
  useEffect(() => {
    const latest = getLatestResume();
    if (latest) {
      setResult(latest);
      setTargetRole(latest.targetRole);
      if (latest.extractedData) setBuilderProfile(normalizeResumeProfile(latest.extractedData));
      setView('result');
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (view === 'analyzing') {
      setProgress(0);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) return prev;
          const increment = Math.max(1, Math.floor((95 - prev) / 10));
          return prev + increment;
        });
      }, 150);
    }
    return () => clearInterval(interval);
  }, [view]);

  const processFile = async (file: File) => {
    setCurrentFile(file);
    setErrorModal(null);
    setView('analyzing');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('targetRole', targetRole);

      // Never let the request hang forever (the free NVIDIA tier can be slow).
      // Abort after 75s so the UI can recover instead of freezing at 95%.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 75000);

      let res: Response;
      try {
        res = await fetch('/api/ats/analyze', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (errorData.code === 'NOT_A_RESUME') {
          setView('upload');
          setErrorModal({
            title: 'That doesn’t look like a resume',
            message: 'We could only accept your resume here. Please upload a valid resume (PDF or DOCX) so we can analyze it.',
          });
          return;
        }
        if (errorData.code === 'TIMEOUT' || res.status === 504) {
          setView('upload');
          setErrorModal({
            title: 'Taking longer than usual',
            message: 'The analyzer is busy right now. Please wait a moment and try uploading your resume again.',
          });
          return;
        }
        throw new Error(errorData.error || 'Failed to analyze resume');
      }

      const analysisData = await res.json();
      
      const analysis: ResumeRecord = {
        id: crypto.randomUUID(),
        fileName: file.name,
        fileUrl: analysisData.fileUrl,
        uploadDate: new Date().toISOString(),
        targetRole,
        atsScore: analysisData.atsScore,
        breakdown: analysisData.breakdown,
        missingKeywords: analysisData.missingKeywords,
        presentKeywords: analysisData.presentKeywords,
        suggestions: analysisData.suggestions,
        extractedData: analysisData.extractedData,
        executiveSummary: analysisData.executiveSummary,
        strengths: analysisData.strengths,
        risks: analysisData.risks,
        sectionFeedback: analysisData.sectionFeedback,
        rewriteSuggestions: analysisData.rewriteSuggestions,
        analysisModel: analysisData.analysisModel,
      };

      setProgress(100);
      setTimeout(() => {
        saveResume(analysis);
        if (analysisData.extractedData && typeof window !== 'undefined') {
          const profile = normalizeResumeProfile(analysisData.extractedData);
          setBuilderProfile(profile);
          saveResumeBuilderProfile(profile, 'ats-upload');
        }
        try {
          addXP(25);
          addGems(10);
          updateQuestProgress('resume_scan', 1);
          playDuoSound('correct');
        } catch {}
        setResult(analysis);
        setView('result');
      }, 500);
    } catch (err: unknown) {
      setView('upload');
      if (err instanceof DOMException && err.name === 'AbortError') {
        setErrorModal({
          title: 'Taking longer than usual',
          message: 'The analyzer is busy right now. Please wait a moment and try uploading your resume again.',
        });
      } else {
        setErrorModal({
          title: 'Could not analyze the file',
            message: err instanceof Error ? err.message : 'Something went wrong while analyzing your resume. Please try uploading it again.',
        });
      }
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };
  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };
  const handleDragLeave = () => setDragging(false);
  const validateFile = (file: File) => {
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const validExtensions = ['.pdf', '.doc', '.docx'];
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

    if (!validTypes.includes(file.type) && !validExtensions.includes(extension)) {
      setErrorModal({
        title: 'Unsupported file type',
        message: 'We could only accept your resume here. Please upload a valid resume as a PDF or DOCX file.',
      });
      return false;
    }
    // Guard against oversized files (max 5 MB) before uploading.
    if (file.size > 5 * 1024 * 1024) {
      setErrorModal({
        title: 'File too large',
        message: 'Your resume must be under 5 MB. Please upload a smaller PDF or DOCX file.',
      });
      return false;
    }
    return true;
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && validateFile(file)) processFile(file);
  };
  const handleClick = () => fileRef.current?.click();
  const handleFileChange = () => {
    const file = fileRef.current?.files?.[0];
    if (file && validateFile(file)) processFile(file);
  };

  useEffect(() => {
    if (view === 'result') {
      requestAnimationFrame(() => {
        setAnimated(true);
      });
    } else {
      setAnimated(false);
    }
  }, [view]);

  /* build display data from result */
  const skillBars = result
    ? [
        { label: 'Formatting & ATS compatibility', value: result.breakdown.formatting },
        { label: `Keyword match \u00b7 ${result.targetRole}`, value: result.breakdown.keywords },
        { label: 'Quantified achievements', value: result.breakdown.achievements },
        { label: 'Section structure', value: result.breakdown.structure },
        { label: 'Readability & length', value: result.breakdown.readability },
      ]
    : [];

  /* ----------- premium error popup ----------- */
  const errorPopup = errorModal ? (
    <div
      onClick={() => setErrorModal(null)}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(2,6,23,0.72)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
        animation: 'atsFade 0.2s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="widget"
        style={{
          maxWidth: 440, width: '100%', textAlign: 'center', padding: '2.5rem 2rem',
          border: '1px solid rgba(239,68,68,0.35)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
          animation: 'atsPop 0.25s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <div style={{
          width: 68, height: 68, borderRadius: '50%', margin: '0 auto 1.25rem',
          display: 'grid', placeItems: 'center',
          background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
        }}>
          <FileText size={30} color="#ef4444" />
        </div>
        <h3 style={{ fontSize: '1.3rem', marginBottom: '0.75rem' }}>{errorModal.title}</h3>
        <p style={{ color: 'var(--text-2)', lineHeight: 1.65, margin: '0 0 1.75rem' }}>
          {errorModal.message}
        </p>
        <button
          className="btn btn-primary"
          onClick={() => { setErrorModal(null); fileRef.current?.click(); }}
          style={{ padding: '0.75rem 2rem', borderRadius: 'var(--r-full)' }}
        >
          <FileText size={16} /> Upload resume
        </button>
      </div>
      <style>{`
        @keyframes atsFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes atsPop { from { opacity: 0; transform: translateY(12px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
    </div>
  ) : null;

  /* ----------- UPLOAD VIEW ----------- */
  if (view === 'upload' || view === 'analyzing') {
    return (
      <>
        {errorPopup}
        <div className="app-head">
          <div>
            <h2>ATS resume analyzer</h2>
            <p>See your resume the way recruiters&#39; software sees it.</p>
          </div>
        </div>

        {view === 'analyzing' ? (
          <div
            className="upload-zone"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 280,
              position: 'relative'
            }}
          >
            <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 20 }}>
              <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                {/* Background circle */}
                <circle 
                  cx="60" cy="60" r="54" 
                  fill="none" 
                  stroke="rgba(255,255,255,0.05)" 
                  strokeWidth="8" 
                />
                {/* Progress circle */}
                <circle 
                  cx="60" cy="60" r="54" 
                  fill="none" 
                  stroke="var(--blue)" 
                  strokeWidth="8" 
                  strokeDasharray="339.292" 
                  strokeDashoffset={339.292 - (339.292 * progress) / 100}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.2s ease-out' }}
                />
              </svg>
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column'
              }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>
                  {progress}%
                </span>
              </div>
            </div>
            <h3 style={{ animation: 'pulse 1.5s infinite', color: 'var(--blue)' }}>Analyzing your resume...</h3>
            <p style={{ color: 'var(--text-2)', marginTop: 8, fontSize: 14 }}>Extracting skills & checking ATS format</p>
            <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
          </div>
        ) : (
          <>
            <div className="field" style={{ marginBottom: '1rem', maxWidth: 380 }}>
              <label>Target role</label>
              <RoleCombobox
                value={targetRole}
                onChange={setTargetRole}
                options={COMMON_ROLES}
                placeholder="Type or select your target role…"
              />
            </div>

            <div
              className={`upload-zone${dragging ? ' drag' : ''}`}
              onClick={handleClick}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <div className="up-ic">
                <FileText size={28} />
              </div>
              <h3>Drop your resume here</h3>
              <p style={{ color: 'var(--text-2)', marginTop: 4 }}>or click to browse &middot; max 5 MB</p>
              <div className="fmt">
                <span>PDF</span>
                <span>DOC</span>
                <span>DOCX</span>
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  /* ----------- RESULT VIEW ----------- */
  return (
    <>
      {errorPopup}
      <div className="app-head">
        <div>
          <h2>ATS resume analyzer</h2>
          <p>See your resume the way recruiters&#39; software sees it.</p>
        </div>
      </div>

      <div className="dash-grid-2">
        {/* LEFT: Resume breakdown */}
        <div className="widget">
          <h4>Resume breakdown &middot; {result?.fileName ?? 'Resume'}</h4>

          {skillBars.map((s) => (
            <div className="skill-row" key={s.label}>
              <div className="top">
                <b>{s.label}</b>
                <span>{s.value}/100</span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  data-w={s.value}
                  style={{ width: animated ? `${s.value}%` : '0%' }}
                />
              </div>
            </div>
          ))}

          <h4 style={{ marginTop: '1.2rem' }}>Missing keywords</h4>
          <div style={{ marginBottom: 8 }}>
            {(result?.missingKeywords ?? []).map((k) => (
              <span className="kw" key={k}>{k}</span>
            ))}
          </div>
          <div>
            {(result?.presentKeywords ?? []).map((k) => (
              <span className="kw good" key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Check size={12} /> {k}
              </span>
            ))}
          </div>
        </div>

        {/* RIGHT column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* ATS Score */}
          <div className="widget" style={{ textAlign: 'center' }}>
            <div
              className="big-ring"
              style={{ '--p': result?.atsScore ?? 0, margin: '0 auto 1rem' } as React.CSSProperties}
            >
              <div>
                <b>{result?.atsScore ?? 0}</b>
                <small>OVERALL / 100</small>
              </div>
            </div>
            <p style={{ fontSize: '.9rem', color: 'var(--text-2)', marginBottom: '1rem' }}>
              Your resume scores well on structure and formatting but needs stronger keyword alignment
              for {result?.targetRole ?? 'target'} roles.
            </p>
            <button className="btn btn-ghost btn-sm" onClick={() => { setView('upload'); toast('Ready for another resume'); }}>
              <RotateCcw size={15} /> Analyze another resume
            </button>
          </div>

          {/* Suggested improvements */}
          <div className="widget">
            <h4>Suggested improvements</h4>
            {(result?.suggestions ?? []).map((imp, i) => (
              <div className="list-row" key={i}>
                <span>{imp.text}</span>
                <span className={`tag ${impactColor(imp.impact)}`}>+{imp.points} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Deep AI report */}
      <div className="widget" style={{ marginTop: '1rem' }}>
        <h4>
          <span style={{ display: 'flex', alignItems: 'center', gap: '.45rem' }}><Loader2 size={17} /> Deep resume report</span>
          {result?.analysisModel && <span className="tag purple" style={{ fontSize: '.68rem' }}>{result.analysisModel}</span>}
        </h4>
        <p style={{ color: 'var(--text-2)', lineHeight: 1.65, margin: '.6rem 0 1rem' }}>
          {result?.executiveSummary || 'Your report combines ATS parsing, role keywords, evidence quality, structure, and recruiter readability.'}
        </p>
        <div className="dash-grid-2" style={{ alignItems: 'start' }}>
          <div className="ats-insight-panel positive">
            <strong>What is working</strong>
            <ul>{(result?.strengths || []).map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          <div className="ats-insight-panel risk">
            <strong>Recruiter and ATS risks</strong>
            <ul>{(result?.risks || []).map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        </div>
        <div className="ats-section-feedback">
          {(result?.sectionFeedback || []).map((item) => (
            <div key={`${item.section}-${item.finding}`} className="ats-section-row">
              <div className="ats-section-score"><b>{item.score}</b><small>/100</small></div>
              <div><strong>{item.section}</strong><p>{item.finding}</p><span>Next edit: {item.action}</span></div>
            </div>
          ))}
        </div>
        {(result?.rewriteSuggestions?.length || 0) > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <h4 style={{ marginBottom: '.65rem' }}>Truth-preserving rewrite examples</h4>
            <div className="ats-rewrite-grid">
              {result?.rewriteSuggestions?.map((item, index) => (
                <div className="ats-rewrite-card" key={`${item.section}-${index}`}>
                  <span className="tag blue">{item.section}</span>
                  {item.original && <p><small>Before</small>{item.original}</p>}
                  <p className="improved"><small>Stronger version</small>{item.improved}</p>
                  <em>{item.reason}</em>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '1rem' }}>
        <ResumeKeywordLab
          keywords={result?.missingKeywords || []}
          profile={builderProfile}
          onChange={(profile, keyword, section) => {
            setBuilderProfile(profile);
            saveResumeBuilderProfile(profile, `ats-keyword-${section}`);
            setResult((current) => {
              if (!current) return current;
              const next: ResumeRecord = {
                ...current,
                extractedData: profile,
                missingKeywords: current.missingKeywords.filter((item) => item !== keyword),
                presentKeywords: Array.from(new Set([...current.presentKeywords, keyword])),
              };
              updateResumeRecord(next);
              return next;
            });
            try { addXP(3); playDuoSound('correct'); } catch {}
            toast(`“${keyword}” added to ${section}. Verify it before applying.`);
          }}
        />
      </div>

      {/* Resume builder */}
      <div className="widget" style={{ marginTop: '1rem' }}>
        <h4>Resume builder &middot; edit sections directly</h4>

        {builderSections.map((sec) => {
          const Icon = sec.icon;
          return (
            <div className="builder-sec" key={sec.label}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem' }}>
                <Icon size={18} style={{ color: 'var(--blue)', flexShrink: 0 }} />
                <span>
                  <b>{sec.label}</b>
                  <span style={{ color: 'var(--text-3)', marginLeft: 8, fontSize: '.82rem' }}>{sec.detail}</span>
                </span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => openInBuilder(sec.label)}>
                Edit
              </button>
            </div>
          );
        })}

        <div style={{ display: 'flex', gap: '.7rem', marginTop: '1.2rem' }}>
          <button className="btn btn-primary btn-sm" onClick={async () => {
            if (!result) return;
            const html2pdf = (await import('html2pdf.js')).default;
            
            const container = document.createElement('div');
            container.innerHTML = `
              <div style="font-family: 'Inter', sans-serif; color: #111; padding: 40px; max-width: 800px; margin: 0 auto; box-sizing: border-box;">
                <!-- Header -->
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0052FF; padding-bottom: 20px; margin-bottom: 30px;">
                  <div>
                    <h1 style="margin: 0; font-size: 28px; color: #0052FF; font-weight: 800;">InterviewAce <span style="font-size: 14px; background: #0052FF; color: white; padding: 3px 6px; border-radius: 4px; vertical-align: middle;">AI</span></h1>
                    <p style="margin: 5px 0 0 0; color: #555; font-size: 14px;">ATS Resume Analysis Report</p>
                  </div>
                  <div style="text-align: right;">
                    <h2 style="margin: 0; font-size: 36px; color: ${result.atsScore >= 80 ? '#10B981' : result.atsScore >= 60 ? '#F59E0B' : '#EF4444'}; font-weight: 800;">${result.atsScore}<span style="font-size: 18px; color: #888;">/100</span></h2>
                    <p style="margin: 0; color: #555; font-size: 14px; font-weight: 500;">Overall ATS Score</p>
                  </div>
                </div>
          
                <!-- File Details -->
                <div style="background: #f8fafc; padding: 15px 20px; border-radius: 8px; margin-bottom: 30px; display: flex; justify-content: space-between;">
                  <div>
                    <p style="margin: 0 0 5px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">File Name</p>
                    <p style="margin: 0; font-weight: 600; color: #0f172a; font-size: 14px;">${result.fileName}</p>
                  </div>
                  <div>
                    <p style="margin: 0 0 5px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Target Role</p>
                    <p style="margin: 0; font-weight: 600; color: #0f172a; font-size: 14px;">${result.targetRole}</p>
                  </div>
                  <div>
                    <p style="margin: 0 0 5px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Date</p>
                    <p style="margin: 0; font-weight: 600; color: #0f172a; font-size: 14px;">${new Date(result.uploadDate).toLocaleDateString()}</p>
                  </div>
                </div>
          
                <!-- Breakdown -->
                <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; font-weight: 700;">Score Breakdown</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px;">
                  <div style="display: flex; justify-content: space-between; padding: 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px;">
                    <span style="color: #475569; font-size: 14px; font-weight: 500;">Formatting & ATS compatibility</span>
                    <span style="font-weight: 700; color: #0f172a;">${result.breakdown.formatting}/100</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px;">
                    <span style="color: #475569; font-size: 14px; font-weight: 500;">Keyword match</span>
                    <span style="font-weight: 700; color: #0f172a;">${result.breakdown.keywords}/100</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px;">
                    <span style="color: #475569; font-size: 14px; font-weight: 500;">Quantified achievements</span>
                    <span style="font-weight: 700; color: #0f172a;">${result.breakdown.achievements}/100</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px;">
                    <span style="color: #475569; font-size: 14px; font-weight: 500;">Section structure</span>
                    <span style="font-weight: 700; color: #0f172a;">${result.breakdown.structure}/100</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px;">
                    <span style="color: #475569; font-size: 14px; font-weight: 500;">Readability & length</span>
                    <span style="font-weight: 700; color: #0f172a;">${result.breakdown.readability}/100</span>
                  </div>
                </div>
          
                <!-- Keywords -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                  <div>
                    <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #059669; font-weight: 700;">Present Keywords ✓</h3>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                      ${result.presentKeywords.map(k => `<span style="background: #d1fae5; color: #065f46; padding: 5px 12px; border-radius: 20px; font-size: 12px; border: 1px solid #a7f3d0; font-weight: 500;">${k}</span>`).join('')}
                    </div>
                  </div>
                  <div>
                    <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #dc2626; font-weight: 700;">Missing Keywords ✗</h3>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                      ${result.missingKeywords.map(k => `<span style="background: #fee2e2; color: #991b1b; padding: 5px 12px; border-radius: 20px; font-size: 12px; border: 1px solid #fecaca; font-weight: 500;">${k}</span>`).join('')}
                    </div>
                  </div>
                </div>
          
                <!-- Suggestions -->
                <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; font-weight: 700;">AI Suggestions for Improvement</h3>
                <div style="display: flex; flex-direction: column; gap: 16px;">
                  ${result.suggestions.map(s => `
                    <div style="page-break-inside: avoid; background: #fff; border: 1px solid #e2e8f0; border-left: 4px solid ${s.impact === 'high' ? '#ef4444' : s.impact === 'medium' ? '#f59e0b' : '#3b82f6'}; padding: 16px 20px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                      <div style="display: flex; justify-content: space-between; margin-bottom: 10px; align-items: center;">
                        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: ${s.impact === 'high' ? '#ef4444' : s.impact === 'medium' ? '#f59e0b' : '#3b82f6'};">${s.impact} Impact</span>
                        <span style="font-size: 12px; font-weight: 700; color: #059669; background: #d1fae5; padding: 4px 10px; border-radius: 12px;">+${s.points} pts</span>
                      </div>
                      <p style="margin: 0; font-size: 14.5px; color: #334155; line-height: 1.6;">${s.text}</p>
                    </div>
                  `).join('')}
                </div>
          
                <div style="margin-top: 50px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px; font-weight: 500;">
                  Generated by InterviewAce AI • interviewace-ai.vercel.app
                </div>
              </div>
            `;
          
            document.body.appendChild(container);
          
            const opt = {
              margin:       [0.5, 0, 0.5, 0] as [number, number, number, number],
              filename:     `ats-report-${result.fileName.replace(/\.[^.]+$/, '')}.pdf`,
              image:        { type: 'jpeg' as const, quality: 0.98 },
              html2canvas:  { scale: 2, useCORS: true },
              jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' as const },
              pagebreak:    { mode: 'css' }
            };
          
            html2pdf().set(opt).from(container).save().then(() => {
              document.body.removeChild(container);
              toast('ATS Report downloaded as PDF');
            });
          }}>
            <Download size={15} /> Export ATS report
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => {
            if (!result || !currentFile) {
              toast('No file available to re-score. Please upload again.');
              setView('upload');
              return;
            }
            processFile(currentFile);
            setAnimated(false);
            requestAnimationFrame(() => setAnimated(true));
            toast('Resume re-scored with updated analysis');
          }}>
            <RefreshCw size={15} /> Re-score after edits
          </button>
        </div>
      </div>

    </>
  );
}

'use client';

import { useState, useEffect, useRef, DragEvent } from 'react';
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
import { saveResume, getLatestResume, type ResumeRecord } from '@/lib/resume-store';

function downloadFile(content: string, filename: string, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

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
function randBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateAnalysis(fileName: string, targetRole: string): ResumeRecord {
  const bank = roleKeywordBank[targetRole] || roleKeywordBank['Product Manager'];

  const formatting = randBetween(75, 95);
  const keywords = randBetween(55, 85);
  const achievements = randBetween(60, 90);
  const structure = randBetween(72, 95);
  const readability = randBetween(70, 92);

  const atsScore = Math.round(
    formatting * 0.15 + keywords * 0.3 + achievements * 0.25 + structure * 0.15 + readability * 0.15
  );

  // pick random subset as missing / present
  const shuffled = [...bank.all].sort(() => Math.random() - 0.5);
  const missingCount = randBetween(4, 7);
  const missingKeywords = shuffled.slice(0, missingCount);
  const presentKeywords = [...bank.common.slice(0, randBetween(2, 4)), ...shuffled.slice(missingCount, missingCount + randBetween(1, 3))];

  const suggestionTemplates = [
    { text: `Add quantified metrics to your work-experience bullets (e.g. "increased retention by 18%")`, impact: 'high', points: randBetween(4, 7) },
    { text: `Include "${missingKeywords[0]}" and "${missingKeywords[1]}" in your skills or summary section`, impact: 'medium', points: randBetween(3, 5) },
    { text: `Shorten summary to 2-3 concise sentences for better ATS parsing`, impact: 'low', points: randBetween(1, 3) },
    { text: `Use standard section headings (Experience, Education, Skills) for better ATS recognition`, impact: 'medium', points: randBetween(2, 4) },
    { text: `Remove graphics/icons that ATS software cannot parse`, impact: 'high', points: randBetween(3, 6) },
  ];

  return {
    id: crypto.randomUUID(),
    fileName,
    uploadDate: new Date().toISOString(),
    targetRole,
    atsScore,
    breakdown: { formatting, keywords, achievements, structure, readability },
    missingKeywords,
    presentKeywords,
    suggestions: suggestionTemplates.slice(0, randBetween(3, 5)),
  };
}

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
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  /* on mount, check for a previous analysis */
  useEffect(() => {
    const latest = getLatestResume();
    if (latest) {
      setResult(latest);
      setTargetRole(latest.targetRole);
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
    setView('analyzing');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('targetRole', targetRole);

      const res = await fetch('/api/ats/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to analyze resume');
      }

      const analysisData = await res.json();
      
      const analysis: ResumeRecord = {
        id: crypto.randomUUID(),
        fileName: file.name,
        uploadDate: new Date().toISOString(),
        targetRole,
        atsScore: analysisData.atsScore,
        breakdown: analysisData.breakdown,
        missingKeywords: analysisData.missingKeywords,
        presentKeywords: analysisData.presentKeywords,
        suggestions: analysisData.suggestions,
        extractedData: analysisData.extractedData,
      };

      setProgress(100);
      setTimeout(() => {
        saveResume(analysis);
        if (analysisData.extractedData && typeof window !== 'undefined') {
          localStorage.setItem('resumeBuilderData', JSON.stringify(analysisData.extractedData));
        }
        setResult(analysis);
        setView('result');
      }, 500);
    } catch (err: any) {
      toast(err.message || 'Error analyzing resume');
      setView('upload');
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
      toast('Please upload a valid PDF or DOCX file. TXT and other formats are not supported.');
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

  /* ----------- UPLOAD VIEW ----------- */
  if (view === 'upload' || view === 'analyzing') {
    return (
      <>
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
                <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)' }}>
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
            <div className="field" style={{ marginBottom: '1rem', maxWidth: 340 }}>
              <label>Target role</label>
              <select value={targetRole} onChange={(e) => setTargetRole(e.target.value)}>
                {targetRoles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
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
              <button className="btn btn-ghost btn-sm" onClick={() => toast(`Editing ${sec.label}`)}>
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
              margin:       [0.5, 0, 0.5, 0],
              filename:     `ats-report-${result.fileName.replace(/\.[^.]+$/, '')}.pdf`,
              image:        { type: 'jpeg', quality: 0.98 },
              html2canvas:  { scale: 2, useCORS: true },
              jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' },
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

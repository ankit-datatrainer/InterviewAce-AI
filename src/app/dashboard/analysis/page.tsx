'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Download,
  FileText,
  Plus,
  Video,
  Sparkles,
  AlertTriangle,
  Flame,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  HelpCircle,
  Award,
  Target,
  ArrowRight,
} from 'lucide-react';
import { useToast } from '@/components/Toast';
import {
  getInterviewById,
  getLatestInterview,
  hydrateInterviews,
  addRetakeResult,
} from '@/lib/interview-store';
import type { InterviewRecord, RetakeResult } from '@/lib/interview-store';
import { getRecording } from '@/lib/recording-store';

function downloadFile(content: string, filename: string, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function colorForValue(v: number): string {
  if (v >= 7.5) return 'green';
  if (v >= 6) return 'amber';
  return 'red';
}

const VERDICT_STYLES: Record<string, { label: string; bg: string; fg: string; border: string }> = {
  strong: { label: 'Strong', bg: 'rgba(34,197,94,.12)', fg: '#22C55E', border: 'rgba(34,197,94,.35)' },
  adequate: { label: 'Adequate', bg: 'rgba(245,158,11,.12)', fg: '#F59E0B', border: 'rgba(245,158,11,.35)' },
  weak: { label: 'Needs Polish', bg: 'rgba(239,68,68,.12)', fg: '#EF4444', border: 'rgba(239,68,68,.35)' },
};

function verdictStyle(v: string | undefined) {
  return VERDICT_STYLES[v || ''] ?? VERDICT_STYLES.adequate;
}

const STAR_LABELS: { key: 'situation' | 'task' | 'action' | 'result'; label: string }[] = [
  { key: 'situation', label: 'Situation' },
  { key: 'task', label: 'Task' },
  { key: 'action', label: 'Action' },
  { key: 'result', label: 'Result' },
];

export default function AnalysisPage() {
  return (
    <Suspense fallback={null}>
      <AnalysisContent />
    </Suspense>
  );
}

function AnalysisContent() {
  const [animated, setAnimated] = useState(false);
  const [interview, setInterview] = useState<InterviewRecord | null>(null);
  const [loaded, setLoaded] = useState(false);
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [hasVideo, setHasVideo] = useState(false);

  // Practice Again state per question index
  const [activeRetakeIdx, setActiveRetakeIdx] = useState<number | null>(null);
  const [retakeInputs, setRetakeInputs] = useState<Record<number, string>>({});
  const [retakeLoading, setRetakeLoading] = useState<Record<number, boolean>>({});
  const [retakeOutputs, setRetakeOutputs] = useState<Record<number, any>>({});

  useEffect(() => {
    const id = searchParams.get('id');
    const loadRecord = (record: InterviewRecord | null) => {
      setInterview(record);
      setLoaded(true);
      requestAnimationFrame(() => setAnimated(true));
      if (record) {
        getRecording(record.id).then((blob) => setHasVideo(!!blob && blob.size > 0));
      }
    };

    const local = id ? getInterviewById(id) : getLatestInterview();
    if (local) {
      loadRecord(local);
    } else {
      hydrateInterviews()
        .then((all) => loadRecord(id ? all.find((r) => r.id === id || r.dbId === id) ?? null : all[0] ?? null))
        .catch(() => loadRecord(null));
    }
  }, [searchParams]);

  async function handleDownloadVideo() {
    if (!interview) return;
    const blob = await getRecording(interview.id);
    if (!blob) {
      toast('No video recording is available for this interview.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-video-${new Date(interview.date).toISOString().slice(0, 10)}.webm`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast('Interview video downloaded.');
  }

  async function handleRetakeSubmit(idx: number, questionText: string, prevAnswer: string, prevScore: number) {
    const revisedText = retakeInputs[idx]?.trim();
    if (!revisedText) {
      toast('Please write or paste your improved answer before submitting.');
      return;
    }
    if (!interview) return;

    setRetakeLoading((prev) => ({ ...prev, [idx]: true }));
    try {
      const res = await fetch('/api/interview/practice-again', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: questionText,
          previousAnswer: prevAnswer,
          previousScore: prevScore,
          revisedAnswer: revisedText,
          role: interview.role,
        }),
      });

      if (!res.ok) throw new Error('Practice evaluation failed');
      const data = await res.json();

      setRetakeOutputs((prev) => ({ ...prev, [idx]: data }));

      const retakeItem: RetakeResult = {
        question: questionText,
        previousScore: prevScore,
        newScore: data.newScore,
        date: new Date().toISOString(),
        feedback: data.whatImproved || 'Answer evaluated.',
        improvedKeywords: data.improvedKeywords,
      };

      const updated = addRetakeResult(interview.id, idx, retakeItem);
      if (updated) setInterview({ ...updated });

      toast(`Score improved: ${prevScore} → ${data.newScore}/100 (+${data.scoreDelta} pts)!`);
    } catch (err: any) {
      console.error(err);
      toast('Could not evaluate revised answer. Please try again.');
    } finally {
      setRetakeLoading((prev) => ({ ...prev, [idx]: false }));
    }
  }

  if (!loaded) return null;

  if (!interview) {
    return (
      <>
        <div className="app-head">
          <div>
            <h2>Interview analysis</h2>
            <p>No interview reports yet.</p>
          </div>
        </div>
        <div className="widget" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-2)' }}>
            No interview reports yet. Take your first mock interview!
          </p>
          <Link href="/dashboard/interview" className="btn btn-primary">
            <Plus size={18} /> Start mock interview
          </Link>
        </div>
      </>
    );
  }

  const dateStr = new Date(interview.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const mins = Math.round(interview.duration / 60);

  const metrics = [
    { label: 'Communication', value: interview.metrics.communication },
    { label: 'Confidence', value: interview.metrics.confidence },
    { label: 'Clarity', value: interview.metrics.clarity },
    { label: 'Body language', value: interview.metrics.bodyLanguage },
    { label: 'Eye contact', value: interview.metrics.eyeContact },
    { label: 'Appearance', value: interview.metrics.appearance },
    { label: 'Posture', value: interview.metrics.posture },
    { label: 'Technical knowledge', value: interview.metrics.technicalKnowledge },
    { label: 'Problem solving', value: interview.metrics.problemSolving },
    { label: 'Leadership', value: interview.metrics.leadership },
  ];

  const perQuestion = Array.isArray(interview.perQuestion) ? interview.perQuestion : [];
  const highlights = interview.highlights;
  const challengeMoments = highlights?.challengeMoments || [];
  const contradictions = highlights?.contradictions || [];
  const practiceAreas = highlights?.practiceAreas || [];

  const tagLabel = interview.score >= 80
    ? 'Top 15% of candidates'
    : interview.score >= 65
      ? 'Above average'
      : 'Practice recommended';

  const tagColor = interview.score >= 80 ? 'green' : interview.score >= 65 ? 'amber' : 'red';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .feature-banner-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1.25rem;
        }
        .feature-card {
          border-radius: 16px;
          padding: 1.25rem 1.4rem;
          border: 1px solid var(--line);
          background: var(--surface);
          position: relative;
          overflow: hidden;
        }
        .feature-card.strength {
          background: linear-gradient(145deg, rgba(34,197,94,0.06) 0%, rgba(34,197,94,0.01) 100%);
          border-color: rgba(34,197,94,0.3);
        }
        .feature-card.weakness {
          background: linear-gradient(145deg, rgba(239,68,68,0.06) 0%, rgba(239,68,68,0.01) 100%);
          border-color: rgba(239,68,68,0.3);
        }
        .feature-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.76rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 0.25rem 0.65rem;
          border-radius: 999px;
          margin-bottom: 0.8rem;
        }
        .strength .feature-badge { background: rgba(34,197,94,0.15); color: #22C55E; }
        .weakness .feature-badge { background: rgba(239,68,68,0.15); color: #EF4444; }

        .challenge-timeline {
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
          margin-top: 0.8rem;
        }
        .challenge-card {
          background: var(--surface-2, rgba(148,163,184,.05));
          border: 1px solid var(--line);
          border-left: 4px solid var(--blue);
          border-radius: 0 14px 14px 0;
          padding: 1rem 1.2rem;
        }
        .challenge-flow {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.9rem;
          margin-top: 0.6rem;
          font-size: 0.88rem;
        }
        .flow-box {
          background: rgba(0,0,0,0.15);
          padding: 0.75rem;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.04);
        }
        .flow-box b { display: block; font-size: 0.72rem; text-transform: uppercase; color: var(--text-3); margin-bottom: 0.25rem; }

        .practice-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 0.9rem;
          margin-top: 0.8rem;
        }
        .practice-card {
          background: var(--surface-2, rgba(148,163,184,.05));
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 1.1rem 1.2rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .practice-num {
          font-size: 0.78rem;
          font-weight: 800;
          color: var(--blue);
          margin-bottom: 0.35rem;
          text-transform: uppercase;
        }

        .qb-card {
          border: 1px solid var(--border, rgba(148,163,184,.22));
          border-radius: 14px;
          padding: 1.1rem 1.2rem;
          margin-bottom: 1.1rem;
          background: var(--surface-2, rgba(148,163,184,.05));
          transition: border-color 0.2s;
        }
        .qb-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: .8rem;
          margin-bottom: .55rem;
        }
        .qb-q { font-size: 1rem; font-weight: 650; line-height: 1.4; margin: 0; }
        .qb-num { font-size: .72rem; letter-spacing: .06em; text-transform: uppercase; color: var(--text-3); display: block; margin-bottom: .2rem; }
        .qb-badge {
          flex: 0 0 auto;
          font-size: .72rem;
          font-weight: 700;
          letter-spacing: .04em;
          padding: .25rem .65rem;
          border-radius: 999px;
          border: 1px solid transparent;
          white-space: nowrap;
        }
        .qb-summary { font-size: .88rem; color: var(--text-2); margin: 0 0 .8rem; font-style: italic; }
        .qb-cols { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem; margin-bottom: .8rem; }
        .qb-col b { display: block; font-size: .72rem; letter-spacing: .06em; text-transform: uppercase; margin-bottom: .25rem; }
        .qb-col p { margin: 0; font-size: .86rem; color: var(--text-2); line-height: 1.5; }
        .qb-better {
          border-left: 3px solid var(--accent, #6366F1);
          background: rgba(99,102,241,.08);
          border-radius: 0 10px 10px 0;
          padding: .75rem 1rem;
          margin-bottom: 0.8rem;
        }
        .qb-better b { display: block; font-size: .72rem; letter-spacing: .06em; text-transform: uppercase; margin-bottom: .3rem; color: var(--accent, #6366F1); }
        .qb-better p { margin: 0; font-size: .88rem; line-height: 1.55; }
        
        .retake-drawer {
          background: var(--surface);
          border: 1px solid var(--blue);
          border-radius: 12px;
          padding: 1.1rem;
          margin-top: 0.9rem;
          box-shadow: 0 8px 24px -6px rgba(0,163,255,0.15);
        }
        .retake-textarea {
          width: 100%;
          min-height: 90px;
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 0.75rem 0.9rem;
          color: var(--text);
          font-size: 0.9rem;
          line-height: 1.5;
          margin: 0.6rem 0;
          outline: none;
        }
        .retake-textarea:focus { border-color: var(--blue); }
        .retake-result-banner {
          background: linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0.04) 100%);
          border: 1px solid rgba(34,197,94,0.3);
          border-radius: 10px;
          padding: 0.8rem 1rem;
          margin-top: 0.8rem;
        }

        .qb-stars { display: flex; flex-wrap: wrap; gap: .35rem; margin-top: .75rem; }
        .qb-chip {
          font-size: .72rem;
          padding: .18rem .55rem;
          border-radius: 999px;
          border: 1px solid rgba(148,163,184,.3);
          color: var(--text-3);
        }
        .qb-chip.on { border-color: rgba(34,197,94,.4); background: rgba(34,197,94,.12); color: #22C55E; }

        @media (max-width: 768px) {
          .feature-banner-grid { grid-template-columns: 1fr; }
          .challenge-flow { grid-template-columns: 1fr; }
          .qb-cols { grid-template-columns: 1fr; }
        }
      ` }} />

      {/* Header */}
      <div className="app-head">
        <div>
          <h2>Interview Performance & Learning Report</h2>
          <p>{interview.type} &middot; {interview.role} &middot; {dateStr} &middot; {mins} min session</p>
        </div>
        <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={async () => {
            if (!interview) return;
            try {
              const res = await fetch('/api/interview/export-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ interviewData: interview }),
              });
              if (!res.ok) throw new Error('Failed to generate DOCX');
              const blob = await res.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `interview-report-${new Date(interview.date).toISOString().slice(0, 10)}.docx`;
              a.click();
              window.URL.revokeObjectURL(url);
              toast('DOCX Report downloaded');
            } catch (err) {
              console.error(err);
              toast('Error generating report');
            }
          }}>
            <Download size={15} /> Export DOCX
          </button>
          
          <button className="btn btn-ghost btn-sm" onClick={() => {
            const lines: string[] = [];
            lines.push('=== InterviewAce AI - Intelligent Evaluation Report ===');
            lines.push(`Role: ${interview.role} | Score: ${interview.score}/100`);
            if (highlights?.quotedStrength) lines.push(`Biggest Strength: ${highlights.quotedStrength}`);
            if (highlights?.quotedWeakness) lines.push(`Biggest Weakness: ${highlights.quotedWeakness}`);
            downloadFile(lines.join('\n'), `interview-report-${new Date(interview.date).toISOString().slice(0, 10)}.txt`);
            toast('Report downloaded');
          }}>
            <Download size={15} /> Export TXT
          </button>
          {hasVideo && (
            <button className="btn btn-ghost btn-sm" onClick={handleDownloadVideo}>
              <Video size={15} /> Video Recording
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={() => {
            transcriptRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}>
            <FileText size={15} /> View Full Transcript
          </button>
        </div>
      </div>

      {/* ── Key Diagnostic Banners: Biggest Strength & Biggest Weakness ── */}
      <div className="feature-banner-grid">
        <div className="feature-card strength">
          <span className="feature-badge">
            <Sparkles size={14} /> Your Biggest Strength
          </span>
          <p style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--text)', margin: '0 0 0.4rem' }}>
            {highlights?.quotedStrength ? highlights.quotedStrength : interview.feedback.strengths}
          </p>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>
            This demonstrated clear subject knowledge and structured delivery.
          </span>
        </div>

        <div className="feature-card weakness">
          <span className="feature-badge">
            <AlertTriangle size={14} /> Critical Growth Area
          </span>
          <p style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--text)', margin: '0 0 0.4rem' }}>
            {highlights?.quotedWeakness ? highlights.quotedWeakness : interview.feedback.improvements}
          </p>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>
            Lacked quantifiable metrics or took too long to reach the core result.
          </span>
        </div>
      </div>

      {/* Score hero */}
      <div className="widget" style={{ marginBottom: '1.25rem' }}>
        <div className="score-hero">
          <div
            className="big-ring"
            style={{ '--p': interview.score } as React.CSSProperties}
          >
            <div>
              <b>{interview.score}</b>
              <small>OVERALL / 100</small>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '1.18rem', marginBottom: '.4rem' }}>
              {interview.score >= 80 ? 'Exceptional Performance' : interview.score >= 65 ? 'Competitive Candidate' : 'Coaching Recommended'}
            </h3>
            <p style={{ color: 'var(--text-2)', fontSize: '.92rem', marginBottom: '.6rem', lineHeight: 1.5 }}>
              {interview.feedback.nextStep}
            </p>
            <span className={`tag ${tagColor}`}>{tagLabel}</span>
          </div>
        </div>

        <div className="metric-grid">
          {metrics.map((m) => {
            const color = colorForValue(m.value);
            return (
              <div className="m-card" key={m.label}>
                <div className={`v ${color === 'green' ? 'up' : ''}`} style={color === 'amber' ? { color: '#F59E0B' } : color === 'red' ? { color: '#EF4444' } : undefined}>
                  {m.value.toFixed(1)}
                </div>
                <div className="l">{m.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section: Where You Were Challenged ── */}
      {challengeMoments.length > 0 && (
        <div className="widget" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Flame size={18} color="var(--blue)" />
            <h4 style={{ margin: 0, fontSize: '1.05rem' }}>Where You Were Challenged</h4>
          </div>
          <p style={{ color: 'var(--text-3)', fontSize: '0.86rem', margin: '0 0 0.8rem' }}>
            The AI interviewer detected key claims and probed deeper with counter-questions.
          </p>

          <div className="challenge-timeline">
            {challengeMoments.map((cm, idx) => (
              <div className="challenge-card" key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <b style={{ fontSize: '0.92rem', color: 'var(--text)' }}>Probe #{idx + 1}: {cm.question}</b>
                </div>
                <div className="challenge-flow">
                  <div className="flow-box">
                    <b>Your Initial Claim</b>
                    <p style={{ margin: 0, color: 'var(--text-2)' }}>&ldquo;{cm.candidateAnswer}&rdquo;</p>
                  </div>
                  <div className="flow-box" style={{ borderColor: 'rgba(59,130,246,0.3)' }}>
                    <b style={{ color: 'var(--blue)' }}>Interviewer Follow-Up Question</b>
                    <p style={{ margin: 0, color: 'var(--text)' }}>&ldquo;{cm.followUp}&rdquo;</p>
                  </div>
                </div>
                {cm.whatWasMissing && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', marginTop: 8, marginBottom: 0 }}>
                    💡 <strong style={{ color: 'var(--text-2)' }}>Key Takeaway:</strong> {cm.whatWasMissing}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Section: Contradictions Flagged ── */}
      {contradictions.length > 0 && (
        <div className="widget" style={{ marginBottom: '1.25rem', borderColor: 'rgba(239,68,68,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <AlertTriangle size={18} color="#EF4444" />
            <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#EF4444' }}>Contradictions Detected</h4>
          </div>
          <p style={{ color: 'var(--text-3)', fontSize: '0.86rem', margin: '0 0 0.8rem' }}>
            Statements that conflicted across different parts of the conversation.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {contradictions.map((ct, idx) => (
              <div key={idx} style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', padding: '0.85rem 1rem', borderRadius: 10 }}>
                <p style={{ margin: '0 0 4px', fontSize: '0.86rem', color: 'var(--text)' }}>
                  <strong>Statement A:</strong> &ldquo;{ct.earlierStatement}&rdquo;
                </p>
                <p style={{ margin: '0 0 6px', fontSize: '0.86rem', color: 'var(--text)' }}>
                  <strong>Statement B:</strong> &ldquo;{ct.laterStatement}&rdquo;
                </p>
                <span style={{ fontSize: '0.82rem', color: '#EF4444' }}>{ct.explanation}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Section: Practice These 3 Things ── */}
      {practiceAreas.length > 0 && (
        <div className="widget" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Target size={18} color="var(--blue)" />
            <h4 style={{ margin: 0, fontSize: '1.05rem' }}>Practice These 3 Things</h4>
          </div>
          <p style={{ color: 'var(--text-3)', fontSize: '0.86rem', margin: '0 0 0.8rem' }}>
            Your highest-ROI focus areas before your next real interview.
          </p>

          <div className="practice-grid">
            {practiceAreas.map((pa, idx) => (
              <div className="practice-card" key={idx}>
                <div>
                  <div className="practice-num">Priority #0{idx + 1}</div>
                  <h5 style={{ margin: '0 0 0.35rem', fontSize: '0.98rem', fontWeight: 700 }}>{pa.title}</h5>
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-2)', lineHeight: 1.5, margin: '0 0 0.75rem' }}>
                    {pa.description}
                  </p>
                </div>
                <div style={{ borderTop: '1px solid var(--line)', paddingTop: '0.6rem', fontSize: '0.82rem', color: 'var(--blue)', fontWeight: 600 }}>
                  👉 {pa.actionItem}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Question-by-question breakdown with "Practice This Again" Interactive Engine ── */}
      {perQuestion.length > 0 && (
        <div className="widget" style={{ marginTop: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Question-by-Question Deep Dive &amp; Retake</h4>
              <p style={{ color: 'var(--text-3)', fontSize: '.86rem', margin: '.2rem 0 0' }}>
                Review individual scores, read stronger rewrites, and practice weak answers again to build mastery.
              </p>
            </div>
          </div>

          <div style={{ marginTop: '1.1rem' }}>
            {perQuestion.map((pq, i) => {
              const vs = verdictStyle(pq.verdict);
              const isRetakeOpen = activeRetakeIdx === i;
              const retakeOut = retakeOutputs[i];
              const isLoading = !!retakeLoading[i];
              const itemScore = pq.score || (pq.verdict === 'strong' ? 85 : pq.verdict === 'adequate' ? 68 : 45);

              return (
                <div className="qb-card" key={`${i}-${pq.question.slice(0, 16)}`}>
                  <div className="qb-head">
                    <div>
                      <span className="qb-num">Question {i + 1} &middot; Score {itemScore}/100</span>
                      <p className="qb-q">{pq.question}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        className="qb-badge"
                        style={{ background: vs.bg, color: vs.fg, borderColor: vs.border }}
                      >
                        {vs.label}
                      </span>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setActiveRetakeIdx(isRetakeOpen ? null : i)}
                        style={{
                          fontSize: '0.78rem',
                          padding: '0.3rem 0.75rem',
                          background: isRetakeOpen ? 'var(--blue)' : 'rgba(59,130,246,0.1)',
                          color: isRetakeOpen ? '#fff' : 'var(--blue)',
                          borderColor: 'rgba(59,130,246,0.3)',
                        }}
                      >
                        <RefreshCw size={13} style={{ marginRight: 4 }} />
                        {isRetakeOpen ? 'Close Practice' : 'Practice This Again'}
                      </button>
                    </div>
                  </div>

                  {pq.answerSummary && <p className="qb-summary">{pq.answerSummary}</p>}

                  <div className="qb-cols">
                    {pq.whatWorked && (
                      <div className="qb-col">
                        <b style={{ color: '#22C55E' }}>What worked</b>
                        <p>{pq.whatWorked}</p>
                      </div>
                    )}
                    {pq.whatWasMissing && (
                      <div className="qb-col">
                        <b style={{ color: '#F59E0B' }}>What was missing</b>
                        <p>{pq.whatWasMissing}</p>
                      </div>
                    )}
                  </div>

                  {pq.betterAnswer && (
                    <div className="qb-better">
                      <b>Stronger Model Answer</b>
                      <p>{pq.betterAnswer}</p>
                    </div>
                  )}

                  {pq.starCoverage && (
                    <div className="qb-stars">
                      {STAR_LABELS.map((s) => (
                        <span
                          className={`qb-chip${pq.starCoverage?.[s.key] ? ' on' : ''}`}
                          key={s.key}
                        >
                          {pq.starCoverage?.[s.key] ? '✓' : '✗'} {s.label}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* ── Interactive "Practice This Again" Drawer ── */}
                  {isRetakeOpen && (
                    <div className="retake-drawer">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <b style={{ fontSize: '0.9rem', color: 'var(--blue)' }}>
                          🔁 Retake: Practice Your Answer Again
                        </b>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
                          Original Score: {itemScore}/100
                        </span>
                      </div>
                      <p style={{ fontSize: '0.84rem', color: 'var(--text-2)', margin: 0 }}>
                        Reframe your response with STAR structure, concrete numbers, and direct ownership.
                      </p>

                      <textarea
                        className="retake-textarea"
                        placeholder="Type your revised, stronger answer here (e.g., In my role at..., I was tasked with..., so I personally built... which led to 35% growth)..."
                        value={retakeInputs[i] || ''}
                        onChange={(e) => setRetakeInputs({ ...retakeInputs, [i]: e.target.value })}
                      />

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={isLoading}
                          onClick={() => handleRetakeSubmit(i, pq.question, pq.answerSummary, itemScore)}
                          style={{ minWidth: 160 }}
                        >
                          {isLoading ? (
                            <>Evaluating...</>
                          ) : (
                            <>
                              <TrendingUp size={14} style={{ marginRight: 6 }} /> Submit Revised Answer
                            </>
                          )}
                        </button>
                      </div>

                      {retakeOut && (
                        <div className="retake-result-banner">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <strong style={{ color: '#22C55E', fontSize: '0.94rem' }}>
                              🎉 Score Progression: {retakeOut.previousScore}/100 → {retakeOut.newScore}/100 (+{retakeOut.scoreDelta} pts)
                            </strong>
                            <span className="qb-badge" style={{ background: verdictStyle(retakeOut.verdict).bg, color: verdictStyle(retakeOut.verdict).fg }}>
                              {verdictStyle(retakeOut.verdict).label}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.86rem', color: 'var(--text)', margin: '0 0 4px', lineHeight: 1.5 }}>
                            {retakeOut.whatImproved}
                          </p>
                          {retakeOut.whatStillNeedsWork && (
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', margin: 0 }}>
                              💡 <em>Next Polish:</em> {retakeOut.whatStillNeedsWork}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transcript section */}
      {interview.transcript.length > 0 && (
        <div className="widget" style={{ marginTop: '1.25rem' }} ref={transcriptRef}>
          <h4>Full Conversation Transcript</h4>
          <div style={{ maxHeight: '380px', overflowY: 'auto', fontSize: '.88rem', marginTop: '0.8rem', paddingRight: '0.5rem' }}>
            {interview.transcript.map((msg, i) => (
              <div key={i} style={{ marginBottom: '.75rem', padding: '0.6rem 0.8rem', borderRadius: 8, background: msg.who === 'ai' ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.02)' }}>
                <b style={{ color: msg.who === 'ai' ? 'var(--blue)' : 'var(--accent)', display: 'block', marginBottom: 2 }}>
                  {msg.who === 'ai' ? 'Interviewer' : 'You'}:
                </b>{' '}
                <span style={{ color: 'var(--text)', lineHeight: 1.5 }}>{msg.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

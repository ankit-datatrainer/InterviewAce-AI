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
  RefreshCw,
  TrendingUp,
  Target,
  Timer,
  MessageCircleMore,
  ShieldCheck,
  CalendarDays,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { useToast } from '@/components/Toast';
import {
  getInterviewById,
  getLatestInterview,
  hydrateInterviews,
  addRetakeResult,
  pairTranscript,
  getInterviews,
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

function formatTimestamp(totalSeconds: number | undefined): string {
  if (typeof totalSeconds !== 'number' || totalSeconds < 0) return '';
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
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

interface PracticeAgainResult {
  newScore: number;
  previousScore: number;
  scoreDelta: number;
  verdict: 'strong' | 'adequate' | 'weak';
  whatImproved: string;
  whatStillNeedsWork: string;
  improvedKeywords?: string[];
  comparison?: { status: 'improved' | 'stable' | 'weaker'; explanation: string };
  evidenceAdded?: string[];
  frameworkAssessment?: { preservedFacts: string[]; placeholdersNeeded: string[]; guidance: string };
  nextPracticeQuestion?: string;
}

type ExtendedHighlights = NonNullable<InterviewRecord['highlights']> & {
  rubric?: {
    id: string;
    version: string;
    role: string;
    difficulty: string;
    dimensions: { key: string; label: string; weight: number; description: string }[];
    excludedSignals: string[];
  };
  readiness?: { label: string; explanation: string; evidenceBasis: string; limitation: string };
  uncertainty?: { level: 'low' | 'medium' | 'high'; explanation: string; missingEvidence: string[] };
  moments?: { level: 'strong' | 'improve' | 'critical'; title: string; summary: string; evidence: string; timestampSeconds?: number; transcriptIndex: number; questionIndex: number }[];
  verificationItems?: { type: string; label: string; evidence: string; guidance: string; timestampSeconds?: number; transcriptIndex: number }[];
  topStrengths?: { title: string; evidence: string; whyItMatters: string }[];
  topImprovements?: { title: string; evidence: string; action: string }[];
  sevenDayPlan?: { day: number; focus: string; exercise: string; successMeasure: string; practiceQuestion?: string }[];
};

type ExtendedQuestionFeedback = NonNullable<InterviewRecord['perQuestion']>[number] & {
  competency?: string;
  evidence?: string;
  uncertainty?: string;
  timestampSeconds?: number;
  transcriptIndex?: number;
};

const PRODUCT_EVENT_KEY = 'interviewace_product_events';

function recordProductEvent(name: string, interviewId: string, metadata: Record<string, string | number | boolean> = {}) {
  try {
    const raw = localStorage.getItem(PRODUCT_EVENT_KEY);
    const events = raw ? JSON.parse(raw) as unknown : [];
    const safeEvents = Array.isArray(events) ? events.slice(-199) : [];
    safeEvents.push({ name, interviewId, timestamp: new Date().toISOString(), metadata });
    localStorage.setItem(PRODUCT_EVENT_KEY, JSON.stringify(safeEvents));
  } catch {
    // Product feedback is best-effort and must never block the report.
  }
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={null}>
      <AnalysisContent />
    </Suspense>
  );
}

function AnalysisContent() {
  const [interview, setInterview] = useState<InterviewRecord | null>(null);
  const [loaded, setLoaded] = useState(false);
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const transcriptRef = useRef<HTMLDivElement>(null);
  const transcriptItemRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const loggedReportViews = useRef(new Set<string>());
  const [hasVideo, setHasVideo] = useState(false);
  const [history, setHistory] = useState<InterviewRecord[]>([]);
  const [focusedTranscriptIndex, setFocusedTranscriptIndex] = useState<number | null>(null);
  const [usefulness, setUsefulness] = useState<'helpful' | 'not_helpful' | null>(null);
  const [trainingPreference, setTrainingPreference] = useState<'here' | 'usual' | 'unsure' | null>(null);

  // Practice Again state per question index
  const [activeRetakeIdx, setActiveRetakeIdx] = useState<number | null>(null);
  const [retakeInputs, setRetakeInputs] = useState<Record<number, string>>({});
  const [retakeLoading, setRetakeLoading] = useState<Record<number, boolean>>({});
  const [retakeOutputs, setRetakeOutputs] = useState<Record<number, PracticeAgainResult>>({});

  useEffect(() => {
    const id = searchParams.get('id');
    const loadRecord = (record: InterviewRecord | null) => {
      setInterview(record);
      setLoaded(true);
      if (record) {
        getRecording(record.id).then((blob) => setHasVideo(!!blob && blob.size > 0));
      }
    };

    const cached = getInterviews();
    setHistory(cached);
    const local = id ? getInterviewById(id) : getLatestInterview();
    if (local) {
      loadRecord(local);
    }
    hydrateInterviews()
      .then((all) => {
        setHistory(all);
        if (!local) loadRecord(id ? all.find((r) => r.id === id || r.dbId === id) ?? null : all[0] ?? null);
      })
      .catch(() => { if (!local) loadRecord(null); });
  }, [searchParams]);

  useEffect(() => {
    if (!interview || loggedReportViews.current.has(interview.id)) return;
    loggedReportViews.current.add(interview.id);
    recordProductEvent('report_view', interview.id, { role: interview.role, score: interview.score });
  }, [interview]);

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
      recordProductEvent('practice_again', interview.id, {
        questionIndex: idx,
        previousScore: prevScore,
        newScore: data.newScore,
        scoreDelta: data.scoreDelta,
      });

      toast(data.scoreDelta > 0
        ? `Score improved: ${prevScore} → ${data.newScore}/100 (+${data.scoreDelta} pts)!`
        : `This attempt scored ${data.newScore}/100. Review the remaining gap and try once more.`);
    } catch (err: unknown) {
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

  const metricRecord = interview.metrics as unknown as Record<string, number>;
  const metricValue = (primary: string, fallback: string) => {
    const value = metricRecord[primary] ?? metricRecord[fallback] ?? 0;
    return Number.isFinite(value) ? value : 0;
  };
  const metrics = [
    { key: 'communication', label: 'Communication', value: metricValue('communication', 'communication') },
    { key: 'answerStructure', label: 'Answer structure', value: metricValue('answerStructure', 'clarity') },
    { key: 'roleKnowledge', label: 'Role knowledge', value: metricValue('roleKnowledge', 'technicalKnowledge') },
    { key: 'problemSolving', label: 'Problem solving', value: metricValue('problemSolving', 'problemSolving') },
    { key: 'evidenceQuality', label: 'Evidence quality', value: metricValue('evidenceQuality', 'technicalKnowledge') },
    { key: 'roleFit', label: 'Role fit', value: metricValue('roleFit', 'leadership') },
  ];

  const perQuestion = (Array.isArray(interview.perQuestion) ? interview.perQuestion : []) as ExtendedQuestionFeedback[];
  const highlights = interview.highlights as ExtendedHighlights | undefined;
  const challengeMoments = highlights?.challengeMoments || [];
  const contradictions = highlights?.contradictions || [];
  const practiceAreas = highlights?.practiceAreas || [];
  const reportMoments = highlights?.moments || [];
  const verificationItems = highlights?.verificationItems || [];
  const topStrengths = highlights?.topStrengths || [];
  const topImprovements = highlights?.topImprovements || [];
  const sevenDayPlan = highlights?.sevenDayPlan || [];
  const answeredPairs = pairTranscript(interview.transcript);
  const performance = interview.performance;
  const priorAttempt = [...history]
    .filter((item) => item.id !== interview.id && item.role.toLowerCase() === interview.role.toLowerCase() && new Date(item.date).getTime() < new Date(interview.date).getTime())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  const priorDelta = priorAttempt ? interview.score - priorAttempt.score : null;
  const challengeTimestamp = (followUp: string, stored?: string) => {
    if (stored) return stored;
    const message = interview.transcript.find((item) => item.who === 'ai' && item.text === followUp);
    return formatTimestamp(message?.timestampSeconds);
  };

  const jumpToTranscript = (index: number) => {
    transcriptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setFocusedTranscriptIndex(index);
    window.setTimeout(() => transcriptItemRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250);
    window.setTimeout(() => setFocusedTranscriptIndex((current) => current === index ? null : current), 2400);
  };

  const submitProductFeedback = (kind: 'usefulness' | 'wrti', value: string) => {
    if (kind === 'usefulness') setUsefulness(value as 'helpful' | 'not_helpful');
    else setTrainingPreference(value as 'here' | 'usual' | 'unsure');
    recordProductEvent(kind === 'usefulness' ? 'report_usefulness' : 'would_rather_train_here', interview.id, { value });
    toast('Thanks - your feedback was recorded.');
  };

  const tagLabel = highlights?.readiness?.label || (interview.score >= 80
    ? 'Strong practice performance'
    : interview.score >= 65
      ? 'Nearly ready'
      : 'Practice recommended');

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

        .mri-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: .85rem; }
        .mri-card { border: 1px solid var(--line); border-radius: 12px; padding: 1rem; background: var(--surface-2, rgba(148,163,184,.05)); }
        .moment-card { display: flex; justify-content: space-between; gap: 1rem; border: 1px solid var(--line); border-left-width: 4px; border-radius: 0 12px 12px 0; padding: .9rem 1rem; margin-top: .7rem; }
        .moment-card.strong { border-left-color: #22C55E; }
        .moment-card.improve { border-left-color: #F59E0B; }
        .moment-card.critical { border-left-color: #EF4444; }
        .plan-row { display: grid; grid-template-columns: 54px 1fr; gap: .8rem; padding: .85rem 0; border-bottom: 1px solid var(--line); }
        .plan-row:last-child { border-bottom: 0; }
        .feedback-choice { border: 1px solid var(--line); background: transparent; color: var(--text-2); border-radius: 999px; padding: .4rem .75rem; cursor: pointer; }
        .feedback-choice.selected { border-color: var(--blue); color: var(--blue); background: rgba(59,130,246,.1); }

        @media (max-width: 768px) {
          .feature-banner-grid { grid-template-columns: 1fr; }
          .challenge-flow { grid-template-columns: 1fr; }
          .qb-cols { grid-template-columns: 1fr; }
          .moment-card { flex-direction: column; }
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
            if (highlights?.rubric) lines.push(`Rubric: ${highlights.rubric.id} v${highlights.rubric.version}`);
            if (highlights?.readiness) lines.push(`Readiness: ${highlights.readiness.label} - ${highlights.readiness.explanation}`);
            if (highlights?.uncertainty) lines.push(`Uncertainty: ${highlights.uncertainty.level} - ${highlights.uncertainty.explanation}`);
            if (highlights?.quotedStrength) lines.push(`Biggest Strength: ${highlights.quotedStrength}`);
            if (highlights?.quotedWeakness) lines.push(`Biggest Weakness: ${highlights.quotedWeakness}`);
            if (interview.performance?.averageResponseLatencyMs) {
              lines.push(`Average Response Latency: ${(interview.performance.averageResponseLatencyMs / 1000).toFixed(1)} seconds`);
            }
            challengeMoments.forEach((moment, index) => {
              lines.push(`Challenged #${index + 1}: ${moment.followUp} | Missing: ${moment.whatWasMissing}`);
            });
            contradictions.forEach((item, index) => {
              lines.push(`Contradiction #${index + 1}: ${item.earlierStatement} <> ${item.laterStatement}`);
            });
            practiceAreas.forEach((area, index) => {
              lines.push(`Practice ${index + 1}: ${area.title} — ${area.actionItem}`);
            });
            topStrengths.forEach((item, index) => lines.push(`Top Strength ${index + 1}: ${item.title} | ${item.evidence}`));
            topImprovements.forEach((item, index) => lines.push(`Top Improvement ${index + 1}: ${item.title} | ${item.action}`));
            sevenDayPlan.forEach((item) => lines.push(`Day ${item.day}: ${item.focus} | ${item.exercise} | Success: ${item.successMeasure}`));
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

      {(highlights?.readiness || highlights?.rubric || highlights?.uncertainty) && (
        <div className="widget" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <ShieldCheck size={18} color="var(--blue)" />
            <h4 style={{ margin: 0 }}>Readiness, Evidence &amp; Limits</h4>
          </div>
          <div className="mri-grid">
            {highlights.readiness && (
              <div className="mri-card">
                <b style={{ display: 'block', marginBottom: 5 }}>{highlights.readiness.label}</b>
                <p style={{ margin: '0 0 7px', color: 'var(--text-2)', fontSize: '.88rem', lineHeight: 1.5 }}>{highlights.readiness.explanation}</p>
                <small style={{ color: 'var(--text-3)' }}>{highlights.readiness.evidenceBasis}</small>
              </div>
            )}
            {highlights.uncertainty && (
              <div className="mri-card">
                <b style={{ display: 'block', marginBottom: 5 }}>Assessment uncertainty: {highlights.uncertainty.level}</b>
                <p style={{ margin: 0, color: 'var(--text-2)', fontSize: '.88rem', lineHeight: 1.5 }}>{highlights.uncertainty.explanation}</p>
              </div>
            )}
            {highlights.rubric && (
              <div className="mri-card">
                <b style={{ display: 'block', marginBottom: 5 }}>Role-specific rubric v{highlights.rubric.version}</b>
                <p style={{ margin: '0 0 7px', color: 'var(--text-2)', fontSize: '.88rem' }}>{highlights.rubric.role} &middot; {highlights.rubric.difficulty}</p>
                <small style={{ color: 'var(--text-3)' }}>Not scored: personality, face, emotion, eye contact, appearance, posture or accent.</small>
              </div>
            )}
          </div>
          {highlights.readiness?.limitation && (
            <p style={{ margin: '10px 0 0', color: 'var(--text-3)', fontSize: '.78rem' }}>{highlights.readiness.limitation}</p>
          )}
        </div>
      )}

      {priorAttempt && (
        <div className="widget" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <BarChart3 size={18} color="var(--blue)" />
            <h4 style={{ margin: 0 }}>Compared with Your Prior {interview.role} Attempt</h4>
          </div>
          <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.5 }}>
            Previous: <strong>{priorAttempt.score}/100</strong> on {new Date(priorAttempt.date).toLocaleDateString()} &middot; Current: <strong>{interview.score}/100</strong> &middot;{' '}
            <strong style={{ color: priorDelta !== null && priorDelta > 0 ? '#22C55E' : priorDelta !== null && priorDelta < 0 ? '#EF4444' : '#F59E0B' }}>
              {priorDelta !== null && priorDelta > 0 ? '+' : ''}{priorDelta} points ({priorDelta !== null && priorDelta > 2 ? 'improving' : priorDelta !== null && priorDelta < -2 ? 'needs review' : 'stable'})
            </strong>
          </p>
          <small style={{ color: 'var(--text-3)' }}>This compares attempts for the same role; it is not a comparison with other candidates.</small>
        </div>
      )}

      {performance && (
        <div className="widget" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Timer size={18} color="var(--blue)" />
            <h4 style={{ margin: 0, fontSize: '1.05rem' }}>Conversation Responsiveness</h4>
          </div>
          <div className="metric-grid">
            <div className="m-card">
              <div className="v up">
                {performance.averageResponseLatencyMs > 0
                  ? `${(performance.averageResponseLatencyMs / 1000).toFixed(1)}s`
                  : '—'}
              </div>
              <div className="l">Average answer-to-voice latency</div>
            </div>
            <div className="m-card">
              <div className="v" style={{ color: 'var(--blue)' }}>{performance.responseLatenciesMs.length}</div>
              <div className="l">Responses measured</div>
            </div>
            <div className="m-card">
              <div className="v" style={{ color: 'var(--blue)' }}>{performance.candidateInterruptions}</div>
              <div className="l">Interruptions recovered</div>
            </div>
            <div className="m-card">
              <div className="v" style={{ color: 'var(--blue)' }}>{performance.interviewerRedirects}</div>
              <div className="l">Long answers redirected</div>
            </div>
          </div>
        </div>
      )}

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
              {highlights?.readiness?.label || (interview.score >= 80 ? 'Strong Practice Performance' : interview.score >= 65 ? 'Nearly Ready' : 'Coaching Recommended')}
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
                {highlights?.rubric?.dimensions.find((dimension) => dimension.key === m.key) && (
                  <small style={{ color: 'var(--text-3)' }}>
                    {Math.round((highlights.rubric.dimensions.find((dimension) => dimension.key === m.key)?.weight || 0) * 100)}% weight
                  </small>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {reportMoments.length > 0 && (
        <div className="widget" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Timer size={18} color="var(--blue)" />
            <h4 style={{ margin: 0 }}>Interview MRI: Key Moments</h4>
          </div>
          <p style={{ color: 'var(--text-3)', fontSize: '.86rem', margin: '.3rem 0 .7rem' }}>
            Strong, Improve and Critical moments are anchored to the candidate transcript. Select a time to jump to the evidence.
          </p>
          {reportMoments.map((moment, index) => (
            <div className={`moment-card ${moment.level}`} key={`${moment.transcriptIndex}-${index}`}>
              <div>
                <b style={{ textTransform: 'capitalize' }}>{moment.title}</b>
                <p style={{ margin: '.25rem 0', color: 'var(--text-2)', fontSize: '.87rem', lineHeight: 1.5 }}>{moment.summary}</p>
                <small style={{ color: 'var(--text-3)' }}>&ldquo;{moment.evidence}&rdquo;</small>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => jumpToTranscript(moment.transcriptIndex)} style={{ whiteSpace: 'nowrap', alignSelf: 'start' }}>
                {formatTimestamp(moment.timestampSeconds) || 'Transcript'}
              </button>
            </div>
          ))}
        </div>
      )}

      {(topStrengths.length > 0 || topImprovements.length > 0) && (
        <div className="feature-banner-grid">
          <div className="widget">
            <h4 style={{ margin: '0 0 .8rem' }}>Top 3 Strengths</h4>
            {topStrengths.slice(0, 3).map((item, index) => (
              <div key={`${item.title}-${index}`} style={{ marginBottom: '.8rem' }}>
                <b style={{ color: '#22C55E', fontSize: '.88rem' }}>{index + 1}. {item.title}</b>
                <p style={{ margin: '.2rem 0', color: 'var(--text-2)', fontSize: '.84rem' }}>{item.whyItMatters}</p>
                <small style={{ color: 'var(--text-3)' }}>{item.evidence}</small>
              </div>
            ))}
          </div>
          <div className="widget">
            <h4 style={{ margin: '0 0 .8rem' }}>Top 3 Highest-Impact Improvements</h4>
            {topImprovements.slice(0, 3).map((item, index) => (
              <div key={`${item.title}-${index}`} style={{ marginBottom: '.8rem' }}>
                <b style={{ color: '#F59E0B', fontSize: '.88rem' }}>{index + 1}. {item.title}</b>
                <p style={{ margin: '.2rem 0', color: 'var(--text-2)', fontSize: '.84rem' }}>{item.action}</p>
                <small style={{ color: 'var(--text-3)' }}>{item.evidence}</small>
              </div>
            ))}
          </div>
        </div>
      )}

      {verificationItems.length > 0 && (
        <div className="widget" style={{ marginBottom: '1.25rem', borderColor: 'rgba(245,158,11,.35)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} color="#F59E0B" />
            <h4 style={{ margin: 0 }}>Items to Verify</h4>
          </div>
          <p style={{ color: 'var(--text-3)', fontSize: '.86rem', margin: '.3rem 0 .8rem' }}>
            These are unsupported or inconsistent transcript claims to clarify, not accusations.
          </p>
          {verificationItems.map((item, index) => (
            <div className="mri-card" key={`${item.label}-${index}`} style={{ marginTop: '.65rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <b>{item.label}</b>
                <button className="btn btn-ghost btn-sm" onClick={() => jumpToTranscript(item.transcriptIndex)}>
                  {formatTimestamp(item.timestampSeconds) || 'View evidence'}
                </button>
              </div>
              <p style={{ margin: '.35rem 0', color: 'var(--text-2)', fontSize: '.86rem' }}>&ldquo;{item.evidence}&rdquo;</p>
              <small style={{ color: 'var(--text-3)' }}>{item.guidance}</small>
            </div>
          ))}
        </div>
      )}

      {sevenDayPlan.length > 0 && (
        <div className="widget" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarDays size={18} color="var(--blue)" />
            <h4 style={{ margin: 0 }}>Your Personalized 7-Day Plan</h4>
          </div>
          <p style={{ color: 'var(--text-3)', fontSize: '.86rem', margin: '.3rem 0 .6rem' }}>Built from your three lowest rubric dimensions and weak questions.</p>
          {sevenDayPlan.map((item) => (
            <div className="plan-row" key={item.day}>
              <div className="practice-num">Day {item.day}</div>
              <div>
                <b>{item.focus}</b>
                <p style={{ margin: '.2rem 0', color: 'var(--text-2)', fontSize: '.86rem' }}>{item.exercise}</p>
                {item.practiceQuestion && <small style={{ display: 'block', color: 'var(--blue)', marginBottom: 3 }}>Practice: {item.practiceQuestion}</small>}
                <small style={{ color: 'var(--text-3)' }}>Success: {item.successMeasure}</small>
              </div>
            </div>
          ))}
        </div>
      )}

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
                  {challengeTimestamp(cm.followUp, cm.timestamp) && (
                    <span style={{ fontSize: '0.78rem', color: 'var(--blue)', fontWeight: 700 }}>
                      {challengeTimestamp(cm.followUp, cm.timestamp)}
                    </span>
                  )}
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
            <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#EF4444' }}>Statements to Reconcile</h4>
          </div>
          <p style={{ color: 'var(--text-3)', fontSize: '0.86rem', margin: '0 0 0.8rem' }}>
            Possible differences in scope or timeframe to verify before drawing a conclusion.
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
                        {isRetakeOpen ? 'Close Practice' : pq.verdict === 'weak' ? 'Practice This Weak Area' : 'Practice This Again'}
                      </button>
                    </div>
                  </div>

                  {pq.answerSummary && <p className="qb-summary">{pq.answerSummary}</p>}
                  {(pq.evidence || pq.uncertainty) && (
                    <div style={{ fontSize: '.8rem', color: 'var(--text-3)', marginBottom: '.75rem' }}>
                      {pq.evidence && <span>Evidence: &ldquo;{pq.evidence}&rdquo;</span>}
                      {pq.uncertainty && <span style={{ display: 'block', marginTop: 3 }}>{pq.uncertainty}</span>}
                      {typeof pq.transcriptIndex === 'number' && (
                        <button className="feedback-choice" onClick={() => jumpToTranscript(pq.transcriptIndex!)} style={{ marginTop: 6 }}>
                          Jump to {formatTimestamp(pq.timestampSeconds) || 'transcript'}
                        </button>
                      )}
                    </div>
                  )}

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
                      <b>Honest Answer Framework</b>
                      <p>{pq.betterAnswer}</p>
                      <small style={{ display: 'block', marginTop: 5, color: 'var(--text-3)' }}>Use only real details you can defend; placeholders are intentional.</small>
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
                          onClick={() => handleRetakeSubmit(i, pq.question, answeredPairs[i]?.answer || pq.answerSummary, itemScore)}
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
                            <strong style={{ color: retakeOut.scoreDelta > 0 ? '#22C55E' : '#F59E0B', fontSize: '0.94rem' }}>
                              {retakeOut.scoreDelta > 0 ? '🎉 Score Progression' : 'Keep Practicing'}: {retakeOut.previousScore}/100 → {retakeOut.newScore}/100 ({retakeOut.scoreDelta > 0 ? '+' : ''}{retakeOut.scoreDelta} pts)
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
                          {retakeOut.comparison && (
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', margin: '5px 0 0' }}>
                              <strong>Compared with prior answer:</strong> {retakeOut.comparison.explanation}
                            </p>
                          )}
                          {retakeOut.frameworkAssessment && (
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', margin: '5px 0 0' }}>
                              <strong>Truth check:</strong> {retakeOut.frameworkAssessment.guidance}
                              {retakeOut.frameworkAssessment.placeholdersNeeded.length > 0 ? ` Still add: ${retakeOut.frameworkAssessment.placeholdersNeeded.join(', ')}.` : ''}
                            </p>
                          )}
                          {retakeOut.nextPracticeQuestion && (
                            <p style={{ fontSize: '0.82rem', color: 'var(--blue)', margin: '5px 0 0' }}>
                              <strong>Next variation:</strong> {retakeOut.nextPracticeQuestion}
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

      <div className="widget" style={{ marginTop: '1.25rem' }}>
        <h4 style={{ margin: '0 0 .3rem' }}>Was this report useful?</h4>
        <p style={{ color: 'var(--text-3)', fontSize: '.84rem', margin: '0 0 .7rem' }}>This lightweight feedback helps improve report usefulness and the training loop.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1rem' }}>
          <button className={`feedback-choice${usefulness === 'helpful' ? ' selected' : ''}`} onClick={() => submitProductFeedback('usefulness', 'helpful')}>
            <ThumbsUp size={13} style={{ marginRight: 5 }} /> Helpful
          </button>
          <button className={`feedback-choice${usefulness === 'not_helpful' ? ' selected' : ''}`} onClick={() => submitProductFeedback('usefulness', 'not_helpful')}>
            <ThumbsDown size={13} style={{ marginRight: 5 }} /> Not yet
          </button>
        </div>
        <h4 style={{ margin: '0 0 .5rem', fontSize: '.94rem' }}>Would you rather train here than with your usual practice method?</h4>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {([['here', 'Yes, here'], ['usual', 'My usual method'], ['unsure', 'Not sure yet']] as const).map(([value, label]) => (
            <button key={value} className={`feedback-choice${trainingPreference === value ? ' selected' : ''}`} onClick={() => submitProductFeedback('wrti', value)}>{label}</button>
          ))}
        </div>
        <small style={{ display: 'block', color: 'var(--text-3)', marginTop: 8 }}>Only your selection, report ID and time are stored locally; transcript content is not included.</small>
      </div>

      {/* Transcript section */}
      {interview.transcript.length > 0 && (
        <div className="widget" style={{ marginTop: '1.25rem' }} ref={transcriptRef}>
          <h4>Full Conversation Transcript</h4>
          <div style={{ maxHeight: '380px', overflowY: 'auto', fontSize: '.88rem', marginTop: '0.8rem', paddingRight: '0.5rem' }}>
            {interview.transcript.map((msg, i) => (
              <div
                key={i}
                ref={(element) => { transcriptItemRefs.current[i] = element; }}
                style={{
                  marginBottom: '.75rem',
                  padding: '0.6rem 0.8rem',
                  borderRadius: 8,
                  background: focusedTranscriptIndex === i ? 'rgba(245,158,11,.16)' : msg.who === 'ai' ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.02)',
                  border: focusedTranscriptIndex === i ? '1px solid rgba(245,158,11,.65)' : '1px solid transparent',
                  transition: 'background .25s, border-color .25s',
                }}
              >
                <b style={{ color: msg.who === 'ai' ? 'var(--blue)' : 'var(--accent)', display: 'block', marginBottom: 2 }}>
                  {msg.who === 'ai' ? 'Interviewer' : 'You'}
                  {formatTimestamp(msg.timestampSeconds) ? ` · ${formatTimestamp(msg.timestampSeconds)}` : ''}:
                </b>{' '}
                <span style={{ color: 'var(--text)', lineHeight: 1.5 }}>{msg.text}</span>
                {msg.who === 'ai' && msg.decision && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: '0.72rem', color: 'var(--text-3)' }}>
                    <MessageCircleMore size={12} /> {msg.decision.replace('_', ' ')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

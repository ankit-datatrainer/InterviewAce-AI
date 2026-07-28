'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Download,
  FileText,
  Plus,
  Video,
} from 'lucide-react';
import { useToast } from '@/components/Toast';
import { getInterviewById, getLatestInterview, hydrateInterviews } from '@/lib/interview-store';
import type { InterviewRecord } from '@/lib/interview-store';
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
  weak: { label: 'Weak', bg: 'rgba(239,68,68,.12)', fg: '#EF4444', border: 'rgba(239,68,68,.35)' },
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
      // Not in this browser's cache — pull from the database (cross-device),
      // then look it up again so the report still opens.
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

  if (!loaded) return null;

  // Empty state
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

  // Build question-level data from transcript
  const questionEntries: { label: string; value: number }[] = [];
  let qNum = 0;
  for (let i = 0; i < interview.transcript.length; i++) {
    const msg = interview.transcript[i];
    if (msg.who === 'ai') {
      qNum++;
      // Find user answer(s) for this question
      let answerLength = 0;
      for (let j = i + 1; j < interview.transcript.length; j++) {
        if (interview.transcript[j].who === 'ai') break;
        answerLength += interview.transcript[j].text.length;
      }
      // Score based on answer length (simple heuristic)
      const raw = Math.min(5 + (answerLength / 50) * 2, 10);
      const score = Math.round(raw * 10) / 10;
      const shortQ = msg.text.length > 35 ? msg.text.slice(0, 35) + '...' : msg.text;
      questionEntries.push({ label: `Q${qNum} \u00b7 ${shortQ}`, value: Math.max(score, 4.0) });
    }
  }

  // New evidence-based sections. Older records simply don't have these, so we
  // guard everywhere and omit the sections entirely when absent.
  const perQuestion = Array.isArray(interview.perQuestion) ? interview.perQuestion : [];
  const highlights = interview.highlights;
  const hasHighlights = !!highlights && (
    !!highlights.quotedStrength
    || !!highlights.quotedWeakness
    || (highlights.fillerWords?.count ?? 0) > 0
    || (highlights.vagueClaims?.length ?? 0) > 0
    || (highlights.missingKeywords?.length ?? 0) > 0
  );

  const feedbackBlocks = [
    { title: 'What worked', text: interview.feedback.strengths },
    { title: 'What to fix', text: interview.feedback.improvements },
    { title: 'Next step', text: interview.feedback.nextStep },
  ];

  const scoreSummary = interview.score >= 80
    ? 'Strong performance \u2014 interview ready with minor polish needed'
    : interview.score >= 65
      ? 'Solid effort \u2014 a few areas need focused practice'
      : 'Room for improvement \u2014 review feedback and practice regularly';

  const scoreDescription = interview.score >= 80
    ? `You communicated with clear structure and genuine confidence. Your answers to ${interview.type.toLowerCase()} questions showed depth. Main growth areas: maintaining consistency across all questions.`
    : interview.score >= 65
      ? `You demonstrated understanding of the ${interview.role} role. Some answers could benefit from more specific examples and measurable outcomes.`
      : `This was a good start. Focus on the STAR method for structuring answers and practice speaking on each question for at least 60 seconds.`;

  const tagLabel = interview.score >= 80
    ? 'Top 15% of candidates'
    : interview.score >= 65
      ? 'Above average'
      : 'Keep practicing';

  const tagColor = interview.score >= 80 ? 'green' : interview.score >= 65 ? 'amber' : 'red';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .qb-card {
          border: 1px solid var(--border, rgba(148,163,184,.22));
          border-radius: 14px;
          padding: 1rem 1.1rem;
          margin-bottom: .9rem;
          background: var(--surface-2, rgba(148,163,184,.05));
        }
        .qb-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: .8rem;
          margin-bottom: .55rem;
        }
        .qb-q { font-size: .95rem; font-weight: 650; line-height: 1.4; margin: 0; }
        .qb-num { font-size: .72rem; letter-spacing: .06em; text-transform: uppercase; color: var(--text-3); display: block; margin-bottom: .2rem; }
        .qb-badge {
          flex: 0 0 auto;
          font-size: .7rem;
          font-weight: 700;
          letter-spacing: .05em;
          text-transform: uppercase;
          padding: .22rem .6rem;
          border-radius: 999px;
          border: 1px solid transparent;
          white-space: nowrap;
        }
        .qb-summary { font-size: .85rem; color: var(--text-2); margin: 0 0 .7rem; font-style: italic; }
        .qb-cols { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem; margin-bottom: .8rem; }
        .qb-col b { display: block; font-size: .72rem; letter-spacing: .06em; text-transform: uppercase; margin-bottom: .25rem; }
        .qb-col p { margin: 0; font-size: .86rem; color: var(--text-2); line-height: 1.5; }
        .qb-better {
          border-left: 3px solid var(--accent, #6366F1);
          background: rgba(99,102,241,.08);
          border-radius: 0 10px 10px 0;
          padding: .7rem .9rem;
        }
        .qb-better b { display: block; font-size: .72rem; letter-spacing: .06em; text-transform: uppercase; margin-bottom: .3rem; color: var(--accent, #6366F1); }
        .qb-better p { margin: 0; font-size: .88rem; line-height: 1.55; }
        .qb-stars { display: flex; flex-wrap: wrap; gap: .35rem; margin-top: .75rem; }
        .qb-chip {
          font-size: .72rem;
          padding: .18rem .55rem;
          border-radius: 999px;
          border: 1px solid rgba(148,163,184,.3);
          color: var(--text-3);
        }
        .qb-chip.on { border-color: rgba(34,197,94,.4); background: rgba(34,197,94,.12); color: #22C55E; }
        .hl-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem; }
        .hl-box {
          border: 1px solid var(--border, rgba(148,163,184,.22));
          border-radius: 12px;
          padding: .85rem 1rem;
        }
        .hl-box b { display: block; font-size: .72rem; letter-spacing: .06em; text-transform: uppercase; margin-bottom: .35rem; }
        .hl-box p { margin: 0; font-size: .86rem; line-height: 1.55; color: var(--text-2); }
        .hl-list { margin: .3rem 0 0; padding-left: 1.05rem; font-size: .85rem; color: var(--text-2); line-height: 1.55; }
        .hl-tags { display: flex; flex-wrap: wrap; gap: .35rem; margin-top: .35rem; }
        .hl-tag {
          font-size: .74rem;
          padding: .18rem .55rem;
          border-radius: 999px;
          background: rgba(148,163,184,.14);
          border: 1px solid rgba(148,163,184,.25);
        }
        @media (max-width: 680px) {
          .qb-card { padding: .85rem .9rem; }
          .qb-head { flex-wrap: wrap; }
          .qb-cols { grid-template-columns: 1fr; gap: .6rem; }
          .hl-grid { grid-template-columns: 1fr; }
          .qb-q { font-size: .9rem; }
          .qb-better p, .qb-col p, .hl-box p { font-size: .84rem; }
        }
      ` }} />

      {/* Header */}
      <div className="app-head">
        <div>
          <h2>Interview analysis</h2>
          <p>{interview.type} &middot; {interview.role} &middot; {dateStr} &middot; {mins} min</p>
        </div>
        <div style={{ display: 'flex', gap: '.6rem' }}>
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
            <Download size={15} /> Download DOCX report
          </button>
          
          <button className="btn btn-ghost btn-sm" onClick={() => {
            const lines: string[] = [];
            lines.push('=== InterviewAce - Interview Report ===');
            lines.push('');
            lines.push(`Type: ${interview.type}`);
            lines.push(`Role: ${interview.role}`);
            lines.push(`Difficulty: ${interview.difficulty}`);
            lines.push(`Date: ${new Date(interview.date).toLocaleDateString()}`);
            lines.push(`Duration: ${Math.round(interview.duration / 60)} minutes`);
            lines.push(`Questions: ${interview.questionsCount}`);
            lines.push(`Overall Score: ${interview.score}/100`);
            lines.push('');
            lines.push('--- Metrics ---');
            lines.push(`Communication: ${interview.metrics.communication.toFixed(1)}/10`);
            lines.push(`Confidence: ${interview.metrics.confidence.toFixed(1)}/10`);
            lines.push(`Clarity: ${interview.metrics.clarity.toFixed(1)}/10`);
            lines.push(`Body Language: ${interview.metrics.bodyLanguage.toFixed(1)}/10`);
            lines.push(`Eye Contact: ${interview.metrics.eyeContact.toFixed(1)}/10`);
            lines.push(`Appearance: ${interview.metrics.appearance.toFixed(1)}/10`);
            lines.push(`Posture: ${interview.metrics.posture.toFixed(1)}/10`);
            lines.push(`Technical Knowledge: ${interview.metrics.technicalKnowledge.toFixed(1)}/10`);
            lines.push(`Problem Solving: ${interview.metrics.problemSolving.toFixed(1)}/10`);
            lines.push(`Leadership: ${interview.metrics.leadership.toFixed(1)}/10`);
            lines.push('');
            lines.push('--- Feedback ---');
            lines.push(`Strengths: ${interview.feedback.strengths}`);
            lines.push(`Improvements: ${interview.feedback.improvements}`);
            lines.push(`Next Step: ${interview.feedback.nextStep}`);
            if (hasHighlights && highlights) {
              lines.push('');
              lines.push('--- Highlights ---');
              if (highlights.quotedStrength) lines.push(`Quoted strength: ${highlights.quotedStrength}`);
              if (highlights.quotedWeakness) lines.push(`Quoted weakness: ${highlights.quotedWeakness}`);
              if (highlights.fillerWords) {
                lines.push(`Filler words: ${highlights.fillerWords.count}${highlights.fillerWords.examples?.length ? ` (${highlights.fillerWords.examples.join(', ')})` : ''}`);
              }
              if (highlights.vagueClaims?.length) {
                lines.push('Vague claims:');
                highlights.vagueClaims.forEach((c) => lines.push(`  - ${c}`));
              }
              if (highlights.missingKeywords?.length) {
                lines.push(`Missing keywords: ${highlights.missingKeywords.join(', ')}`);
              }
            }
            if (perQuestion.length > 0) {
              lines.push('');
              lines.push('--- Question-by-question breakdown ---');
              perQuestion.forEach((pq, i) => {
                lines.push('');
                lines.push(`Q${i + 1}: ${pq.question}`);
                lines.push(`Verdict: ${verdictStyle(pq.verdict).label}`);
                if (pq.answerSummary) lines.push(`Your answer: ${pq.answerSummary}`);
                if (pq.whatWorked) lines.push(`What worked: ${pq.whatWorked}`);
                if (pq.whatWasMissing) lines.push(`What was missing: ${pq.whatWasMissing}`);
                if (pq.starCoverage) {
                  const covered = STAR_LABELS.filter((s) => pq.starCoverage?.[s.key]).map((s) => s.label);
                  lines.push(`STAR coverage: ${covered.length > 0 ? covered.join(', ') : 'none'}`);
                }
                if (pq.betterAnswer) lines.push(`Stronger answer: ${pq.betterAnswer}`);
              });
            }
            lines.push('');
            lines.push('--- Transcript ---');
            interview.transcript.forEach((msg) => {
              lines.push(`${msg.who === 'ai' ? 'Alex' : 'You'}: ${msg.text}`);
            });
            downloadFile(lines.join('\n'), `interview-report-${new Date(interview.date).toISOString().slice(0, 10)}.txt`);
            toast('Report downloaded');
          }}>
            <Download size={15} /> Download report
          </button>
          {hasVideo && (
            <button className="btn btn-ghost btn-sm" onClick={handleDownloadVideo}>
              <Video size={15} /> Download interview video
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={() => {
            transcriptRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}>
            <FileText size={15} /> View transcript
          </button>
        </div>
      </div>

      {/* Score hero */}
      <div className="widget" style={{ marginBottom: '1rem' }}>
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
            <h3 style={{ fontSize: '1.12rem', marginBottom: '.4rem' }}>
              {scoreSummary}
            </h3>
            <p style={{ color: 'var(--text-2)', fontSize: '.9rem', marginBottom: '.6rem' }}>
              {scoreDescription}
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

      {/* Two-column: feedback + questions */}
      <div className="dash-grid-3">
        {/* AI feedback highlights */}
        <div className="widget">
          <h4>AI feedback highlights</h4>
          {feedbackBlocks.map((fb) => (
            <div className="fb-block" key={fb.title}>
              <b>{fb.title}</b>
              {fb.text}
            </div>
          ))}

          {/* Transcript */}
          {interview.transcript.length > 0 && (
            <div ref={transcriptRef}>
              <h4 style={{ marginTop: '1.2rem' }}>Transcript</h4>
              <div style={{ maxHeight: '300px', overflowY: 'auto', fontSize: '.85rem' }}>
                {interview.transcript.map((msg, i) => (
                  <div key={i} style={{ marginBottom: '.5rem' }}>
                    <b style={{ color: msg.who === 'ai' ? 'var(--blue)' : 'var(--accent)' }}>
                      {msg.who === 'ai' ? 'Alex' : 'You'}:
                    </b>{' '}
                    {msg.text}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Question-by-question scores */}
        <div className="widget">
          <h4>Question-by-question scores</h4>
          {questionEntries.length > 0 ? (
            questionEntries.map((q) => {
              const pct = (q.value / 10) * 100;
              return (
                <div className="skill-row" key={q.label}>
                  <div className="top">
                    <b>{q.label}</b>
                    <span>{q.value.toFixed(1)}</span>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      data-w={pct}
                      style={{ width: animated ? `${pct}%` : '0%' }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <p style={{ color: 'var(--text-3)', fontSize: '.9rem' }}>
              No question data available.
            </p>
          )}
        </div>
      </div>

      {/* Evidence highlights — only for records evaluated with the newer analysis */}
      {hasHighlights && highlights && (
        <div className="widget" style={{ marginTop: '1rem' }}>
          <h4>Evidence from your answers</h4>
          <div className="hl-grid" style={{ marginTop: '.6rem' }}>
            {highlights.quotedStrength && (
              <div className="hl-box" style={{ borderColor: 'rgba(34,197,94,.35)' }}>
                <b style={{ color: '#22C55E' }}>What you said well</b>
                <p>{highlights.quotedStrength}</p>
              </div>
            )}
            {highlights.quotedWeakness && (
              <div className="hl-box" style={{ borderColor: 'rgba(239,68,68,.35)' }}>
                <b style={{ color: '#EF4444' }}>What fell short</b>
                <p>{highlights.quotedWeakness}</p>
              </div>
            )}
            {highlights.fillerWords && (
              <div className="hl-box">
                <b>Filler words</b>
                <p>
                  {highlights.fillerWords.count} detected
                  {highlights.fillerWords.count === 0 ? ' — clean delivery.' : ' across your answers.'}
                </p>
                {(highlights.fillerWords.examples?.length ?? 0) > 0 && (
                  <div className="hl-tags">
                    {highlights.fillerWords.examples.map((ex, i) => (
                      <span className="hl-tag" key={`${ex}-${i}`}>{ex}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
            {(highlights.missingKeywords?.length ?? 0) > 0 && (
              <div className="hl-box">
                <b>Never mentioned</b>
                <p>Terms a strong {interview.role} candidate would be expected to bring up:</p>
                <div className="hl-tags">
                  {highlights.missingKeywords.map((k, i) => (
                    <span className="hl-tag" key={`${k}-${i}`}>{k}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          {(highlights.vagueClaims?.length ?? 0) > 0 && (
            <div className="hl-box" style={{ marginTop: '.8rem' }}>
              <b>Claims without evidence</b>
              <ul className="hl-list">
                {highlights.vagueClaims.map((c, i) => (
                  <li key={`${i}-${c.slice(0, 12)}`}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Question-by-question breakdown */}
      {perQuestion.length > 0 && (
        <div className="widget" style={{ marginTop: '1rem' }}>
          <h4>Question-by-question breakdown</h4>
          <p style={{ color: 'var(--text-3)', fontSize: '.85rem', margin: '.2rem 0 1rem' }}>
            Each answer you gave, what landed, what was missing, and a stronger version of your own words.
          </p>
          {perQuestion.map((pq, i) => {
            const vs = verdictStyle(pq.verdict);
            return (
              <div className="qb-card" key={`${i}-${pq.question.slice(0, 16)}`}>
                <div className="qb-head">
                  <div>
                    <span className="qb-num">Question {i + 1}</span>
                    <p className="qb-q">{pq.question}</p>
                  </div>
                  <span
                    className="qb-badge"
                    style={{ background: vs.bg, color: vs.fg, borderColor: vs.border }}
                  >
                    {vs.label}
                  </span>
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
                    <b>Stronger answer</b>
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
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Download,
  FileText,
  Plus,
} from 'lucide-react';
import { useToast } from '@/components/Toast';
import { getInterviewById, getLatestInterview } from '@/lib/interview-store';
import type { InterviewRecord } from '@/lib/interview-store';

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

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setInterview(getInterviewById(id));
    } else {
      setInterview(getLatestInterview());
    }
    setLoaded(true);
    requestAnimationFrame(() => {
      setAnimated(true);
    });
  }, [searchParams]);

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
      {/* Header */}
      <div className="app-head">
        <div>
          <h2>Interview analysis</h2>
          <p>{interview.type} &middot; {interview.role} &middot; {dateStr} &middot; {mins} min</p>
        </div>
        <div style={{ display: 'flex', gap: '.6rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={async () => {
            if (!interview) return;
            const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
            const { saveAs } = (await import('file-saver')).default || await import('file-saver');

            const doc = new Document({
              sections: [{
                properties: {},
                children: [
                  new Paragraph({ text: "InterviewAce - Interview Report", heading: HeadingLevel.HEADING_1 }),
                  new Paragraph(`Type: ${interview.type}`),
                  new Paragraph(`Role: ${interview.role}`),
                  new Paragraph(`Difficulty: ${interview.difficulty}`),
                  new Paragraph(`Date: ${new Date(interview.date).toLocaleDateString()}`),
                  new Paragraph(`Duration: ${Math.round(interview.duration / 60)} minutes`),
                  new Paragraph(`Overall Score: ${interview.score}/100`),
                  
                  new Paragraph({ text: "Metrics", heading: HeadingLevel.HEADING_2 }),
                  new Paragraph(`Communication: ${interview.metrics.communication.toFixed(1)}/10`),
                  new Paragraph(`Confidence: ${interview.metrics.confidence.toFixed(1)}/10`),
                  new Paragraph(`Clarity: ${interview.metrics.clarity.toFixed(1)}/10`),
                  new Paragraph(`Technical Knowledge: ${interview.metrics.technicalKnowledge.toFixed(1)}/10`),
                  new Paragraph(`Problem Solving: ${interview.metrics.problemSolving.toFixed(1)}/10`),

                  new Paragraph({ text: "Feedback", heading: HeadingLevel.HEADING_2 }),
                  new Paragraph(`Strengths: ${interview.feedback.strengths}`),
                  new Paragraph(`Improvements: ${interview.feedback.improvements}`),
                  new Paragraph(`Next Step: ${interview.feedback.nextStep}`),

                  new Paragraph({ text: "Transcript", heading: HeadingLevel.HEADING_2 }),
                  ...interview.transcript.map(msg => new Paragraph({
                    children: [
                      new TextRun({ text: `${msg.who === 'ai' ? 'Aria' : 'You'}: `, bold: true }),
                      new TextRun(msg.text),
                    ]
                  }))
                ]
              }]
            });

            const blob = await Packer.toBlob(doc);
            saveAs(blob, `interview-report-${new Date(interview.date).toISOString().slice(0, 10)}.docx`);
            toast('DOCX Report downloaded');
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
            lines.push('');
            lines.push('--- Transcript ---');
            interview.transcript.forEach((msg) => {
              lines.push(`${msg.who === 'ai' ? 'Aria' : 'You'}: ${msg.text}`);
            });
            downloadFile(lines.join('\n'), `interview-report-${new Date(interview.date).toISOString().slice(0, 10)}.txt`);
            toast('Report downloaded');
          }}>
            <Download size={15} /> Download report
          </button>
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
                      {msg.who === 'ai' ? 'Aria' : 'You'}:
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
    </>
  );
}

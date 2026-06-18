'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Download, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { getInterviews } from '@/lib/interview-store';
import type { InterviewRecord } from '@/lib/interview-store';
import { getResumes } from '@/lib/resume-store';
import type { ResumeRecord } from '@/lib/resume-store';

function downloadFile(content: string, filename: string, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---- chart helpers ---- */

function cssVar(name: string): string {
  if (typeof window === 'undefined') return '#94A3B8';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#94A3B8';
}

function lineChart(
  canvas: HTMLCanvasElement,
  datasets: { data: number[]; color: string; label: string }[],
  labels: string[],
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const W = rect.width;
  const H = rect.height;

  const pad = { top: 18, right: 16, bottom: 30, left: 38 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top - pad.bottom;

  const allVals = datasets.flatMap((d) => d.data);
  const minV = Math.floor(Math.min(...allVals) - 1);
  const maxV = Math.ceil(Math.max(...allVals) + 1);
  const range = maxV - minV || 1;

  const textColor = cssVar('--text-3');
  const lineColor = cssVar('--line');

  // grid
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 0.6;
  const gridSteps = 5;
  for (let i = 0; i <= gridSteps; i++) {
    const y = pad.top + (cH / gridSteps) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(W - pad.right, y);
    ctx.stroke();
  }

  // labels
  ctx.fillStyle = textColor;
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'center';
  labels.forEach((l, i) => {
    const x = pad.left + (cW / (labels.length - 1)) * i;
    ctx.fillText(l, x, H - 8);
  });

  // y-axis labels
  ctx.textAlign = 'right';
  for (let i = 0; i <= gridSteps; i++) {
    const val = maxV - (range / gridSteps) * i;
    const y = pad.top + (cH / gridSteps) * i;
    ctx.fillText(val.toFixed(1), pad.left - 6, y + 4);
  }

  // lines
  datasets.forEach((ds) => {
    const points = ds.data.map((v, i) => ({
      x: pad.left + (cW / (labels.length - 1)) * i,
      y: pad.top + cH - ((v - minV) / range) * cH,
    }));

    // gradient fill
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + cH);
    grad.addColorStop(0, ds.color + '30');
    grad.addColorStop(1, ds.color + '00');
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, pad.top + cH);
    ctx.lineTo(points[0].x, pad.top + cH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = ds.color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // dots
    points.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = ds.color;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    });
  });
}

function barChart(
  canvas: HTMLCanvasElement,
  data: number[],
  labels: string[],
  color: string,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const W = rect.width;
  const H = rect.height;

  const pad = { top: 18, right: 16, bottom: 30, left: 38 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top - pad.bottom;

  const maxV = Math.ceil(Math.max(...data) * 1.15);
  const textColor = cssVar('--text-3');
  const lineColor = cssVar('--line');

  // grid
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 0.6;
  const gridSteps = 5;
  for (let i = 0; i <= gridSteps; i++) {
    const y = pad.top + (cH / gridSteps) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(W - pad.right, y);
    ctx.stroke();
  }

  // y-axis labels
  ctx.fillStyle = textColor;
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= gridSteps; i++) {
    const val = maxV - (maxV / gridSteps) * i;
    const y = pad.top + (cH / gridSteps) * i;
    ctx.fillText(Math.round(val).toString(), pad.left - 6, y + 4);
  }

  const barW = Math.min(cW / data.length * 0.55, 48);
  const gap = cW / data.length;

  data.forEach((v, i) => {
    const barH = (v / maxV) * cH;
    const x = pad.left + gap * i + (gap - barW) / 2;
    const y = pad.top + cH - barH;
    const r = 6;

    // gradient fill
    const grad = ctx.createLinearGradient(x, y, x, pad.top + cH);
    grad.addColorStop(0, color);
    grad.addColorStop(1, color + '55');
    ctx.fillStyle = grad;

    // rounded top rect
    ctx.beginPath();
    ctx.moveTo(x, pad.top + cH);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.lineTo(x + barW - r, y);
    ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
    ctx.lineTo(x + barW, pad.top + cH);
    ctx.closePath();
    ctx.fill();

    // label
    ctx.fillStyle = textColor;
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], x + barW / 2, H - 8);
  });
}

/* ---- helpers to derive chart data from interviews ---- */

function buildSkills(interviews: InterviewRecord[]) {
  if (interviews.length === 0) return [];

  const count = interviews.length;
  const avg = (fn: (iv: InterviewRecord) => number) =>
    Math.round((interviews.reduce((s, iv) => s + fn(iv), 0) / count) * 10) / 10;

  const skills = [
    { name: 'Communication', score: avg((iv) => iv.metrics.communication), pct: 0 },
    { name: 'Confidence', score: avg((iv) => iv.metrics.confidence), pct: 0 },
    { name: 'Technical depth', score: avg((iv) => iv.metrics.technicalKnowledge), pct: 0 },
    { name: 'Eye contact', score: avg((iv) => iv.metrics.eyeContact), pct: 0 },
    { name: 'Problem solving', score: avg((iv) => iv.metrics.problemSolving), pct: 0 },
  ];

  skills.forEach((s) => {
    s.pct = Math.round(s.score * 10);
  });

  // Sort so highest first
  skills.sort((a, b) => b.score - a.score);

  return skills.map((s) => ({
    ...s,
    closing: s.score >= 7.5,
    label: s.score >= 7.5 ? 'closing' : 'gap',
  }));
}

export default function AnalyticsPage() {
  const confCanvas = useRef<HTMLCanvasElement>(null);
  const scoreCanvas = useRef<HTMLCanvasElement>(null);
  const atsCanvas = useRef<HTMLCanvasElement>(null);
  const [barWidths, setBarWidths] = useState<number[]>([]);
  const [, setTick] = useState(0);
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setInterviews(getInterviews());
    setResumes(getResumes());
    setLoaded(true);
  }, []);

  const skills = buildSkills(interviews);
  const hasEnoughData = interviews.length >= 2;

  const drawAll = useCallback(() => {
    if (!hasEnoughData) return;

    // Build data from interviews (take last 8 max)
    const recent = interviews.slice(-8);
    const labels = recent.map((_, i) => `IV${i + 1}`);
    const weekLabels = recent.map((_, i) => `W${i + 1}`);

    if (confCanvas.current && recent.length >= 2) {
      lineChart(
        confCanvas.current,
        [
          { data: recent.map((iv) => iv.metrics.confidence), color: '#2563EB', label: 'Confidence score' },
          { data: recent.map((iv) => iv.metrics.communication), color: '#06B6D4', label: 'Communication' },
        ],
        weekLabels,
      );
    }
    if (scoreCanvas.current && recent.length >= 2) {
      lineChart(
        scoreCanvas.current,
        [{ data: recent.map((iv) => iv.score), color: '#2563EB', label: 'Overall score' }],
        labels,
      );
    }
    if (atsCanvas.current && resumes.length > 0) {
      const recentResumes = resumes.slice(-8);
      barChart(
        atsCanvas.current,
        recentResumes.map((r) => r.atsScore),
        recentResumes.map((_, i) => `Up ${i + 1}`),
        '#06B6D4',
      );
    }
  }, [interviews, resumes, hasEnoughData]);

  useEffect(() => {
    if (!loaded) return;
    drawAll();

    // observe theme changes
    const observer = new MutationObserver(() => {
      setTick((t) => t + 1);
      drawAll();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    window.addEventListener('resize', drawAll);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', drawAll);
    };
  }, [drawAll, loaded]);

  // animate bar fills on mount
  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => {
      setBarWidths(skills.map((s) => s.pct));
    }, 80);
    return () => clearTimeout(timer);
  }, [loaded, skills]);

  if (!loaded) return null;

  // Find the two weakest skills for focus message
  const gaps = skills.filter((s) => !s.closing);
  const focusMessage = gaps.length > 0
    ? `${gaps.map((g) => g.name).join(' and ')} ${gaps.length === 1 ? 'is your' : 'are your'} open gap${gaps.length > 1 ? 's' : ''}. Practice targeted mock interviews to close ${gaps.length === 1 ? 'it' : 'them'}.`
    : 'All skills are looking strong! Keep up the consistent practice.';

  return (
    <>
      <div className="app-head">
        <div>
          <h2>Progress analytics</h2>
          <p>
            {hasEnoughData
              ? `Based on your ${interviews.length} interview${interviews.length > 1 ? 's' : ''}.`
              : 'Complete at least 2 interviews to see trends.'}
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => {
          if (interviews.length === 0) {
            toast('No interview data to export');
            return;
          }
          const header = 'Date,Type,Role,Difficulty,Score,Duration (min),Communication,Confidence,Clarity,Body Language,Eye Contact,Appearance,Posture,Technical Knowledge,Problem Solving,Leadership';
          const rows = interviews.map((iv) => {
            const d = new Date(iv.date).toLocaleDateString();
            const m = iv.metrics;
            return `${d},${iv.type},${iv.role},${iv.difficulty},${iv.score},${Math.round(iv.duration / 60)},${m.communication},${m.confidence},${m.clarity},${m.bodyLanguage},${m.eyeContact},${m.appearance},${m.posture},${m.technicalKnowledge},${m.problemSolving},${m.leadership}`;
          });
          downloadFile([header, ...rows].join('\n'), 'interview-analytics.csv', 'text/csv');
          toast('Analytics report exported');
        }}>
          <Download size={16} /> Export report
        </button>
      </div>

      {!hasEnoughData ? (
        <div className="widget" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-2)', marginBottom: '.5rem' }}>
            Complete at least 2 interviews to see trends
          </p>
          <p style={{ fontSize: '.88rem', color: 'var(--text-3)' }}>
            You have completed {interviews.length} interview{interviews.length !== 1 ? 's' : ''} so far.
          </p>
        </div>
      ) : (
        <>
          {/* Row 1 */}
          <div className="dash-grid-3" style={{ marginBottom: '1rem' }}>
            <div className="widget chart-card">
              <h4>Confidence growth</h4>
              <canvas ref={confCanvas} style={{ width: '100%' }} />
              <div className="legend">
                <span><i style={{ background: '#2563EB' }} /> Confidence score</span>
                <span><i style={{ background: '#06B6D4' }} /> Communication</span>
              </div>
            </div>

            <div className="widget chart-card">
              <h4>Interview scores over time</h4>
              <canvas ref={scoreCanvas} style={{ width: '100%' }} />
              <div className="legend">
                <span><i style={{ background: '#2563EB' }} /> Overall score</span>
              </div>
            </div>
          </div>

          {/* Row 2 */}
          <div className="dash-grid-3">
            {resumes.length > 0 && (
              <div className="widget chart-card">
                <h4>ATS score improvements</h4>
                <canvas ref={atsCanvas} style={{ width: '100%' }} />
                <div className="legend">
                  <span><i style={{ background: '#06B6D4' }} /> ATS score</span>
                </div>
              </div>
            )}

            <div className="widget">
              <h4>Skill gap trends</h4>
              {skills.map((skill, i) => (
                <div className="skill-row" key={skill.name}>
                  <div className="top">
                    <b>{skill.name}</b>
                    <span>
                      {skill.score} &middot;{' '}
                      {skill.closing ? (
                        <span className="up" style={{ display: 'inline-flex', alignItems: 'center', gap: '.2rem' }}>
                          &#9650; closing
                        </span>
                      ) : (
                        <span className="down" style={{ display: 'inline-flex', alignItems: 'center', gap: '.2rem' }}>
                          <AlertTriangle size={12} /> gap
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${barWidths[i] ?? 0}%` }}
                    />
                  </div>
                </div>
              ))}

              <div className="fb-block" style={{ marginTop: '1rem' }}>
                <b>{'\uD83D\uDCCC'} Focus this week</b>
                {focusMessage}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

'use client';

import React from 'react';
import { X, BookOpen, Sparkles, CheckCircle2, Lightbulb } from 'lucide-react';
import { playDuoSound } from '@/lib/gamification';

type GuidebookProps = {
  unitNumber: number;
  unitTitle: string;
  isOpen: boolean;
  onClose: () => void;
};

const UNIT_CONTENT: Record<number, {
  summary: string;
  keyConcepts: { title: string; desc: string; example: string }[];
  proTips: string[];
}> = {
  1: {
    summary: 'Master the opening 5 minutes of any interview. First impressions make up 70% of hiring manager sentiment.',
    keyConcepts: [
      {
        title: 'The "Past-Present-Future" Framework',
        desc: 'Structure your "Tell me about yourself" in 90 seconds:',
        example: '"I started in CS at university (Past), recently built 3 full-stack Next.js apps (Present), and am excited to bring this problem-solving mindset to your backend team (Future)."',
      },
      {
        title: 'Culture Alignment & Company Values',
        desc: 'Research 2 recent company initiatives and weave them into your answer.',
        example: '"I saw you recently expanded your AI evaluation pipelines, which matches my recent experience with LLM prompting."',
      },
    ],
    proTips: [
      'Keep your opening answer between 60–90 seconds.',
      'Maintain eye contact with your camera to simulate natural engagement.',
      'Use enthusiastic voice modulation — avoid monotone delivery.',
    ],
  },
  2: {
    summary: 'Technical problem solving is about communication and trade-off analysis, not just code correctness.',
    keyConcepts: [
      {
        title: 'Think-Out-Loud Protocol',
        desc: 'Never code in silence. Clarify inputs, edge cases, and time/space constraints first.',
        example: '"Before implementing, let me clarify: can the input array contain negative numbers or null values?"',
      },
      {
        title: 'Trade-Off Discussions',
        desc: 'Propose a brute-force approach first, then optimize with a hash map or two-pointer method.',
        example: '"A nested loop gives O(N²) time. By using a hash set, we can reduce this to O(N) time with O(N) extra space."',
      },
    ],
    proTips: [
      'Write test cases before finishing your solution.',
      'Ask clarifying questions before assuming API formats.',
      'State time and space complexities explicitly using Big-O notation.',
    ],
  },
};

export default function UnitGuidebookModal({
  unitNumber,
  unitTitle,
  isOpen,
  onClose,
}: GuidebookProps) {
  if (!isOpen) return null;

  const content = UNIT_CONTENT[unitNumber] || UNIT_CONTENT[1];

  return (
    <div className="duo-popover-backdrop" onClick={onClose}>
      <div
        className="duo-guidebook-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface-solid, #0f172a)',
          border: '2px solid var(--line, rgba(255,255,255,0.12))',
          borderRadius: '24px',
          maxWidth: '560px',
          width: '92%',
          maxHeight: '85vh',
          overflowY: 'auto',
          padding: '1.8rem',
          position: 'relative',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          animation: 'duoPopIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.2rem',
            right: '1.2rem',
            background: 'var(--card, rgba(255,255,255,0.06))',
            border: '1px solid var(--line)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-2)',
            cursor: 'pointer',
          }}
        >
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
          <span style={{ fontSize: '1.8rem' }}>📖</span>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--duo-blue, #1cb0f6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Unit {unitNumber} Guidebook
            </span>
            <h3 style={{ margin: 0, fontSize: '1.3rem' }}>{unitTitle}</h3>
          </div>
        </div>

        <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', lineHeight: '1.5', margin: '0.8rem 0 1.2rem' }}>
          {content.summary}
        </p>

        {/* Key Concepts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginBottom: '1.4rem' }}>
          <h4 style={{ margin: 0, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text)' }}>
            <Sparkles size={16} style={{ color: '#ffc800' }} /> Key Frameworks &amp; Formulas
          </h4>
          {content.keyConcepts.map((concept, i) => (
            <div
              key={i}
              style={{
                background: 'var(--card, rgba(255,255,255,0.03))',
                border: '1px solid var(--line)',
                borderRadius: '14px',
                padding: '0.9rem 1.1rem',
              }}
            >
              <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text)', marginBottom: '0.2rem' }}>
                {concept.title}
              </strong>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', color: 'var(--text-2)' }}>
                {concept.desc}
              </p>
              <div
                style={{
                  background: 'rgba(28, 176, 246, 0.08)',
                  borderLeft: '3px solid #1cb0f6',
                  padding: '0.45rem 0.75rem',
                  borderRadius: '0 8px 8px 0',
                  fontSize: '0.8rem',
                  color: 'var(--text)',
                  fontStyle: 'italic',
                }}
              >
                {concept.example}
              </div>
            </div>
          ))}
        </div>

        {/* Pro Tips */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ margin: '0 0 0.7rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text)' }}>
            <Lightbulb size={16} style={{ color: '#58cc02' }} /> Interviewer Insider Tips
          </h4>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {content.proTips.map((tip, i) => (
              <li key={i} style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: '1.4' }}>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        <button
          className="btn-duo btn-duo-green"
          style={{ width: '100%' }}
          onClick={() => {
            playDuoSound('pop');
            onClose();
          }}
        >
          Got It! Let&apos;s Practice
        </button>
      </div>
    </div>
  );
}

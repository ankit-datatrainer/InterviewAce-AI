'use client';

import { useState } from 'react';
import { Database, Key, Newspaper, Film, Mail, Plus } from 'lucide-react';
import { useToast } from '@/components/Toast';

const SECTIONS = [
  { icon: Database, label: 'Question banks', desc: '2,140 questions across 32 roles' },
  { icon: Key, label: 'ATS keyword libraries', desc: '48 role profiles, updated weekly' },
  { icon: Newspaper, label: 'Blog & landing copy', desc: '12 drafts awaiting review' },
  { icon: Film, label: 'Avatar scripts (HeyGen)', desc: '6 interviewer personas' },
  { icon: Mail, label: 'Email templates', desc: '4 transactional templates' },
];

const ROLES = [
  'Frontend Developer', 'Backend Engineer', 'Full Stack Developer', 'Data Scientist',
  'Product Manager', 'DevOps Engineer', 'UI/UX Designer', 'Mobile Developer',
  'QA Engineer', 'Business Analyst', 'HR Generalist', 'Marketing Manager',
];

export default function ContentManagementPage() {
  const { toast } = useToast();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [questionRole, setQuestionRole] = useState(ROLES[0]);
  const [questionText, setQuestionText] = useState('');

  const handleManage = (idx: number) => {
    if (expandedIdx === idx) {
      setExpandedIdx(null);
    } else {
      setExpandedIdx(idx);
      toast('Opening ' + SECTIONS[idx].label + '...');
    }
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) return;
    toast('Question added');
    setQuestionText('');
  };

  return (
    <>
      <div className="app-head">
        <div>
          <h2>Content Management</h2>
          <p>Manage question banks, templates, and platform content</p>
        </div>
      </div>

      <div className="widget" style={{ marginBottom: '1rem' }}>
        <h4>Content sections</h4>
        {SECTIONS.map((sec, idx) => {
          const Icon = sec.icon;
          return (
            <div key={sec.label}>
              <div className="builder-sec">
                <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem' }}>
                  <Icon size={18} style={{ color: 'var(--blue)', flexShrink: 0 }} />
                  <div>
                    <b>{sec.label}</b>{' '}
                    <span style={{ color: 'var(--text-3)', fontSize: '.8rem' }}>&middot; {sec.desc}</span>
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => handleManage(idx)}>
                  {expandedIdx === idx ? 'Close' : 'Manage'}
                </button>
              </div>
              {expandedIdx === idx && (
                <div
                  style={{
                    padding: '1rem',
                    marginBottom: '.6rem',
                    background: 'var(--chip)',
                    borderRadius: '0 0 12px 12px',
                    marginTop: '-0.6rem',
                    border: '1px solid var(--line)',
                    borderTop: 'none',
                    fontSize: '.88rem',
                    color: 'var(--text-2)',
                  }}
                >
                  Content editor for <b style={{ color: 'var(--text)' }}>{sec.label}</b> will be available here. This section currently contains: {sec.desc}.
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="widget">
        <h4>Add new question</h4>
        <form onSubmit={handleAddQuestion}>
          <div className="field">
            <label>Target role</label>
            <select
              value={questionRole}
              onChange={(e) => setQuestionRole(e.target.value)}
              style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--line-2)',
                borderRadius: 10,
                padding: '.75rem .95rem',
                width: '100%',
              }}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Question text</label>
            <textarea
              rows={3}
              placeholder="Type the interview question here..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--line-2)',
                borderRadius: 10,
                padding: '.75rem .95rem',
                width: '100%',
                resize: 'vertical',
              }}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: '.4rem' }}>
            <Plus size={16} /> Add question
          </button>
        </form>
      </div>
    </>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { Check, GripVertical, Sparkles } from 'lucide-react';
import { addKeywordToProfile, type ResumeProfile } from '@/lib/resume-profile';

type Props = {
  keywords: string[];
  profile: ResumeProfile;
  onChange: (profile: ResumeProfile, keyword: string, section: 'summary' | 'skills') => void;
};

export default function ResumeKeywordLab({ keywords, profile, onChange }: Props) {
  const [draggedKeyword, setDraggedKeyword] = useState<string | null>(null);
  const [activeDrop, setActiveDrop] = useState<'summary' | 'skills' | null>(null);
  const [applied, setApplied] = useState<Record<string, 'summary' | 'skills'>>({});

  const uniqueKeywords = useMemo(
    () => Array.from(new Set(keywords.map((item) => item.trim()).filter(Boolean))).slice(0, 16),
    [keywords],
  );

  const apply = (keyword: string, section: 'summary' | 'skills') => {
    const next = addKeywordToProfile(profile, keyword, section);
    onChange(next, keyword, section);
    setApplied((current) => ({ ...current, [keyword]: section }));
    setDraggedKeyword(null);
    setActiveDrop(null);
  };

  return (
    <div className="keyword-lab" aria-label="Resume keyword workshop">
      <div className="keyword-lab-head">
        <div>
          <span className="keyword-lab-kicker"><Sparkles size={14} /> Keyword power-up</span>
          <h4>Drag suggested keywords into your resume</h4>
          <p>Only add a keyword when it truthfully describes your experience.</p>
        </div>
        <span className="tag purple">{uniqueKeywords.length} suggestions</span>
      </div>

      <div className="keyword-lab-grid">
        <div className="keyword-source-bank" aria-label="Suggested missing keywords">
          {uniqueKeywords.length === 0 ? (
            <div className="keyword-empty"><Check size={18} /> No missing keywords to place.</div>
          ) : uniqueKeywords.map((keyword) => (
            <div
              key={keyword}
              className={`keyword-drag-card${applied[keyword] ? ' applied' : ''}`}
              draggable={!applied[keyword]}
              onDragStart={(event) => {
                setDraggedKeyword(keyword);
                event.dataTransfer.setData('text/plain', keyword);
                event.dataTransfer.effectAllowed = 'copy';
              }}
              onDragEnd={() => { setDraggedKeyword(null); setActiveDrop(null); }}
            >
              <span><GripVertical size={15} /> {keyword}</span>
              {applied[keyword] ? (
                <small><Check size={12} /> Added to {applied[keyword]}</small>
              ) : (
                <div className="keyword-card-actions">
                  <button type="button" onClick={() => apply(keyword, 'skills')}>+ Skills</button>
                  <button type="button" onClick={() => apply(keyword, 'summary')}>+ Summary</button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="keyword-drop-stack">
          {(['skills', 'summary'] as const).map((section) => (
            <div
              key={section}
              className={`keyword-drop-zone${activeDrop === section ? ' active' : ''}`}
              onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; setActiveDrop(section); }}
              onDragLeave={() => setActiveDrop(null)}
              onDrop={(event) => {
                event.preventDefault();
                const keyword = event.dataTransfer.getData('text/plain') || draggedKeyword;
                if (keyword) apply(keyword, section);
              }}
            >
              <strong>{section === 'skills' ? '🧰 Skills' : '📝 Professional summary'}</strong>
              <span>Drop a truthful keyword here</span>
              <p>{section === 'skills' ? (profile.skills || 'No skills added yet.') : (profile.summary || 'No summary added yet.')}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

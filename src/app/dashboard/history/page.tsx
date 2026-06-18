'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, Target, Calendar, ChevronRight, BarChart } from 'lucide-react';
import { getInterviews } from '@/lib/interview-store';
import type { InterviewRecord } from '@/lib/interview-store';

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function scoreTag(score: number): string {
  if (score >= 80) return 'green';
  if (score >= 65) return 'amber';
  return 'red';
}

export default function HistoryPage() {
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setInterviews(getInterviews());
    setLoaded(true);
  }, []);

  if (!loaded) return null;

  return (
    <>
      <div className="app-head">
        <div>
          <h2>Interview History</h2>
          <p>Review and analyze your past mock interviews.</p>
        </div>
      </div>

      <div className="widget">
        {interviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-2)' }}>
              You haven't completed any mock interviews yet.
            </p>
            <Link href="/dashboard/interview" className="btn btn-primary">
              <Target size={18} /> Start your first interview
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[...interviews].reverse().map((iv) => (
              <div key={iv.id} className="history-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '50%', background: 'var(--bg-2)', display: 'grid', placeItems: 'center', border: '2px solid var(--line-2)' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', color: `var(--${scoreTag(iv.score)})` }}>
                      {iv.score}
                    </span>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '.3rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                      {iv.type} <span style={{ color: 'var(--text-3)', fontSize: '0.9rem', fontWeight: 400 }}>&middot; {iv.difficulty}</span>
                    </h3>
                    <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-2)', fontSize: '.85rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                        <Target size={14} /> {iv.role}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                        <Clock size={14} /> {Math.round(iv.duration / 60)} min
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                        <Calendar size={14} /> {formatRelativeDate(iv.date)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <Link href={`/dashboard/analysis?id=${iv.id}`} className="btn btn-ghost btn-sm" style={{ padding: '0.5rem 1rem' }}>
                  <BarChart size={16} /> View Report <ChevronRight size={16} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

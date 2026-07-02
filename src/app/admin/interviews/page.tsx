'use client';

import { useState, useEffect, useMemo } from 'react';
import { getAdminInterviews, type AdminInterview } from '@/lib/admin-store';

const typeFilters = ['All', 'HR Round', 'Technical', 'Behavioral'] as const;

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<AdminInterview[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('All');

  useEffect(() => {
    getAdminInterviews().then(setInterviews);
  }, []);

  const filtered = useMemo(() => {
    if (activeFilter === 'All') return interviews;
    return interviews.filter((i) =>
      i.type.toLowerCase().includes(activeFilter.toLowerCase().replace(' round', '')),
    );
  }, [interviews, activeFilter]);

  return (
    <>
      <div className="app-head">
        <div>
          <h2>Interview Management</h2>
          <p>
            Showing {filtered.length} of {interviews.length} interviews
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '.55rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {typeFilters.map((f) => (
          <button
            key={f}
            className={`pill-filter${activeFilter === f ? ' on' : ''}`}
            onClick={() => setActiveFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="widget">
        <div className="table-wrap">
          <table className="adm">
            <thead>
              <tr>
                <th>Session ID</th>
                <th>User</th>
                <th>Type</th>
                <th>Duration</th>
                <th>Score</th>
                <th>Flag</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id}>
                  <td style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                    {i.id.toUpperCase()}
                  </td>
                  <td>{i.userName}</td>
                  <td>{i.type}</td>
                  <td>{i.duration}</td>
                  <td>{i.score === 'DNF' ? '\u2014' : i.score}</td>
                  <td>
                    <span className={`tag ${i.flagTag}`}>{i.flag}</span>
                  </td>
                  <td>{i.date}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '2rem' }}>
                    No interviews found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

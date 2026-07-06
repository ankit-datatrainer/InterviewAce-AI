'use client';

import { useState, useEffect } from 'react';
import { getAdminResumes, type AdminResume } from '@/lib/admin-store';

function atsColor(score: number): string {
  if (score >= 75) return 'green';
  if (score >= 60) return 'amber';
  return 'red';
}

export default function ResumesPage() {
  const [resumes, setResumes] = useState<AdminResume[]>([]);

  useEffect(() => {
    getAdminResumes().then(setResumes);
  }, []);

  return (
    <>
      <div className="app-head">
        <div>
          <h2>Resume Reports</h2>
          <p>{resumes.length} resumes submitted</p>
        </div>
      </div>

      <div className="widget">
        <div className="table-wrap">
          <table className="adm">
            <thead>
              <tr>
                <th>Resume</th>
                <th>User</th>
                <th>Target Role</th>
                <th>ATS Score</th>
                <th>Uploads</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {resumes.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>
                    {r.fileUrl && r.fileUrl !== 'local' ? (
                      <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand)', textDecoration: 'underline' }}>
                        {r.fileName}
                      </a>
                    ) : (
                      <span title="File not uploaded to cloud storage">{r.fileName}</span>
                    )}
                  </td>
                  <td>{r.userName}</td>
                  <td>{r.targetRole}</td>
                  <td>
                    <span className={`tag ${atsColor(r.atsScore)}`}>{r.atsScore}%</span>
                  </td>
                  <td>{r.uploads}</td>
                  <td>{r.date}</td>
                </tr>
              ))}
              {resumes.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '2rem' }}>
                    No resumes found
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

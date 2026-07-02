'use client';

import { useState, useEffect } from 'react';
import { ScrollText } from 'lucide-react';
import { getAuditLogs, type AuditLog } from '@/lib/admin-store';

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { getAuditLogs().then((l) => { setLogs(l); setLoaded(true); }); }, []);

  return (
    <>
      <div className="app-head"><div><h2>Audit Log</h2><p>Recent administrative actions across the platform.</p></div></div>
      <div className="widget">
        {!loaded ? null : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-3)' }}>
            <ScrollText size={32} style={{ opacity: 0.3, marginBottom: '.6rem' }} />
            <p>No audit entries yet.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="adm">
              <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Target</th></tr></thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{l.date}</td>
                    <td>{l.actorEmail}</td>
                    <td><span className="tag blue">{l.action}</span></td>
                    <td style={{ color: 'var(--text-2)' }}>{l.targetType}{l.targetId ? ` · ${l.targetId.slice(0, 12)}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

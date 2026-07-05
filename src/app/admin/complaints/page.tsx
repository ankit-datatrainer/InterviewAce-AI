'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageSquareWarning, RefreshCw, Send } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { getAllComplaints, updateComplaint, type Complaint, type ComplaintStatus } from '@/lib/complaints';

const statusColor = (s: ComplaintStatus) => (s === 'open' ? 'red' : s === 'in_progress' ? 'amber' : 'green');
const statusLabel = (s: ComplaintStatus) => (s === 'open' ? 'Open' : s === 'in_progress' ? 'In progress' : 'Resolved');
const FILTERS: (ComplaintStatus | 'all')[] = ['all', 'open', 'in_progress', 'resolved'];

export default function AdminComplaintsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Complaint[]>([]);
  const [filter, setFilter] = useState<ComplaintStatus | 'all'>('all');
  const [loaded, setLoaded] = useState(false);
  const [replyFor, setReplyFor] = useState<Complaint | null>(null);
  const [replyText, setReplyText] = useState('');

  const refresh = useCallback(async () => {
    try { setItems(await getAllComplaints()); } catch { /* table may not exist yet */ }
    setLoaded(true);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = filter === 'all' ? items : items.filter((c) => c.status === filter);
  const openCount = items.filter((c) => c.status === 'open').length;

  const setStatus = async (c: Complaint, status: ComplaintStatus) => {
    await updateComplaint(c.id, { status });
    toast(`Marked ${statusLabel(status).toLowerCase()}.`);
    refresh();
  };

  const sendReply = async () => {
    if (!replyFor) return;
    await updateComplaint(replyFor.id, { adminResponse: replyText, status: 'resolved' });
    toast('Response sent and complaint resolved.');
    setReplyFor(null); setReplyText('');
    refresh();
  };

  return (
    <>
      <div className="app-head">
        <div><h2>Complaints</h2><p>{openCount} open &middot; {items.length} total</p></div>
        <button className="btn btn-ghost btn-sm" onClick={refresh}><RefreshCw size={15} /> Refresh</button>
      </div>

      <div className="widget">
        <div className="tab-bar">
          {FILTERS.map((f) => (
            <button key={f} className={`tab-btn${filter === f ? ' on' : ''}`} onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>
              {f === 'all' ? 'All' : statusLabel(f)}
            </button>
          ))}
        </div>

        {!loaded ? null : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-3)' }}>
            <MessageSquareWarning size={34} style={{ opacity: 0.3, marginBottom: '.6rem' }} />
            <p>No complaints{filter === 'all' ? ' yet' : ' in this state'}.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {filtered.map((c) => (
              <div key={c.id} style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: '1.15rem', background: 'var(--bg-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ margin: '0 0 .3rem' }}>{c.subject} <span className={`tag ${statusColor(c.status)}`} style={{ marginLeft: 6 }}>{statusLabel(c.status)}</span></h4>
                    <div style={{ fontSize: '.82rem', color: 'var(--text-3)', marginBottom: '.5rem' }}>
                      {c.userName}{c.userEmail ? ` · ${c.userEmail}` : ''}{c.coachName ? ` · about ${c.coachName}` : ''} · {new Date(c.createdAt).toLocaleDateString()}
                    </div>
                    <p style={{ fontSize: '.9rem', color: 'var(--text-2)', margin: 0 }}>{c.message}</p>
                    {c.adminResponse && (
                      <p style={{ fontSize: '.85rem', color: 'var(--text-2)', marginTop: '.5rem', paddingLeft: '.7rem', borderLeft: '2px solid var(--blue)' }}>
                        <strong>Your response:</strong> {c.adminResponse}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem', flexShrink: 0 }}>
                    {c.status === 'open' && <button className="btn btn-ghost btn-sm" onClick={() => setStatus(c, 'in_progress')}>Start</button>}
                    {c.status !== 'resolved' && <button className="btn btn-primary btn-sm" onClick={() => { setReplyFor(c); setReplyText(c.adminResponse || ''); }}><Send size={13} /> Respond</button>}
                    {c.status === 'resolved' && <button className="btn btn-ghost btn-sm" onClick={() => setStatus(c, 'open')}>Reopen</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {replyFor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setReplyFor(null)}>
          <div className="widget" style={{ maxWidth: 480, width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <h4 style={{ marginTop: 0 }}>Respond · {replyFor.subject}</h4>
            <textarea className="input" rows={5} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Your response to the user…" />
            <div style={{ display: 'flex', gap: '.5rem', marginTop: '1rem' }}>
              <button className="btn btn-primary" onClick={sendReply} disabled={!replyText.trim()}>Send &amp; resolve</button>
              <button className="btn btn-ghost" onClick={() => setReplyFor(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

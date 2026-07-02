'use client';

import { useState, useEffect, useCallback } from 'react';
import { TicketCheck } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { getAdminTickets, updateAdminTicket } from '@/lib/admin-store';
import type { AdminTicket } from '@/lib/admin-store';

const priorityColor = (p: AdminTicket['priority']) =>
  p === 'High' ? 'red' : p === 'Medium' ? 'amber' : 'blue';

const statusColor = (s: AdminTicket['status']) =>
  s === 'Open' ? 'red' : s === 'In progress' ? 'blue' : s === 'Resolved' ? 'green' : 'amber';

const FILTERS = ['All', 'Open', 'In progress', 'Resolved', 'Escalated'] as const;

export default function SupportTicketsPage() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [filter, setFilter] = useState<string>('All');

  const refresh = useCallback(async () => setTickets(await getAdminTickets()), []);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = filter === 'All' ? tickets : tickets.filter((t) => t.status === filter);
  const openCount = tickets.filter((t) => t.status === 'Open').length;

  const handleAction = async (ticket: AdminTicket) => {
    let newStatus: AdminTicket['status'];
    let msg: string;

    switch (ticket.status) {
      case 'Open':
        newStatus = 'In progress';
        msg = 'Ticket marked as in progress';
        break;
      case 'In progress':
        newStatus = 'Resolved';
        msg = 'Ticket resolved';
        break;
      case 'Resolved':
        newStatus = 'Open';
        msg = 'Ticket reopened';
        break;
      default:
        newStatus = 'In progress';
        msg = 'Ticket de-escalated to in progress';
        break;
    }

    await updateAdminTicket(ticket.id, { status: newStatus });
    refresh();
    toast(msg);
  };

  const actionLabel = (status: AdminTicket['status']) => {
    switch (status) {
      case 'Open': return 'Mark in progress';
      case 'In progress': return 'Resolve';
      case 'Resolved': return 'Reopen';
      case 'Escalated': return 'De-escalate';
    }
  };

  return (
    <>
      <div className="app-head">
        <div>
          <h2>Support Tickets</h2>
          <p>{openCount} open ticket{openCount !== 1 ? 's' : ''} &middot; {tickets.length} total</p>
        </div>
        <span className="tag red" style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
          <TicketCheck size={14} /> {openCount} open
        </span>
      </div>

      <div className="widget">
        <div className="tab-bar">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={`tab-btn${filter === f ? ' on' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="table-wrap">
          <table className="adm">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>User</th>
                <th>Subject</th>
                <th>Priority</th>
                <th>Age</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600 }}>{t.id}</td>
                  <td>{t.userName}</td>
                  <td>{t.subject}</td>
                  <td><span className={`tag ${priorityColor(t.priority)}`}>{t.priority}</span></td>
                  <td>{t.age}</td>
                  <td><span className={`tag ${statusColor(t.status)}`}>{t.status}</span></td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleAction(t)}
                    >
                      {actionLabel(t.status)}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '2rem' }}>
                    No tickets matching this filter
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

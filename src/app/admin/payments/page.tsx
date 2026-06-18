'use client';

import { useState, useEffect, useCallback } from 'react';
import { IndianRupee } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { getAdminPayments, updateAdminPayment } from '@/lib/admin-store';
import type { AdminPayment } from '@/lib/admin-store';

const statusColor = (s: AdminPayment['status']) =>
  s === 'Paid' ? 'green' : s === 'Failed' ? 'red' : 'amber';

const FILTERS = ['All', 'Paid', 'Failed', 'Refund req.'] as const;

export default function PaymentsPage() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [filter, setFilter] = useState<string>('All');

  const refresh = useCallback(() => setPayments(getAdminPayments()), []);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = filter === 'All' ? payments : payments.filter((p) => p.status === filter);

  const totalCollected = payments.reduce((sum, p) => {
    if (p.status !== 'Paid') return sum;
    const num = Number(p.amount.replace(/,/g, ''));
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  const handleRetry = (id: string) => {
    updateAdminPayment(id, { status: 'Paid' });
    refresh();
    toast('Payment retried successfully');
  };

  const handleApproveRefund = (id: string) => {
    updateAdminPayment(id, { status: 'Paid' });
    refresh();
    toast('Refund approved and processed');
  };

  return (
    <>
      <div className="app-head">
        <div>
          <h2>Payments</h2>
          <p>Total collected: &#8377;{totalCollected.toLocaleString('en-IN')}</p>
        </div>
        <span className="tag green" style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
          <IndianRupee size={14} /> &#8377;{totalCollected.toLocaleString('en-IN')}
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
                <th>Transaction ID</th>
                <th>User</th>
                <th>Item</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.id}</td>
                  <td>{p.userName}</td>
                  <td>{p.item}</td>
                  <td>&#8377;{p.amount}</td>
                  <td>{p.method}</td>
                  <td><span className={`tag ${statusColor(p.status)}`}>{p.status}</span></td>
                  <td>
                    {p.status === 'Failed' && (
                      <button className="btn btn-primary btn-sm" onClick={() => handleRetry(p.id)}>
                        Retry
                      </button>
                    )}
                    {p.status === 'Refund req.' && (
                      <button className="btn btn-primary btn-sm" onClick={() => handleApproveRefund(p.id)}>
                        Approve refund
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '2rem' }}>
                    No payments matching this filter
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

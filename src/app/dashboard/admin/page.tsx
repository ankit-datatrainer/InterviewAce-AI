'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Mic,
  IndianRupee,
  TicketCheck,
  X,
  Edit2,
  Trash2,
} from 'lucide-react';
import { useToast } from '@/components/Toast';

import {
  AdminUser, AdminInterview, AdminResume, AdminCoach, AdminPayment, AdminTicket,
  getAdminUsers, updateAdminUser, deleteAdminUser,
  getAdminInterviews, updateAdminInterview, deleteAdminInterview,
  getAdminResumes, deleteAdminResume,
  getAdminCoaches, updateAdminCoach, deleteAdminCoach,
  getAdminPayments, updateAdminPayment, deleteAdminPayment,
  getAdminTickets, updateAdminTicket, deleteAdminTicket,
  getAdminStats,
} from '@/lib/admin-store';

/* ---- Tab definitions ---- */
const tabs = [
  'User Management',
  'Interview Management',
  'Resume Reports',
  'Coach Management',
  'Payments',
  'Content',
  'Support Tickets',
];

const contentItems = [
  { label: 'Question banks', desc: '2,140 questions across 32 roles', emoji: '🎤' },
  { label: 'ATS keyword libraries', desc: '48 role profiles · updated weekly', emoji: '📄' },
  { label: 'Blog & landing copy', desc: '12 drafts awaiting review', emoji: '📰' },
  { label: 'Avatar scripts · HeyGen', desc: '6 interviewer personas', emoji: '🎬' },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState(0);
  const { toast } = useToast();

  // Data states
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [interviews, setInterviews] = useState<AdminInterview[]>([]);
  const [resumes, setResumes] = useState<AdminResume[]>([]);
  const [coaches, setCoaches] = useState<AdminCoach[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, interviewsThisWeek: 0, revenue: '0', openTickets: 0 });

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'user' | 'interview' | 'coach' | 'payment' | 'ticket' | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Load data on mount
  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setUsers(getAdminUsers());
    setInterviews(getAdminInterviews());
    setResumes(getAdminResumes());
    setCoaches(getAdminCoaches());
    setPayments(getAdminPayments());
    setTickets(getAdminTickets());
    setStats(getAdminStats());
  };

  // --- Handlers ---
  const handleEdit = (type: typeof modalType, item: any) => {
    setModalType(type);
    setEditingItem({ ...item });
    setModalOpen(true);
  };

  const handleDelete = (type: string, id: string) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;
    
    if (type === 'user') deleteAdminUser(id);
    if (type === 'interview') deleteAdminInterview(id);
    if (type === 'resume') deleteAdminResume(id);
    if (type === 'coach') deleteAdminCoach(id);
    if (type === 'payment') deleteAdminPayment(id);
    if (type === 'ticket') deleteAdminTicket(id);
    
    toast(`${type} deleted successfully.`);
    refreshData();
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalType === 'user') updateAdminUser(editingItem.id, editingItem);
    if (modalType === 'interview') updateAdminInterview(editingItem.id, editingItem);
    if (modalType === 'coach') updateAdminCoach(editingItem.id, editingItem);
    if (modalType === 'payment') updateAdminPayment(editingItem.id, editingItem);
    if (modalType === 'ticket') updateAdminTicket(editingItem.id, editingItem);
    
    toast(`${modalType} updated successfully.`);
    setModalOpen(false);
    refreshData();
  };

  // Status colors mapping for UI
  const getStatusColor = (status: string) => {
    if (['Active', 'Verified', 'Paid', 'Resolved', 'Passed', 'Excellent'].includes(status)) return 'green';
    if (['Failed', 'Suspended', 'red', 'Needs work', 'Refund req.', 'Docs pending', 'amber', 'Open', 'In progress', 'Escalated'].includes(status)) {
      return ['Failed', 'Suspended', 'red'].includes(status) ? 'red' : 'amber';
    }
    return 'blue';
  };

  return (
    <>
      <div className="app-head">
        <div>
          <h2>Admin panel</h2>
          <p>Super Admin Console &middot; live data</p>
        </div>
        <span className="tag green">All systems operational</span>
      </div>

      {/* KPI Row */}
      <div className="dash-grid" style={{ marginBottom: '1.2rem' }}>
        <div className="widget kpi">
          <span className="l" style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
            <Users size={15} /> Total users
          </span>
          <span className="v">{stats.totalUsers.toLocaleString()}</span>
        </div>
        <div className="widget kpi">
          <span className="l" style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
            <Mic size={15} /> Interviews this week
          </span>
          <span className="v">{stats.interviewsThisWeek.toLocaleString()}</span>
        </div>
        <div className="widget kpi">
          <span className="l" style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
            <IndianRupee size={15} /> Revenue this month
          </span>
          <span className="v">{'\u20B9'}{stats.revenue}</span>
        </div>
        <div className="widget kpi">
          <span className="l" style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
            <TicketCheck size={15} /> Open support tickets
          </span>
          <span className="v">{stats.openTickets}</span>
        </div>
      </div>

      {/* Tabbed widget */}
      <div className="widget">
        <div className="tab-bar" style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
          {tabs.map((t, i) => (
            <button
              key={t}
              className={`tab-btn${activeTab === i ? ' on' : ''}`}
              onClick={() => setActiveTab(i)}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab 0: User Management */}
        {activeTab === 0 && (
          <div className="admin-tab table-wrap">
            <table className="adm">
              <thead>
                <tr>
                  <th>User</th><th>Plan</th><th>Interviews</th><th>Joined</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <span className="mini-ava" style={{ background: u.color }}>{u.initials}</span>
                      <div style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                        <div>{u.name}</div>
                        <div style={{ fontSize: '.75rem', color: 'var(--text-3)' }}>{u.email}</div>
                      </div>
                    </td>
                    <td>{u.plan}</td>
                    <td>{u.interviews}</td>
                    <td>{u.joined}</td>
                    <td><span className={`tag ${getStatusColor(u.status)}`}>{u.status}</span></td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleEdit('user', u)} title="Edit"><Edit2 size={14} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete('user', u.id)} style={{ color: '#EF4444' }} title="Delete"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={6} style={{textAlign:'center'}}>No users found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 1: Interview Management */}
        {activeTab === 1 && (
          <div className="admin-tab table-wrap">
            <table className="adm">
              <thead>
                <tr>
                  <th>Session</th><th>User</th><th>Type</th><th>Duration</th><th>Score</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {interviews.map((iv) => (
                  <tr key={iv.id}>
                    <td style={{ fontWeight: 600 }}>#{iv.id.toUpperCase()}</td>
                    <td>{iv.userName}</td>
                    <td>{iv.type}</td>
                    <td>{iv.duration}</td>
                    <td>{iv.score}</td>
                    <td><span className={`tag ${getStatusColor(iv.flagTag || iv.flag)}`}>{iv.flag}</span></td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleEdit('interview', iv)} title="Edit"><Edit2 size={14} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete('interview', iv.id)} style={{ color: '#EF4444' }} title="Delete"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
                {interviews.length === 0 && <tr><td colSpan={7} style={{textAlign:'center'}}>No interviews found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Resume Reports */}
        {activeTab === 2 && (
          <div className="admin-tab table-wrap">
            <table className="adm">
              <thead>
                <tr>
                  <th>Resume</th><th>User</th><th>Target role</th><th>ATS score</th><th>Uploads</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {resumes.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.fileName}</td>
                    <td>{r.userName}</td>
                    <td>{r.targetRole}</td>
                    <td><span className={`tag ${r.atsScore >= 75 ? 'green' : r.atsScore >= 60 ? 'amber' : 'red'}`}>{r.atsScore}</span></td>
                    <td>{r.uploads}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete('resume', r.id)} style={{ color: '#EF4444' }} title="Delete"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
                {resumes.length === 0 && <tr><td colSpan={6} style={{textAlign:'center'}}>No resumes found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Coach Management */}
        {activeTab === 3 && (
          <div className="admin-tab table-wrap">
            <table className="adm">
              <thead>
                <tr>
                  <th>Coach</th><th>Category</th><th>Rating</th><th>Sessions</th><th>Payout due</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {coaches.map((c) => (
                  <tr key={c.id}>
                    <td><span className="mini-ava" style={{ background: c.color }}>{c.initials}</span>{c.name}</td>
                    <td>{c.category}</td>
                    <td>{c.rating} &#9733;</td>
                    <td>{c.sessions}</td>
                    <td>{'\u20B9'}{c.payoutDue}</td>
                    <td><span className={`tag ${getStatusColor(c.status)}`}>{c.status}</span></td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleEdit('coach', c)} title="Edit"><Edit2 size={14} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete('coach', c.id)} style={{ color: '#EF4444' }} title="Delete"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
                {coaches.length === 0 && <tr><td colSpan={7} style={{textAlign:'center'}}>No coaches found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Payments */}
        {activeTab === 4 && (
          <div className="admin-tab table-wrap">
            <table className="adm">
              <thead>
                <tr>
                  <th>Txn</th><th>User</th><th>Item</th><th>Amount</th><th>Method</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>#{p.id.toUpperCase()}</td>
                    <td>{p.userName}</td>
                    <td>{p.item}</td>
                    <td>{'\u20B9'}{p.amount}</td>
                    <td>{p.method}</td>
                    <td><span className={`tag ${getStatusColor(p.status)}`}>{p.status}</span></td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleEdit('payment', p)} title="Edit"><Edit2 size={14} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete('payment', p.id)} style={{ color: '#EF4444' }} title="Delete"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && <tr><td colSpan={7} style={{textAlign:'center'}}>No payments found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 5: Content */}
        {activeTab === 5 && (
          <div className="admin-tab">
            <div style={{ marginBottom: '1rem', color: 'var(--text-2)' }}>Manage platform-wide content and configurations.</div>
            {contentItems.map((item) => (
                <div className="builder-sec" key={item.label}>
                  <div>
                    <b>{item.emoji} {item.label}</b>{' '}
                    <span style={{ color: 'var(--text-3)', fontSize: '.8rem' }}>&middot; {item.desc}</span>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => toast('Opening ' + item.label + '...')}>Manage</button>
                </div>
            ))}
          </div>
        )}

        {/* Tab 6: Support Tickets */}
        {activeTab === 6 && (
          <div className="admin-tab table-wrap">
            <table className="adm">
              <thead>
                <tr>
                  <th>Ticket</th><th>User</th><th>Subject</th><th>Priority</th><th>Age</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>#{t.id.toUpperCase()}</td>
                    <td>{t.userName}</td>
                    <td>{t.subject}</td>
                    <td><span className={`tag ${getStatusColor(t.priority === 'High' ? 'red' : t.priority === 'Medium' ? 'amber' : 'blue')}`}>{t.priority}</span></td>
                    <td>{t.age}</td>
                    <td><span className={`tag ${getStatusColor(t.status)}`}>{t.status}</span></td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleEdit('ticket', t)} title="Edit"><Edit2 size={14} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete('ticket', t.id)} style={{ color: '#EF4444' }} title="Delete"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
                {tickets.length === 0 && <tr><td colSpan={7} style={{textAlign:'center'}}>No tickets found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- EDIT MODAL --- */}
      {modalOpen && editingItem && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" style={{ maxWidth: '500px', width: '100%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3 style={{ textTransform: 'capitalize' }}>Edit {modalType}</h3>
              <button className="btn-close" type="button" onClick={() => setModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSaveModal}>
                
                {/* USER FIELDS */}
                {modalType === 'user' && (
                  <>
                    <div className="field">
                      <label>Name</label>
                      <input type="text" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} required />
                    </div>
                    <div className="field">
                      <label>Email</label>
                      <input type="email" value={editingItem.email} onChange={e => setEditingItem({...editingItem, email: e.target.value})} required />
                    </div>
                    <div className="form-row">
                      <div className="field">
                        <label>Plan</label>
                        <select value={editingItem.plan} onChange={e => setEditingItem({...editingItem, plan: e.target.value})}>
                          <option value="Free">Free</option>
                          <option value="Pro">Pro</option>
                          <option value="Premium">Premium</option>
                        </select>
                      </div>
                      <div className="field">
                        <label>Status</label>
                        <select value={editingItem.status} onChange={e => setEditingItem({...editingItem, status: e.target.value})}>
                          <option value="Active">Active</option>
                          <option value="Trial">Trial</option>
                          <option value="Payment due">Payment due</option>
                          <option value="Suspended">Suspended</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {/* INTERVIEW FIELDS */}
                {modalType === 'interview' && (
                  <>
                    <div className="field">
                      <label>Score</label>
                      <input type="text" value={editingItem.score} onChange={e => setEditingItem({...editingItem, score: e.target.value})} required />
                    </div>
                    <div className="field">
                      <label>Status / Flag</label>
                      <input type="text" value={editingItem.flag} onChange={e => setEditingItem({...editingItem, flag: e.target.value})} required />
                    </div>
                  </>
                )}

                {/* COACH FIELDS */}
                {modalType === 'coach' && (
                  <>
                    <div className="field">
                      <label>Name</label>
                      <input type="text" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} required />
                    </div>
                    <div className="form-row">
                      <div className="field">
                        <label>Category</label>
                        <input type="text" value={editingItem.category} onChange={e => setEditingItem({...editingItem, category: e.target.value})} required />
                      </div>
                      <div className="field">
                        <label>Rating</label>
                        <input type="number" step="0.1" value={editingItem.rating} onChange={e => setEditingItem({...editingItem, rating: e.target.value})} required />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="field">
                        <label>Payout Due (₹)</label>
                        <input type="text" value={editingItem.payoutDue} onChange={e => setEditingItem({...editingItem, payoutDue: e.target.value})} required />
                      </div>
                      <div className="field">
                        <label>Status</label>
                        <select value={editingItem.status} onChange={e => setEditingItem({...editingItem, status: e.target.value})}>
                          <option value="Verified">Verified</option>
                          <option value="Docs pending">Docs pending</option>
                          <option value="Paused">Paused</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {/* PAYMENT FIELDS */}
                {modalType === 'payment' && (
                  <>
                    <div className="field">
                      <label>Amount (₹)</label>
                      <input type="text" value={editingItem.amount} onChange={e => setEditingItem({...editingItem, amount: e.target.value})} required />
                    </div>
                    <div className="field">
                      <label>Status</label>
                      <select value={editingItem.status} onChange={e => setEditingItem({...editingItem, status: e.target.value})}>
                        <option value="Paid">Paid</option>
                        <option value="Failed">Failed</option>
                        <option value="Refund req.">Refund req.</option>
                        <option value="Refunded">Refunded</option>
                      </select>
                    </div>
                  </>
                )}

                {/* TICKET FIELDS */}
                {modalType === 'ticket' && (
                  <>
                    <div className="field">
                      <label>Subject</label>
                      <input type="text" value={editingItem.subject} onChange={e => setEditingItem({...editingItem, subject: e.target.value})} required />
                    </div>
                    <div className="form-row">
                      <div className="field">
                        <label>Priority</label>
                        <select value={editingItem.priority} onChange={e => setEditingItem({...editingItem, priority: e.target.value})}>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      </div>
                      <div className="field">
                        <label>Status</label>
                        <select value={editingItem.status} onChange={e => setEditingItem({...editingItem, status: e.target.value})}>
                          <option value="Open">Open</option>
                          <option value="In progress">In progress</option>
                          <option value="Escalated">Escalated</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                <div className="modal-foot">
                  <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Global Modal Styles */}
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        .modal {
          background: var(--bg);
          border: 1px solid var(--line);
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          overflow: hidden;
        }
        .modal-head {
          padding: 1.2rem;
          border-bottom: 1px solid var(--line);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--bg-2);
        }
        .modal-body {
          padding: 1.2rem;
        }
        .modal-foot {
          margin-top: 1.5rem;
          display: flex;
          justify-content: flex-end;
          gap: .8rem;
        }
        .btn-close {
          background: none;
          border: none;
          color: var(--text-2);
          cursor: pointer;
        }
        .btn-close:hover {
          color: var(--text);
        }
      `}</style>
    </>
  );
}

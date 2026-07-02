'use client';

import { useState, useEffect, useCallback } from 'react';
import { Megaphone, Trash2 } from 'lucide-react';
import { useToast } from '@/components/Toast';
import {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  type Announcement,
} from '@/lib/admin-store';

export default function AnnouncementsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Announcement[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'all' | 'students' | 'coaches'>('all');
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => setItems(await getAnnouncements()), []);
  useEffect(() => { refresh(); }, [refresh]);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) { toast('Title and message are required.'); return; }
    setSaving(true);
    await createAnnouncement(title.trim(), body.trim(), audience);
    setSaving(false);
    toast('Announcement published.');
    setTitle(''); setBody(''); setAudience('all');
    refresh();
  };

  const handleDelete = async (id: string) => {
    await deleteAnnouncement(id);
    toast('Announcement deleted.');
    refresh();
  };

  return (
    <>
      <div className="app-head"><div><h2>Announcements</h2><p>Broadcast messages to students and coaches.</p></div></div>

      <div className="widget" style={{ marginBottom: '1rem' }}>
        <h4>New announcement</h4>
        <div className="field"><label>Title</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Scheduled maintenance Sunday" /></div>
        <div className="field"><label>Message</label><textarea className="input" rows={3} value={body} onChange={(e) => setBody(e.target.value)} /></div>
        <div className="field" style={{ maxWidth: 240 }}>
          <label>Audience</label>
          <select className="input" value={audience} onChange={(e) => setAudience(e.target.value as any)}>
            <option value="all">Everyone</option>
            <option value="students">Students only</option>
            <option value="coaches">Coaches only</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={handleSend} disabled={saving}><Megaphone size={16} /> {saving ? 'Publishing…' : 'Publish'}</button>
      </div>

      <div className="widget">
        <h4>Published</h4>
        {items.length === 0 ? (
          <p style={{ color: 'var(--text-3)', padding: '1rem 0' }}>No announcements yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '.8rem' }}>
            {items.map((a) => (
              <div key={a.id} className="list-row" style={{ alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{a.title} <span className="tag blue" style={{ marginLeft: 6, textTransform: 'capitalize' }}>{a.audience}</span></span>
                  <div className="meta">{a.body}</div>
                  <div className="meta" style={{ color: 'var(--text-3)' }}>{a.date}</div>
                </div>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error-text)' }} onClick={() => handleDelete(a.id)}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

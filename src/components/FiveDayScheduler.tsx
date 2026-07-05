'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, Plus, Trash2, CalendarDays } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { getDateSlots, addDateSlot, removeDateSlot, type DateSlot } from '@/lib/coach-store';

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Next `count` days starting tomorrow (aligns with when students can book). */
function upcomingDays(count: number): Date[] {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i + 1);
    return d;
  });
}

/**
 * Date-specific session manager. Shows a card per upcoming day; click a card to
 * open it and add/remove exact session timings for that date. Shared by the
 * Coach Portal and the Super Admin coach page — `coachId` decides whose
 * calendar is edited (RLS enforces who is allowed to).
 */
export default function FiveDayScheduler({ coachId, days = 5 }: { coachId: string; days?: number }) {
  const { toast } = useToast();
  const [slots, setSlots] = useState<DateSlot[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<string>(() => iso(upcomingDays(1)[0]));
  const [start, setStart] = useState('10:00');
  const [end, setEnd] = useState('11:00');
  const [busy, setBusy] = useState(false);

  const dates = upcomingDays(days);

  const load = useCallback(() => {
    getDateSlots(coachId).then((s) => { setSlots(s); setLoaded(true); }).catch(() => setLoaded(true));
  }, [coachId]);
  useEffect(() => { load(); }, [load]);

  const slotsFor = (dateStr: string) => slots.filter((s) => s.slotDate === dateStr);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (start >= end) { toast('End time must be after start time.'); return; }
    setBusy(true);
    try {
      await addDateSlot(coachId, selected, start, end);
      toast(`Added ${start}–${end} on ${selected}.`);
      load();
    } catch {
      toast('Could not add the slot. Did you run deploy/phase4-update.sql?');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (id: string) => {
    await removeDateSlot(id);
    toast('Slot removed.');
    load();
  };

  return (
    <div>
      {/* Day cards */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))`, gap: '.6rem', marginBottom: '1.25rem' }}>
        {dates.map((d) => {
          const dateStr = iso(d);
          const count = slotsFor(dateStr).length;
          const active = selected === dateStr;
          return (
            <button
              key={dateStr}
              onClick={() => setSelected(dateStr)}
              style={{
                textAlign: 'center', padding: '.85rem .5rem', borderRadius: 12, cursor: 'pointer',
                background: active ? 'linear-gradient(135deg, rgba(37,99,235,0.15), rgba(16,185,129,0.08))' : 'var(--bg-2)',
                border: active ? '1.5px solid var(--blue)' : '1px solid var(--line)',
                transition: 'all .15s ease',
              }}
            >
              <div style={{ fontSize: '.72rem', textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-3)' }}>
                {d.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.2 }}>{d.getDate()}</div>
              <div style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>{d.toLocaleDateString('en-US', { month: 'short' })}</div>
              <div style={{ marginTop: '.4rem' }}>
                {count > 0
                  ? <span className="tag green" style={{ fontSize: '.68rem' }}>{count} slot{count !== 1 ? 's' : ''}</span>
                  : <span className="tag" style={{ fontSize: '.68rem', color: 'var(--text-3)' }}>none</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected day's sessions */}
      <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: '1.1rem', background: 'var(--bg-2)' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '.5rem', margin: '0 0 .9rem' }}>
          <CalendarDays size={16} style={{ color: 'var(--blue)' }} />
          {new Date(`${selected}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </h4>

        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '.75rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div className="field" style={{ marginBottom: 0, minWidth: 120 }}>
            <label>Start</label>
            <input type="time" className="input" value={start} onChange={(e) => setStart(e.target.value)} required />
          </div>
          <div className="field" style={{ marginBottom: 0, minWidth: 120 }}>
            <label>End</label>
            <input type="time" className="input" value={end} onChange={(e) => setEnd(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ height: 42 }} disabled={busy}><Plus size={17} /> Add session</button>
        </form>

        {!loaded ? null : slotsFor(selected).length === 0 ? (
          <p style={{ color: 'var(--text-3)', fontSize: '.88rem' }}>No sessions set for this day yet. Add one above.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {slotsFor(selected).map((s) => (
              <div key={s.id} className="list-row" style={{ background: 'var(--bg-1, var(--bg-2))', borderRadius: 8, padding: '.55rem .8rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                  <Clock size={14} style={{ color: 'var(--blue)' }} /> {s.startTime} – {s.endTime}
                </span>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error-text, #ef4444)' }} onClick={() => handleRemove(s.id)}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';
import { Clock, Plus, Trash2 } from 'lucide-react';
import CoachShell from '@/components/CoachShell';
import {
  getAvailability,
  addAvailability,
  removeAvailability,
  WEEKDAYS,
  type CoachProfile,
  type AvailabilitySlot,
} from '@/lib/coach-store';

function AvailabilityInner({ coach }: { coach: CoachProfile }) {
  const { toast } = useToast();
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [weekday, setWeekday] = useState(1);
  const [start, setStart] = useState('10:00');
  const [end, setEnd] = useState('11:00');
  const [loaded, setLoaded] = useState(false);

  const load = () => getAvailability(coach.id).then((s) => { setSlots(s); setLoaded(true); });
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [coach.id]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (start >= end) {
      toast('End time must be after start time.');
      return;
    }
    await addAvailability(coach.id, weekday, start, end);
    toast(`Added ${WEEKDAYS[weekday]} ${start}–${end}.`);
    load();
  };

  const handleRemove = async (id: string) => {
    await removeAvailability(id);
    toast('Slot removed.');
    load();
  };

  const byDay = WEEKDAYS.map((_, i) => slots.filter((s) => s.weekday === i));

  return (
    <>
      <div className="app-head">
        <div><h2>Weekly Availability</h2><p>Set the recurring weekly hours when students can book you.</p></div>
      </div>

      <div className="widget" style={{ marginBottom: '1.5rem' }}>
        <h4>Add recurring slot</h4>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="field" style={{ marginBottom: 0, minWidth: 160 }}>
            <label>Day</label>
            <select className="input" value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
              {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, minWidth: 130 }}>
            <label>Start</label>
            <input type="time" className="input" value={start} onChange={(e) => setStart(e.target.value)} required />
          </div>
          <div className="field" style={{ marginBottom: 0, minWidth: 130 }}>
            <label>End</label>
            <input type="time" className="input" value={end} onChange={(e) => setEnd(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ height: '42px' }}><Plus size={18} /> Add</button>
        </form>
      </div>

      <div className="dash-grid-2">
        {WEEKDAYS.map((day, i) => (
          <div className="widget" key={day}>
            <h4>{day}</h4>
            {!loaded ? null : byDay[i].length === 0 ? (
              <p style={{ color: 'var(--text-3)', fontSize: '.88rem' }}>Not available</p>
            ) : (
              byDay[i].map((s) => (
                <div className="list-row" key={s.id}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    <Clock size={14} style={{ color: 'var(--blue)' }} /> {s.startTime} – {s.endTime}
                  </span>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error-text)' }} onClick={() => handleRemove(s.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </>
  );
}

export default function CoachAvailabilityPage() {
  return <CoachShell>{(coach) => <AvailabilityInner coach={coach} />}</CoachShell>;
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Star, Clock, Calendar, Video, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/Toast';
import type { PublicCoach } from '@/lib/coach-types';

type Coach = PublicCoach;

function initials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?';
}

export default function CoachingPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loaded, setLoaded] = useState(false);

  // The admin panel is the single source of truth — whatever's approved and
  // visible there is exactly what shows here.
  useEffect(() => {
    fetch('/api/coaching/coaches')
      .then((r) => r.json())
      .then((data: Coach[]) => { if (Array.isArray(data)) setCoaches(data); })
      .catch(() => { /* keep empty */ })
      .finally(() => setLoaded(true));
  }, []);

  const filteredCoaches = coaches.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.tags.some(t => t.toLowerCase().includes(search.toLowerCase())) ||
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleBook = (coach: Coach) => {
    router.push(`/dashboard/coaching/${coach.slug}`);
  };

  return (
    <>
      <div className="app-head">
        <div>
          <h2>1-on-1 Coaching</h2>
          <p>Book personalized sessions with industry experts</p>
        </div>
      </div>

      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
          <input 
            type="text" 
            className="input" 
            placeholder="Search by role, company, or skill..." 
            style={{ paddingLeft: '2.5rem' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {!loaded ? (
        <div className="widget" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-3)' }}>
          <p>Loading coaches…</p>
        </div>
      ) : filteredCoaches.length === 0 ? (
        <div className="widget" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-3)' }}>
          <p>No coaches available right now. Check back soon.</p>
        </div>
      ) : (
      <div className="coach-grid">
        {filteredCoaches.map(coach => (
          <div key={coach.id} className="widget" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-2)', display: 'grid', placeItems: 'center', fontWeight: 700, color: 'var(--text-2)', fontSize: '1.1rem' }}>
                {coach.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coach.image} alt={coach.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  initials(coach.name)
                )}
              </div>
              <div>
                <h3 style={{ margin: '0 0 .25rem 0', fontSize: '1.2rem' }}>{coach.name}</h3>
                <p style={{ margin: 0, color: 'var(--text-2)', fontSize: '.95rem' }}>{coach.title}</p>
                {coach.experience && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', marginTop: '.4rem', padding: '.2rem .5rem', background: 'var(--primary-glow)', color: 'var(--primary)', borderRadius: '4px', fontSize: '.8rem', fontWeight: 'bold' }}>
                    <Star size={12} fill="currentColor" /> {coach.experience}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginTop: '.4rem', fontSize: '.9rem', color: '#f59e0b', fontWeight: 'bold' }}>
                  <Star size={14} fill="currentColor" /> {coach.rating} <span style={{ color: 'var(--text-3)', fontWeight: 'normal' }}>({coach.reviews} reviews)</span>
                </div>
              </div>
            </div>
            
            <p style={{ 
              color: 'var(--text)', 
              fontSize: '.95rem', 
              marginBottom: '1rem', 
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {coach.bio}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: '1.5rem' }}>
              {coach.tags.map(t => (
                <span key={t} style={{ background: 'var(--bg-2)', color: 'var(--text-2)', padding: '.2rem .6rem', borderRadius: '1rem', fontSize: '.8rem' }}>
                  {t}
                </span>
              ))}
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: '1rem' }}>
              <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{coach.price}</span>
              <button className="btn btn-primary btn-sm" onClick={() => handleBook(coach)}>
                Book Session
              </button>
            </div>
          </div>
        ))}
      </div>
      )}

    </>
  );
}

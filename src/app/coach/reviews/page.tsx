'use client';

import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import CoachShell from '@/components/CoachShell';
import { getMyReviews, type CoachProfile, type CoachReview } from '@/lib/coach-store';

function Stars({ n }: { n: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2, color: '#F59E0B' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={15} fill={i <= n ? 'currentColor' : 'none'} />
      ))}
    </span>
  );
}

function ReviewsInner({ coach }: { coach: CoachProfile }) {
  const [reviews, setReviews] = useState<CoachReview[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { getMyReviews(coach.id).then((r) => { setReviews(r); setLoaded(true); }); }, [coach.id]);

  if (!loaded) return null;

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : coach.rating;

  return (
    <>
      <div className="app-head">
        <div><h2>Reviews</h2><p>{reviews.length} review{reviews.length !== 1 ? 's' : ''} · {avg.toFixed(1)}★ average</p></div>
      </div>

      <div className="widget">
        {reviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-3)' }}>
            <Star size={36} style={{ opacity: 0.3, marginBottom: '.6rem' }} />
            <p>No reviews yet.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {reviews.map((r) => (
              <div key={r.id} style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: '1.25rem', background: 'var(--bg-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.4rem' }}>
                  <strong>{r.studentName}</strong>
                  <Stars n={r.rating} />
                </div>
                {r.comment && <p style={{ color: 'var(--text-2)', fontSize: '.92rem', margin: '.3rem 0' }}>{r.comment}</p>}
                <span style={{ color: 'var(--text-3)', fontSize: '.8rem' }}>{r.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default function CoachReviewsPage() {
  return <CoachShell>{(coach) => <ReviewsInner coach={coach} />}</CoachShell>;
}

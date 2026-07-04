'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Star, Clock, Calendar, CheckCircle, Video } from 'lucide-react';
import { useToast } from '@/components/Toast';
import type { PublicCoach } from '@/lib/coach-types';
import { saveBooking } from '@/lib/booking-store';
import { getCoachBookingInfo, createCoachBooking, type CoachBookingInfo, type BookableSlot } from '@/lib/student-booking';
import { getSessionWindow } from '@/lib/session-window';

type Coach = PublicCoach;

export default function InstructorPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [coach, setCoach] = useState<Coach | null>(null);
  const [bookingStep, setBookingStep] = useState<1 | 2 | 3>(1);
  const [generatedRoomId, setGeneratedRoomId] = useState<string>('session-123');

  const [info, setInfo] = useState<CoachBookingInfo | null>(null);
  const [selected, setSelected] = useState<BookableSlot | null>(null);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState<BookableSlot | null>(null);
  const [showBookedPopup, setShowBookedPopup] = useState(false);
  const [countdown, setCountdown] = useState<string | null>(null);

  // Countdown until the scheduled session begins (from the booked slot's
  // date + start time), refreshed every second.
  useEffect(() => {
    if (!booked) return;
    const startAt = new Date(`${booked.date}T${booked.time.split(' - ')[0]}:00`);
    const tick = () => {
      const ms = startAt.getTime() - Date.now();
      if (ms <= 0) { setCountdown('Your session is starting now — you can join!'); return; }
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setCountdown(`${d > 0 ? d + 'd ' : ''}${h}h ${m}m ${s}s`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [booked]);

  const [coachLoaded, setCoachLoaded] = useState(false);

  // The admin panel is the single source of truth for coach data.
  useEffect(() => {
    if (!params?.slug) return;
    fetch('/api/coaching/coaches')
      .then((r) => r.json())
      .then((data: Coach[]) => {
        if (!Array.isArray(data)) return;
        const found = data.find((c) => c.slug === params.slug);
        if (found) setCoach(found);
      })
      .catch(() => { /* keep null — page shows "not found" */ })
      .finally(() => setCoachLoaded(true));
  }, [params?.slug]);

  // Load the coach's published availability (set in their Coach Portal).
  useEffect(() => {
    if (!coach) return;
    getCoachBookingInfo(coach.name).then(setInfo);
  }, [coach]);

  async function handleConfirm() {
    if (!coach || !selected) return;
    setBooking(true);
    try {
      // Mint a real VideoSDK room both the coach and student will join.
      let roomId = '';
      try {
        const res = await fetch('/api/videosdk/room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (data.roomId) roomId = data.roomId;
      } catch { /* fall back below */ }
      if (!roomId) roomId = 'room-' + Math.random().toString(36).substring(2, 9);

      const amount = info?.pricePerSession ?? (parseInt(String(coach.price).replace(/[^\d]/g, ''), 10) || 0);

      // Persist to Supabase so the coach sees it in their portal (if they're a DB coach).
      await createCoachBooking({
        coachId: info?.coachId ?? null,
        date: selected.date,
        timeSlot: selected.time,
        goal: 'Live Coaching Session',
        roomId,
        amount,
      });

      // Always record locally so the student dashboard + room work.
      saveBooking({
        id: 'bk-' + Math.random().toString(36).substring(2, 9),
        coachName: coach.name,
        coachCategory: coach.tags[0] || 'General',
        date: selected.date,
        timeSlot: selected.time,
        goal: 'Live Coaching Session',
        status: 'upcoming',
        price: coach.price,
        bookedAt: new Date().toISOString(),
        roomId,
      });

      // Confirmation email with the meeting link (fire-and-forget).
      fetch('/api/coaching/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachName: coach.name, date: selected.date, timeSlot: selected.time, roomId }),
      }).catch(() => { /* email is best-effort */ });

      setGeneratedRoomId(roomId);
      setBooked(selected);
      setBookingStep(3);
      setShowBookedPopup(true);
    } catch {
      toast('Could not complete the booking. Please try again.');
    } finally {
      setBooking(false);
    }
  }

  if (!coach) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-2)' }}>
        {coachLoaded ? (
          <>
            <p style={{ marginBottom: '1rem' }}>This coach isn&apos;t available.</p>
            <button className="btn btn-ghost btn-sm" onClick={() => router.push('/dashboard/coaching')}>Back to coaches</button>
          </>
        ) : (
          'Loading profile...'
        )}
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .profile-layout { display: flex; gap: 2.5rem; align-items: flex-start; flex-wrap: wrap; }
        .profile-left { flex: 1 1 55%; min-width: 300px; }
        .profile-right { flex: 1 1 35%; min-width: 300px; position: sticky; top: 2rem; }
        @media (max-width: 768px) {
          .profile-layout { flex-direction: column; }
          .profile-left, .profile-right { width: 100%; min-width: auto; position: static; }
        }
      `}} />
      
      <div className="app-head" style={{ marginBottom: '2rem' }}>
        <button className="btn btn-ghost" onClick={() => router.back()} style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-2)', background: 'var(--bg-2)', borderRadius: 'var(--r-full)' }}>
          <ArrowLeft size={16} /> Back to coaches
        </button>
      </div>

      {bookingStep === 3 ? (
        <>
        {/* Success popup with the required message */}
        {showBookedPopup && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
            <div className="widget" style={{ maxWidth: 460, width: '100%', textAlign: 'center', padding: '2.75rem 2rem', border: '1px solid rgba(16,185,129,0.3)' }}>
              <CheckCircle size={56} color="#10b981" style={{ margin: '0 auto 1.25rem', filter: 'drop-shadow(0 0 16px rgba(16,185,129,0.4))' }} />
              <h3 style={{ fontSize: '1.35rem', marginBottom: '.75rem' }}>Scheduled successfully!</h3>
              <p style={{ color: 'var(--text-2)', lineHeight: 1.7, margin: '0 0 1.5rem' }}>
                Your interview has been scheduled successfully. Please check your email and dashboard for the meeting link.
              </p>
              <button className="btn btn-primary" style={{ padding: '.8rem 2.2rem', borderRadius: 'var(--r-full)' }} onClick={() => setShowBookedPopup(false)}>
                Got it
              </button>
            </div>
          </div>
        )}
        <div className="widget" style={{ textAlign: 'center', padding: '4rem 2rem', maxWidth: 600, margin: '0 auto', background: 'linear-gradient(145deg, var(--bg), var(--bg-2))', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <CheckCircle size={80} color="#10b981" style={{ margin: '0 auto 1.5rem auto', filter: 'drop-shadow(0 0 20px rgba(16, 185, 129, 0.4))' }} />
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Booking Confirmed!</h2>
          <p style={{ color: 'var(--text-2)', fontSize: '1.1rem', marginBottom: '1.5rem' }}>
            Your 1-on-1 session with <strong style={{ color: 'var(--text)' }}>{coach.name}</strong> is confirmed
            {booked ? <> for <strong style={{ color: 'var(--text)' }}>{booked.label} · {booked.time}</strong></> : null}.
          </p>
          {/* Live countdown until the session begins */}
          {countdown && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '.6rem', background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.3)', color: 'var(--blue)', padding: '.7rem 1.4rem', borderRadius: 'var(--r-full)', fontWeight: 700, fontSize: '1.05rem', marginBottom: '2rem' }}>
              <Clock size={18} /> {countdown.includes('starting') ? countdown : `Starts in ${countdown}`}
            </div>
          )}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '2rem', borderRadius: 'var(--r-lg)', textAlign: 'left', marginBottom: '2.5rem', border: '1px solid var(--line)' }}>
            <p style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>📧 A confirmation email with your meeting link is on its way.</p>
            <p style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>📅 It&apos;s saved to your dashboard under upcoming sessions.</p>
            <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>🎥 A live video room is ready — {coach.name} will join from their portal.</p>
          </div>
          {/* The room opens 5 minutes before the slot — until then, only the countdown shows. */}
          {(!booked || getSessionWindow(booked.date, booked.time).canJoin) ? (
            <button className="btn btn-primary" onClick={() => router.push(`/dashboard/coaching/room/${generatedRoomId}`)} style={{ padding: '1rem 2.5rem', fontSize: '1.1rem', borderRadius: 'var(--r-full)' }}>
              Join Coaching Room
            </button>
          ) : (
            <p style={{ color: 'var(--text-3)', fontSize: '.9rem', margin: 0 }}>
              The Join button will appear here 5 minutes before your session. You can also join from your dashboard.
            </p>
          )}
        </div>
        </>
      ) : (
        <div className="profile-layout">
          
          {/* Left: Instructor Profile */}
          <div className="profile-left">
            <div className="widget" style={{ marginBottom: '2rem', padding: '3rem 2.5rem', position: 'relative', overflow: 'hidden' }}>
              {/* Decorative Background Gradient */}
              <div style={{ position: 'absolute', top: '-50%', right: '-20%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(40px)', zIndex: 0 }} />
              
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '2.5rem' }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ width: 140, height: 140, borderRadius: '50%', border: '4px solid var(--bg)', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', overflow: 'hidden', background: 'var(--bg-2)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: '2rem', color: 'var(--text-2)' }}>
                      {coach.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={coach.image} alt={coach.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        coach.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div style={{ position: 'absolute', bottom: 5, right: 5, background: '#10b981', color: '#fff', borderRadius: '50%', padding: '4px', border: '3px solid var(--bg)', zIndex: 2 }}>
                      <CheckCircle size={16} />
                    </div>
                  </div>
                  <div>
                    <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2.5rem', letterSpacing: '-0.02em' }}>{coach.name}</h1>
                    <p style={{ margin: 0, color: 'var(--blue)', fontSize: '1.2rem', fontWeight: 500 }}>{coach.title}</p>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                      {coach.experience && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', background: 'var(--primary-glow)', color: 'var(--primary)', padding: '0.4rem 1rem', borderRadius: 'var(--r-full)', fontSize: '.95rem', fontWeight: 600 }}>
                          <Star size={16} fill="currentColor" /> {coach.experience}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#f59e0b', fontWeight: 600, background: 'rgba(245, 158, 11, 0.1)', padding: '0.4rem 1rem', borderRadius: 'var(--r-full)' }}>
                        <Star size={18} fill="currentColor" /> 
                        <span>{coach.rating}</span> 
                        <span style={{ color: 'var(--text-2)', fontWeight: 'normal', fontSize: '0.9rem' }}>({coach.reviews} reviews)</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>About the Coach</h3>
                <p style={{ color: 'var(--text)', lineHeight: 1.8, fontSize: '1.1rem', marginBottom: '2.5rem', opacity: 0.9 }}>
                  {coach.bio}
                </p>

                <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Areas of Expertise</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  {coach.tags.map(t => (
                    <span key={t} style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--text)', padding: '0.6rem 1.2rem', borderRadius: 'var(--r-full)', fontSize: '0.95rem', fontWeight: 500 }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Availability + booking */}
          <div className="widget profile-right" style={{ padding: 0, background: 'var(--bg)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 24px 60px rgba(0,0,0,0.28)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            {/* Premium header band */}
            <div style={{ position: 'relative', padding: '1.75rem 2rem 1.5rem', background: 'linear-gradient(135deg, rgba(37,99,235,0.18), rgba(16,185,129,0.10))', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', fontSize: '.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--blue)', background: 'rgba(37,99,235,0.12)', padding: '.3rem .7rem', borderRadius: 'var(--r-full)', marginBottom: '.75rem' }}>
                    <Video size={13} /> 1-on-1 Live Session
                  </span>
                  <h3 style={{ margin: '0 0 0.2rem 0', fontSize: '1.45rem', letterSpacing: '-0.01em' }}>Book a Session</h3>
                  <span style={{ color: 'var(--text-2)', fontSize: '0.88rem' }}>Pick a time that works for you</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{coach.price}</div>
                  <span style={{ color: 'var(--text-3)', fontSize: '.78rem' }}>per 60-min session</span>
                </div>
              </div>
            </div>

            <div style={{ padding: '1.5rem 2rem 2rem' }}>
              {/* What's included */}
              <div style={{ display: 'grid', gap: '.6rem', marginBottom: '1.5rem' }}>
                {['60 minutes of focused 1-on-1 coaching', 'HD video call — no downloads needed', 'Personalised, actionable feedback'].map((t) => (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', fontSize: '.9rem', color: 'var(--text-2)' }}>
                    <CheckCircle size={16} style={{ color: '#10b981', flexShrink: 0 }} /> {t}
                  </div>
                ))}
              </div>

            {!info ? (
              <p style={{ color: 'var(--text-3)', padding: '1rem 0' }}>Loading availability…</p>
            ) : info.slots.length === 0 ? (
              <p style={{ color: 'var(--text-3)', padding: '1rem 0' }}>This coach hasn&apos;t published any availability yet. Please check back soon.</p>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.78rem', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '.9rem' }}>
                  <Calendar size={14} /> Available times
                </div>
                {info.source === 'default' && (
                  <p style={{ color: 'var(--text-3)', fontSize: '.8rem', marginTop: 0, marginBottom: '1rem' }}>Showing standard slots — this coach hasn&apos;t customised their schedule yet.</p>
                )}

                {/* Slots grouped by day, time chips per day */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: 340, overflowY: 'auto', margin: '0 -0.25rem 1.25rem', padding: '0 0.25rem' }}>
                  {Object.entries(
                    info.slots.reduce<Record<string, BookableSlot[]>>((acc, s) => {
                      (acc[s.label] ||= []).push(s);
                      return acc;
                    }, {}),
                  ).map(([label, daySlots]) => (
                    <div key={label}>
                      <div style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--text)', marginBottom: '.55rem' }}>{label}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
                        {daySlots.map((s) => {
                          const isSel = selected?.id === s.id;
                          return (
                            <button
                              key={s.id}
                              onClick={() => setSelected(s)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '.4rem',
                                padding: '.55rem .85rem', borderRadius: 'var(--r-full)', cursor: 'pointer',
                                border: isSel ? '1.5px solid var(--blue)' : '1px solid var(--line)',
                                background: isSel ? 'var(--blue)' : 'var(--bg-2)',
                                color: isSel ? '#fff' : 'var(--text)', fontSize: '.85rem', fontWeight: 600,
                                transition: 'all .15s ease', boxShadow: isSel ? '0 6px 16px rgba(37,99,235,0.35)' : 'none',
                              }}
                            >
                              <Clock size={13} style={{ opacity: isSel ? 0.9 : 0.6 }} /> {s.time.split(' - ')[0]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Live selection summary */}
                {selected && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.85rem 1rem', borderRadius: 'var(--r-md)', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', marginBottom: '1rem' }}>
                    <Calendar size={18} style={{ color: '#10b981', flexShrink: 0 }} />
                    <div style={{ fontSize: '.9rem' }}>
                      <div style={{ fontWeight: 600 }}>{selected.label}</div>
                      <div style={{ color: 'var(--text-2)', fontSize: '.82rem' }}>{selected.time}</div>
                    </div>
                  </div>
                )}

                <button
                  className="btn btn-primary"
                  onClick={handleConfirm}
                  disabled={!selected || booking}
                  style={{ width: '100%', justifyContent: 'center', padding: '.9rem', fontSize: '1rem', fontWeight: 600, borderRadius: 'var(--r-md)', opacity: !selected || booking ? 0.55 : 1 }}
                >
                  <Video size={17} /> {booking ? 'Booking…' : selected ? 'Confirm & Create Room' : 'Select a time'}
                </button>
                <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '.78rem', marginTop: '.85rem', marginBottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem' }}>
                  <CheckCircle size={13} /> Instant confirmation · Secure video room
                </p>
              </>
            )}
            </div>
          </div>

        </div>
      )}
    </>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  MessageCircle,
  Target,
  FileText,
  Plus,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { getInterviews, hydrateInterviews } from '@/lib/interview-store';
import type { InterviewRecord } from '@/lib/interview-store';
import { getLatestResume } from '@/lib/resume-store';
import type { ResumeRecord } from '@/lib/resume-store';
import { getUpcomingBookings } from '@/lib/booking-store';
import type { BookingRecord } from '@/lib/booking-store';
import { useSessionWindow } from '@/lib/session-window';

// The coaching room opens 5 minutes before the booked slot. Until then the
// Join button is hidden and a live countdown is shown instead.
function BookingJoinGate({ date, timeSlot, roomId }: { date: string; timeSlot: string; roomId: string }) {
  const win = useSessionWindow(date, timeSlot);
  if (win.isOver) return <span className="tag amber" style={{ fontSize: '0.75rem' }}>Ended</span>;
  if (win.canJoin) {
    return (
      <Link href={`/dashboard/coaching/room/${roomId}`} className="btn btn-primary btn-sm" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}>
        Join Live
      </Link>
    );
  }
  return (
    <span className="tag blue" style={{ fontSize: '0.75rem', fontVariantNumeric: 'tabular-nums' }}>
      Opens in {win.countdown}
    </span>
  );
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatInterviewMeta(record: InterviewRecord): string {
  const dateStr = formatRelativeDate(record.date);
  const mins = Math.round(record.duration / 60);
  return `${dateStr} \u00b7 ${mins} min \u00b7 ${record.questionsCount} questions`;
}

function scoreTag(score: number): string {
  if (score >= 80) return 'green';
  if (score >= 65) return 'amber';
  return 'red';
}

export default function DashboardPage() {
  const [firstName, setFirstName] = useState('');
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const [latestResume, setLatestResume] = useState<ResumeRecord | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<BookingRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const fullName = user.user_metadata?.full_name;
        if (fullName) {
          setFirstName(fullName.split(' ')[0]);
        } else if (user.email) {
          setFirstName(user.email.split('@')[0]);
        }
      }
    }

    setInterviews(getInterviews());
    setLatestResume(getLatestResume());
    setUpcomingBookings(getUpcomingBookings());
    setLoaded(true);
    loadUser();
    // Pull the user's interviews from the database so past records show up on
    // any device they log into (not just the browser they practiced on).
    hydrateInterviews().then((all) => setInterviews([...all])).catch(() => {});
  }, []);

  const count = interviews.length;
  const recent = [...interviews].reverse().slice(0, 4);

  // Calculate real KPIs
  const last3 = [...interviews].reverse().slice(0, 3);
  const readiness = last3.length > 0
    ? Math.round(last3.reduce((s, iv) => s + iv.score, 0) / last3.length)
    : 0;

  const avgCommunication = count > 0
    ? Math.round(
        (interviews.reduce((s, iv) => s + iv.metrics.communication, 0) / count) * 10
      ) / 10
    : 0;

  const lastInterviewDate = recent.length > 0
    ? new Date(recent[0].date).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  const goalRemaining = Math.max(0, 5 - count);

  if (!loaded) return null;

  return (
    <>
      {/* App head */}
      <div className="app-head">
        <div>
          <h2>Welcome back{firstName ? `, ${firstName}` : ''} {'\ud83d\udc4b'}</h2>
          <p>
            {count === 0
              ? 'Start your first mock interview to track your progress.'
              : goalRemaining > 0
                ? `You're ${goalRemaining} mock interview${goalRemaining > 1 ? 's' : ''} away from your weekly goal.`
                : 'You have reached your weekly goal! Keep practicing to improve.'}
          </p>
        </div>
        <Link href="/dashboard/interview" className="btn btn-primary btn-sm">
          <Plus size={16} /> New mock interview
        </Link>
      </div>

      {/* KPI Row */}
      <div className="dash-grid">
        <div className="widget kpi">
          <span className="v grad-text">{readiness > 0 ? `${readiness}%` : '--'}</span>
          <span className="l">Interview readiness score</span>
          {readiness > 0 ? (
            <span className="d up">Based on last {last3.length} interview{last3.length > 1 ? 's' : ''}</span>
          ) : (
            <span className="d" style={{ color: 'var(--text-3)' }}>Complete an interview to see</span>
          )}
        </div>
        <div className="widget kpi">
          <span className="v">
            {latestResume ? latestResume.atsScore : '--'}
            {latestResume && <span style={{ fontSize: '1rem', color: 'var(--text-3)' }}>/100</span>}
          </span>
          <span className="l">Latest ATS score</span>
          <span className="d" style={{ color: 'var(--text-3)' }}>
            {latestResume ? `Based on ${latestResume.fileName}` : 'Upload resume to see score'}
          </span>
        </div>
        <div className="widget kpi">
          <span className="v">
            {avgCommunication > 0 ? avgCommunication.toFixed(1) : '--'}
            {avgCommunication > 0 && <span style={{ fontSize: '1rem', color: 'var(--text-3)' }}>/10</span>}
          </span>
          <span className="l">Communication score</span>
          {avgCommunication > 0 ? (
            <span className="d up">Average across {count} interview{count > 1 ? 's' : ''}</span>
          ) : (
            <span className="d" style={{ color: 'var(--text-3)' }}>No data yet</span>
          )}
        </div>
        <div className="widget kpi">
          <span className="v">{count}</span>
          <span className="l">Interviews completed</span>
          <span className="d" style={{ color: 'var(--text-3)' }}>
            {lastInterviewDate ? `Last: ${lastInterviewDate}` : 'None yet'}
          </span>
        </div>
      </div>

      {/* Two-column row */}
      <div className="dash-grid-2">
        {/* Recent interviews */}
        <div className="widget">
          <h4>
            Recent interviews
            <Link href="/dashboard/analysis">View reports &rarr;</Link>
          </h4>
          {recent.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-3)' }}>
              <p style={{ marginBottom: '.8rem' }}>No interviews yet.</p>
              <Link href="/dashboard/interview" className="btn btn-primary btn-sm">
                <Plus size={16} /> Start your first interview
              </Link>
            </div>
          ) : (
            recent.map((item) => (
              <Link
                href={`/dashboard/analysis?id=${item.id}`}
                className="list-row"
                key={item.id}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div>
                  <span>{item.type} &middot; {item.role}</span>
                  <div className="meta">{formatInterviewMeta(item)}</div>
                </div>
                <span className={`tag ${scoreTag(item.score)}`}>Score {item.score}</span>
              </Link>
            ))
          )}
        </div>

        {/* Readiness ring */}
        <div className="widget" style={{ textAlign: 'center' }}>
          <h4>Interview readiness</h4>
          <div
            className="ring"
            style={
              {
                '--p': readiness > 0 ? readiness : 0,
                '--c': 'var(--blue)',
                margin: '0 auto 1rem',
                position: 'relative',
              } as React.CSSProperties
            }
          >
            <span>{readiness > 0 ? `${readiness}%` : '--'}</span>
          </div>
          <p style={{ fontSize: '.88rem', color: 'var(--text-2)' }}>
            {count === 0
              ? 'Complete your first mock interview to see your readiness score.'
              : readiness >= 80
                ? 'Great progress! You are performing well. Keep practicing to maintain your edge.'
                : 'Keep practicing to improve your readiness score. Aim for 80% or above.'}
          </p>
        </div>
      </div>

      {/* Third row */}
      <div className="dash-grid-3">
        {/* Upcoming sessions */}
        <div className="widget">
          <h4>
            Upcoming sessions
            <Link href="/dashboard/coaching">Book more &rarr;</Link>
          </h4>

          {upcomingBookings.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-3)' }}>
              <p style={{ marginBottom: '.8rem' }}>No upcoming sessions</p>
              <Link href="/dashboard/coaching" className="btn btn-primary btn-sm">
                Book a coach
              </Link>
            </div>
          ) : (
            upcomingBookings.map((booking) => (
              <div className="list-row" key={booking.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center' }}>
                  <GraduationCap size={18} style={{ color: 'var(--blue)', flexShrink: 0 }} />
                  <div>
                    <b style={{ fontSize: '.88rem' }}>{booking.goal} with {booking.coachName}</b>
                    <div className="meta">{new Date(booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} &middot; {booking.timeSlot}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className="tag blue">{booking.coachCategory}</span>
                  {booking.roomId && (
                    <BookingJoinGate date={booking.date} timeSlot={booking.timeSlot} roomId={booking.roomId} />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Recent feedback */}
        <div className="widget">
          <h4>Recent feedback &amp; recommended actions</h4>
          {recent.length > 0 ? (
            <div className="fb-block">
              <b>From your last interview</b>
              {recent[0].feedback.strengths}
            </div>
          ) : (
            <div className="fb-block">
              <b>No feedback yet</b>
              Complete a mock interview to receive AI-powered feedback.
            </div>
          )}

          {(() => {
            const actions: { icon: React.ReactNode; text: string; tag: string; tagColor: string }[] = [];

            if (count === 0) {
              actions.push({
                icon: <Target size={16} style={{ color: 'var(--blue)', flexShrink: 0 }} />,
                text: 'Take your first mock interview',
                tag: 'Suggested',
                tagColor: 'blue',
              });
            }

            if (count > 0 && !latestResume) {
              actions.push({
                icon: <FileText size={16} style={{ color: 'var(--blue)', flexShrink: 0 }} />,
                text: 'Upload your resume for ATS analysis',
                tag: 'High impact',
                tagColor: 'red',
              });
            }

            if (latestResume && latestResume.missingKeywords.length > 0) {
              actions.push({
                icon: <FileText size={16} style={{ color: 'var(--blue)', flexShrink: 0 }} />,
                text: `Add ${latestResume.missingKeywords.length} missing keyword${latestResume.missingKeywords.length > 1 ? 's' : ''} to your resume`,
                tag: 'High impact',
                tagColor: 'red',
              });
            }

            if (upcomingBookings.length === 0) {
              actions.push({
                icon: <MessageCircle size={16} style={{ color: 'var(--cyan)', flexShrink: 0 }} />,
                text: 'Book a coaching session',
                tag: 'Optional',
                tagColor: 'amber',
              });
            }

            if (actions.length === 0) {
              actions.push({
                icon: <Target size={16} style={{ color: 'var(--blue)', flexShrink: 0 }} />,
                text: 'Keep practicing to maintain your edge',
                tag: 'Suggested',
                tagColor: 'blue',
              });
            }

            return actions.map((action, i) => (
              <div className="list-row" key={i}>
                <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center' }}>
                  {action.icon}
                  <span style={{ fontSize: '.86rem' }}>{action.text}</span>
                </div>
                <span className={`tag ${action.tagColor}`}>{action.tag}</span>
              </div>
            ));
          })()}
        </div>
      </div>
    </>
  );
}

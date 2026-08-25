'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  Plus,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { getInterviews, hydrateInterviews } from '@/lib/interview-store';
import type { InterviewRecord } from '@/lib/interview-store';
import { getLatestResume, hydrateResumes } from '@/lib/resume-store';
import type { ResumeRecord } from '@/lib/resume-store';
import { getUpcomingBookings, hydrateBookings } from '@/lib/booking-store';
import type { BookingRecord } from '@/lib/booking-store';
import { useSessionWindow } from '@/lib/session-window';
import GamificationBar from '@/components/GamificationBar';
import CareerQuestPath from '@/components/CareerQuestPath';
import LeaderboardWidget from '@/components/LeaderboardWidget';
import PowerUpShopWidget from '@/components/PowerUpShopWidget';
import { getGamificationState, GamificationState } from '@/lib/gamification';

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
  const [gameState, setGameState] = useState<GamificationState | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const fullName = user.user_metadata?.full_name;
          if (fullName) {
            setFirstName(fullName.split(' ')[0]);
          } else if (user.email) {
            setFirstName(user.email.split('@')[0]);
          }
        }
      } catch {
        // ignore network error
      }
    }

    setInterviews(getInterviews());
    setLatestResume(getLatestResume());
    setUpcomingBookings(getUpcomingBookings());
    setGameState(getGamificationState());
    setLoaded(true);
    loadUser();

    const handleGameUpdate = () => setGameState(getGamificationState());
    window.addEventListener('gamification_updated', handleGameUpdate);

    hydrateInterviews().then((all) => setInterviews([...all])).catch(() => {});
    hydrateResumes().then((all) => setLatestResume(all.length > 0 ? all[all.length - 1] : null)).catch(() => {});
    hydrateBookings().then((all) => setUpcomingBookings(all.filter((b) => b.status === 'upcoming'))).catch(() => {});
    return () => window.removeEventListener('gamification_updated', handleGameUpdate);
  }, []);

  const count = interviews.length;
  const recent = interviews.slice(0, 4);
  const last3 = interviews.slice(0, 3);
  const readiness =
    last3.length > 0
      ? Math.round(last3.reduce((sum, r) => sum + r.score, 0) / last3.length)
      : 0;

  const totalComm = interviews.reduce((sum, r) => {
    const comm = r.metrics?.communication;
    return sum + (comm || r.score / 10);
  }, 0);
  const avgCommunication = count > 0 ? totalComm / count : 0;

  const lastInterviewDate =
    interviews.length > 0
      ? new Date(interviews[0].date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
      : null;

  const goalRemaining = Math.max(0, 5 - count);
  const bestScore = interviews.reduce((best, interview) => Math.max(best, interview.score), 0);

  if (!loaded) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 680px) {
          .home-session-row { flex-wrap: wrap; row-gap: .5rem; }
          .dash-head-actions { width: 100%; display: flex; flex-direction: column; align-items: stretch; gap: 0.8rem; }
          .dash-head-actions .btn-duo { width: 100%; justify-content: center; }
        }
      `}} />

      {/* 2-Column Duolingo Dashboard Layout */}
      <div className="duo-dashboard-layout">
        {/* Main Center Stage (Path & Main Stats) */}
        <div className="duo-main-stage">
          {/* App Head Banner */}
          <div className="app-head dashboard-command-bar">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.45rem' }}>
                Welcome back{firstName ? `, ${firstName}` : ''} 👋
              </h2>
              <p style={{ margin: '0.2rem 0 0', color: 'var(--text-2)', fontSize: '0.86rem' }}>
                {count === 0
                  ? 'Start your first mock interview to ignite your practice streak!'
                  : goalRemaining > 0
                    ? `You're on a 🔥 ${gameState?.streak || 1}-day streak! ${goalRemaining} more mock round${goalRemaining > 1 ? 's' : ''} to hit your weekly goal.`
                    : '🔥 Weekly streak goal achieved! Keep practicing to maintain your edge.'}
              </p>
            </div>
            <Link href="/dashboard/interview" className="btn-duo btn-duo-green btn-duo-sm">
              <Plus size={16} /> New mock interview
            </Link>
          </div>

          {/* Compact 4-KPI Row */}
          <div className="dash-grid dashboard-kpi-grid">
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

          {/* Duolingo Winding Career Quest Road */}
          <CareerQuestPath completedInterviews={count} bestScore={bestScore} />

          {/* Recent Interviews List */}
          <div className="widget" style={{ marginTop: '1.4rem' }}>
            <h4>
              Recent interviews
              <Link href="/dashboard/analysis">View reports &rarr;</Link>
            </h4>
            {recent.length === 0 ? (
              <div style={{ padding: '1.8rem 1rem', textAlign: 'center', color: 'var(--text-3)' }}>
                <p style={{ marginBottom: '.8rem' }}>No interviews yet.</p>
                <Link href="/dashboard/interview" className="btn-duo btn-duo-green btn-duo-sm">
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
        </div>

        {/* Right Gamification Sidebar Rail */}
        <div className="duo-sidebar-rail">
          {/* Top HUD Card */}
          <div className="duo-hud-card">
            <GamificationBar />
          </div>

          {/* Daily Goals & Quests Widget */}
          <div className="widget">
            <h4>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>🎯</span> Daily Goals &amp; Quests
              </span>
              <span className="tag amber" style={{ fontSize: '0.72rem' }}>Resets Daily</span>
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginTop: '0.6rem' }}>
              {gameState?.quests?.map((q) => (
                <div
                  key={q.id}
                  className="quest-mini-card"
                >
                  <span style={{ fontSize: '1.3rem' }}>{q.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: '0.84rem', display: 'block', color: 'var(--text)' }}>
                      {q.title}
                    </strong>
                    <div className="quest-bar-bg">
                      <div
                        className="quest-bar-fill"
                        style={{
                          width: `${Math.min(100, (q.current / q.target) * 100)}%`,
                          background: q.completed ? 'var(--duo-green)' : 'var(--duo-blue)',
                        }}
                      />
                    </div>
                  </div>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#ffc800' }}>
                    +{q.xpReward} XP
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Diamond League Leaderboard */}
          <LeaderboardWidget gameState={gameState} userName={firstName || 'You'} />

          {/* Gem Power-Up Shop */}
          <PowerUpShopWidget gameState={gameState} onStateChange={() => setGameState(getGamificationState())} />

          {/* Upcoming Coaching Sessions */}
          <div className="widget">
            <h4>
              Upcoming sessions
              <Link href="/dashboard/bookings">View all &rarr;</Link>
            </h4>

            {upcomingBookings.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-3)' }}>
                <p style={{ marginBottom: '.6rem', fontSize: '0.85rem' }}>No upcoming sessions</p>
                <Link href="/dashboard/coaching" className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                  Book a coach
                </Link>
              </div>
            ) : (
              upcomingBookings.map((booking) => (
                <div className="list-row home-session-row" key={booking.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center', minWidth: 0 }}>
                    <GraduationCap size={16} style={{ color: 'var(--blue)', flexShrink: 0 }} />
                    <div>
                      <b style={{ fontSize: '.84rem' }}>{booking.goal} with {booking.coachName}</b>
                      <div className="meta">{new Date(booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} &middot; {booking.timeSlot}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    {booking.roomId && (
                      <BookingJoinGate date={booking.date} timeSlot={booking.timeSlot} roomId={booking.roomId} />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

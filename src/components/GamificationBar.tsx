'use client';

import React, { useState, useEffect } from 'react';
import {
  Flame,
  Sparkles,
  Heart,
  Volume2,
  VolumeX,
  Trophy,
  Zap,
  Info,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  getGamificationState,
  calculateLevel,
  toggleSound,
  refillHearts,
  GamificationState,
} from '@/lib/gamification';

export default function GamificationBar() {
  const [state, setState] = useState<GamificationState | null>(null);
  const [activeModal, setActiveModal] = useState<'streak' | 'gems' | 'hearts' | 'level' | null>(null);

  useEffect(() => {
    setState(getGamificationState());

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<GamificationState>;
      if (customEvent.detail) {
        setState(customEvent.detail);
      } else {
        setState(getGamificationState());
      }
    };

    window.addEventListener('gamification_updated', handleUpdate);
    return () => window.removeEventListener('gamification_updated', handleUpdate);
  }, []);

  if (!state) return null;

  const levelInfo = calculateLevel(state.xp);

  const handleToggleAudio = () => {
    const nextSound = toggleSound();
    setState((prev) => (prev ? { ...prev, soundEnabled: nextSound } : null));
  };

  return (
    <>
      <div className="gamification-bar">
        {/* Streak Pill */}
        <button
          className="stat-pill streak-pill"
          onClick={() => setActiveModal('streak')}
          title="Daily Practice Streak"
          aria-label="View Daily Streak Details"
        >
          <span className="flame-icon">🔥</span>
          <span className="stat-value">{state.streak}</span>
          <span className="stat-label">Days</span>
        </button>

        {/* Gems Pill */}
        <button
          className="stat-pill gems-pill"
          onClick={() => setActiveModal('gems')}
          title="Interview Ace Gems"
          aria-label="View Gems Balance"
        >
          <span className="gem-icon">💎</span>
          <span className="stat-value">{state.gems}</span>
        </button>

        {/* Hearts Pill */}
        <button
          className="stat-pill hearts-pill"
          onClick={() => setActiveModal('hearts')}
          title="Practice Hearts / Lives"
          aria-label="View Practice Hearts"
        >
          <span className="heart-icon">❤️</span>
          <span className="stat-value">{state.hearts}/{state.maxHearts}</span>
        </button>

        {/* Level & XP Pill */}
        <button
          className="stat-pill level-pill"
          onClick={() => setActiveModal('level')}
          title="Candidate Level & XP Progress"
          aria-label="View Level Progress"
        >
          <span className="level-badge">Lvl {levelInfo.level}</span>
          <div className="xp-track">
            <div className="xp-fill" style={{ width: `${levelInfo.progress}%` }} />
          </div>
          <span className="xp-text">{levelInfo.currentLevelXp}/{levelInfo.nextLevelXp} XP</span>
        </button>

        {/* Audio Toggle */}
        <button
          className="audio-toggle-btn"
          onClick={handleToggleAudio}
          title={state.soundEnabled ? 'Mute Gamification Sound Chimes' : 'Enable Sound Chimes'}
          aria-label="Toggle Sound"
        >
          {state.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </div>

      {/* Popovers / Modals */}
      {activeModal === 'streak' && (
        <div className="duo-popover-backdrop" onClick={() => setActiveModal(null)}>
          <div className="duo-popover-card" onClick={(e) => e.stopPropagation()}>
            <button className="duo-popover-close" onClick={() => setActiveModal(null)}><X size={16} /></button>
            <div style={{ fontSize: '2.5rem', marginBottom: '.5rem', animation: 'duoBounce 1.5s infinite' }}>🔥</div>
            <h3>{state.streak} Day Practice Streak!</h3>
            <p style={{ color: 'var(--text-2)', fontSize: '.9rem', margin: '.5rem 0 1rem' }}>
              Practice every day to build confidence, sharpen your STAR answers, and keep your streak burning hot!
            </p>
            <div className="streak-calendar-preview">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                <div key={idx} className={`streak-day-dot ${idx < (state.streak % 7 || 1) ? 'active' : ''}`}>
                  <span>{day}</span>
                  <div className="dot-circle">{idx < (state.streak % 7 || 1) ? '🔥' : '·'}</div>
                </div>
              ))}
            </div>
            <button className="btn-duo btn-duo-green" style={{ width: '100%', marginTop: '1.2rem' }} onClick={() => setActiveModal(null)}>
              Keep Practicing
            </button>
          </div>
        </div>
      )}

      {activeModal === 'gems' && (
        <div className="duo-popover-backdrop" onClick={() => setActiveModal(null)}>
          <div className="duo-popover-card" onClick={(e) => e.stopPropagation()}>
            <button className="duo-popover-close" onClick={() => setActiveModal(null)}><X size={16} /></button>
            <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>💎</div>
            <h3>{state.gems} Interview Gems</h3>
            <p style={{ color: 'var(--text-2)', fontSize: '.9rem', margin: '.5rem 0 1rem' }}>
              Earn gems by completing mock interviews with high scores, crafting STAR stories, and completing daily quests.
            </p>
            <div style={{ background: 'var(--card)', padding: '.8rem', borderRadius: '16px', border: '1px solid var(--line)', textAlign: 'left', fontSize: '.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.4rem' }}>
                <span>🎯 Mock Interview Completion</span>
                <strong style={{ color: '#1cb0f6' }}>+15 💎</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.4rem' }}>
                <span>⭐ STAR Story Created</span>
                <strong style={{ color: '#1cb0f6' }}>+10 💎</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>👑 Score &gt; 90%</span>
                <strong style={{ color: '#1cb0f6' }}>+25 💎</strong>
              </div>
            </div>
            <button className="btn-duo btn-duo-blue" style={{ width: '100%', marginTop: '1.2rem' }} onClick={() => setActiveModal(null)}>
              Awesome!
            </button>
          </div>
        </div>
      )}

      {activeModal === 'hearts' && (
        <div className="duo-popover-backdrop" onClick={() => setActiveModal(null)}>
          <div className="duo-popover-card" onClick={(e) => e.stopPropagation()}>
            <button className="duo-popover-close" onClick={() => setActiveModal(null)}><X size={16} /></button>
            <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>❤️</div>
            <h3>{state.hearts} of {state.maxHearts} Practice Lives</h3>
            <p style={{ color: 'var(--text-2)', fontSize: '.9rem', margin: '.5rem 0 1rem' }}>
              In mock interview mode, you have 3 lives. Staying focused and in the camera frame preserves your lives and guarantees realistic interview discipline.
            </p>
            {state.hearts < state.maxHearts && (
              <button
                className="btn-duo btn-duo-green"
                style={{ width: '100%', marginBottom: '.6rem' }}
                onClick={() => {
                  refillHearts();
                  setState(getGamificationState());
                  setActiveModal(null);
                }}
              >
                Refill Lives (Free)
              </button>
            )}
            <button className="btn-duo btn-duo-ghost" style={{ width: '100%' }} onClick={() => setActiveModal(null)}>
              Got it
            </button>
          </div>
        </div>
      )}

      {activeModal === 'level' && (
        <div className="duo-popover-backdrop" onClick={() => setActiveModal(null)}>
          <div className="duo-popover-card" onClick={(e) => e.stopPropagation()}>
            <button className="duo-popover-close" onClick={() => setActiveModal(null)}><X size={16} /></button>
            <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>⚡</div>
            <h3>Level {levelInfo.level} Candidate</h3>
            <p style={{ color: 'var(--text-2)', fontSize: '.9rem', margin: '.5rem 0 1rem' }}>
              You have earned <strong>{state.xp} XP</strong> total. Earn {levelInfo.nextLevelXp - levelInfo.currentLevelXp} more XP to reach Level {levelInfo.level + 1}!
            </p>
            <div style={{ width: '100%', height: '14px', borderRadius: '999px', background: 'var(--line)', overflow: 'hidden', marginBottom: '1rem' }}>
              <div style={{ height: '100%', width: `${levelInfo.progress}%`, background: 'linear-gradient(90deg, #ffc800, #ff9600)', borderRadius: '999px' }} />
            </div>
            <button className="btn-duo btn-duo-green" style={{ width: '100%' }} onClick={() => setActiveModal(null)}>
              Level Up On Next Round!
            </button>
          </div>
        </div>
      )}
    </>
  );
}

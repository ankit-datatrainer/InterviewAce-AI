'use client';

export type Quest = {
  id: string;
  title: string;
  desc: string;
  target: number;
  current: number;
  xpReward: number;
  gemsReward: number;
  completed: boolean;
  icon: string;
};

export type Badge = {
  id: string;
  title: string;
  desc: string;
  icon: string;
  unlockedAt: string | null;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
};

export type GamificationState = {
  streak: number;
  lastActiveDate: string | null;
  streakFrozen: boolean;
  doubleXpReady?: boolean;
  questDate?: string;
  xp: number;
  level: number;
  gems: number;
  hearts: number;
  maxHearts: number;
  soundEnabled: boolean;
  quests: Quest[];
  badges: Badge[];
};

const DEFAULT_QUESTS: Quest[] = [
  {
    id: 'daily_interview',
    title: 'Complete 1 Mock Round',
    desc: 'Finish any AI practice interview session',
    target: 1,
    current: 0,
    xpReward: 50,
    gemsReward: 15,
    completed: false,
    icon: '🎯',
  },
  {
    id: 'star_story',
    title: 'STAR Story Crafter',
    desc: 'Build or edit a structured STAR response',
    target: 1,
    current: 0,
    xpReward: 30,
    gemsReward: 10,
    completed: false,
    icon: '⭐',
  },
  {
    id: 'resume_scan',
    title: 'Resume Tune-Up',
    desc: 'Scan your resume or apply ATS recommendations',
    target: 1,
    current: 0,
    xpReward: 25,
    gemsReward: 10,
    completed: false,
    icon: '📄',
  },
];

const DEFAULT_BADGES: Badge[] = [
  {
    id: 'first_interview',
    title: 'First Step',
    desc: 'Completed your first AI mock interview',
    icon: '🚀',
    unlockedAt: null,
    rarity: 'common',
  },
  {
    id: 'streak_3',
    title: 'On Fire',
    desc: 'Maintained a 3-day interview practice streak',
    icon: '🔥',
    unlockedAt: null,
    rarity: 'rare',
  },
  {
    id: 'star_master',
    title: 'STAR Maestro',
    desc: 'Saved 3 or more STAR method behavioral stories',
    icon: '🌟',
    unlockedAt: null,
    rarity: 'epic',
  },
  {
    id: 'score_90',
    title: 'Interview Ace',
    desc: 'Achieved an interview score of 90% or higher',
    icon: '👑',
    unlockedAt: null,
    rarity: 'legendary',
  },
  {
    id: 'flawless_round',
    title: 'Laser Focus',
    desc: 'Finished an entire interview with 0 strikes',
    icon: '🛡️',
    unlockedAt: null,
    rarity: 'rare',
  },
];

const STORAGE_KEY = 'interviewace_gamification_state_v1';

export function calculateLevel(xp: number): { level: number; currentLevelXp: number; nextLevelXp: number; progress: number } {
  // Each level requires 150 * level XP
  let lvl = 1;
  let remainingXp = xp;
  let required = 150;

  while (remainingXp >= required) {
    remainingXp -= required;
    lvl++;
    required = 150 * lvl;
  }

  return {
    level: lvl,
    currentLevelXp: remainingXp,
    nextLevelXp: required,
    progress: Math.min(100, Math.round((remainingXp / required) * 100)),
  };
}

export function getGamificationState(): GamificationState {
  if (typeof window === 'undefined') {
    return {
      streak: 3,
      lastActiveDate: new Date().toISOString(),
      streakFrozen: false,
      doubleXpReady: false,
      questDate: new Date().toISOString().split('T')[0],
      xp: 450,
      level: 3,
      gems: 120,
      hearts: 3,
      maxHearts: 3,
      soundEnabled: true,
      quests: DEFAULT_QUESTS,
      badges: DEFAULT_BADGES,
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial: GamificationState = {
        streak: 1,
        lastActiveDate: new Date().toISOString().split('T')[0],
        streakFrozen: false,
        doubleXpReady: false,
        questDate: new Date().toISOString().split('T')[0],
        xp: 120,
        level: 1,
        gems: 50,
        hearts: 3,
        maxHearts: 3,
        soundEnabled: true,
        quests: DEFAULT_QUESTS,
        badges: DEFAULT_BADGES,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }

    const parsed: GamificationState = JSON.parse(raw);
    
    // Check streak reset or maintenance
    const today = new Date().toISOString().split('T')[0];
    if (parsed.questDate !== today) {
      parsed.quests = DEFAULT_QUESTS.map((quest) => ({ ...quest }));
      parsed.questDate = today;
    }
    if (parsed.lastActiveDate) {
      const lastDate = new Date(parsed.lastActiveDate);
      const nowDate = new Date(today);
      const diffDays = Math.floor((nowDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Streak is continuing
      } else if (diffDays > 1 && !parsed.streakFrozen) {
        parsed.streak = 1;
      }
    }

    // Recalculate level
    parsed.level = calculateLevel(parsed.xp).level;
    return parsed;
  } catch (err) {
    console.error('Failed to load gamification state:', err);
    return {
      streak: 1,
      lastActiveDate: new Date().toISOString().split('T')[0],
      streakFrozen: false,
      doubleXpReady: false,
      questDate: new Date().toISOString().split('T')[0],
      xp: 100,
      level: 1,
      gems: 50,
      hearts: 3,
      maxHearts: 3,
      soundEnabled: true,
      quests: DEFAULT_QUESTS,
      badges: DEFAULT_BADGES,
    };
  }
}

export function saveGamificationState(state: GamificationState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('gamification_updated', { detail: state }));
  } catch (err) {
    console.error('Failed to save gamification state:', err);
  }
}

export function addXP(amount: number, reason?: string): { newXp: number; levelUp: boolean } {
  const current = getGamificationState();
  const oldLevel = current.level;
  const earned = reason === 'interview_complete' && current.doubleXpReady ? amount * 2 : amount;
  if (reason === 'interview_complete' && current.doubleXpReady) current.doubleXpReady = false;
  const newXp = current.xp + earned;
  const newLevelInfo = calculateLevel(newXp);
  const levelUp = newLevelInfo.level > oldLevel;

  const today = new Date().toISOString().split('T')[0];
  if (current.lastActiveDate !== today) {
    current.streak += 1;
    current.lastActiveDate = today;
  }

  current.xp = newXp;
  current.level = newLevelInfo.level;
  saveGamificationState(current);

  if (levelUp) {
    playDuoSound('levelup');
  } else {
    playDuoSound('correct');
  }

  return { newXp, levelUp };
}

export function activateStreakFreeze(): void {
  const current = getGamificationState();
  current.streakFrozen = true;
  saveGamificationState(current);
}

export function activateDoubleXp(): void {
  const current = getGamificationState();
  current.doubleXpReady = true;
  saveGamificationState(current);
}

export function addGems(amount: number): number {
  const current = getGamificationState();
  current.gems += amount;
  saveGamificationState(current);
  playDuoSound('chest');
  return current.gems;
}

export function updateQuestProgress(questId: string, progressDelta: number = 1): void {
  const current = getGamificationState();
  let updated = false;

  current.quests = current.quests.map((q) => {
    if (q.id === questId && !q.completed) {
      const newProgress = Math.min(q.target, q.current + progressDelta);
      const isCompleted = newProgress >= q.target;
      if (isCompleted) {
        current.xp += q.xpReward;
        current.gems += q.gemsReward;
        updated = true;
      }
      return { ...q, current: newProgress, completed: isCompleted };
    }
    return q;
  });

  if (updated) {
    current.level = calculateLevel(current.xp).level;
    playDuoSound('levelup');
  }

  saveGamificationState(current);
}

export function unlockBadge(badgeId: string): boolean {
  const current = getGamificationState();
  let unlocked = false;

  current.badges = current.badges.map((b) => {
    if (b.id === badgeId && !b.unlockedAt) {
      unlocked = true;
      return { ...b, unlockedAt: new Date().toISOString() };
    }
    return b;
  });

  if (unlocked) {
    current.gems += 25;
    current.xp += 100;
    saveGamificationState(current);
    playDuoSound('streak');
  }

  return unlocked;
}

export function loseHeart(): number {
  const current = getGamificationState();
  current.hearts = Math.max(0, current.hearts - 1);
  saveGamificationState(current);
  playDuoSound('wrong');
  return current.hearts;
}

export function refillHearts(): number {
  const current = getGamificationState();
  current.hearts = current.maxHearts;
  saveGamificationState(current);
  playDuoSound('pop');
  return current.hearts;
}

export function toggleSound(): boolean {
  const current = getGamificationState();
  current.soundEnabled = !current.soundEnabled;
  saveGamificationState(current);
  return current.soundEnabled;
}

let sharedAudioCtx: AudioContext | null = null;

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!sharedAudioCtx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

// ─── Web Audio API Sound Synthesizer (Duolingo-like feedback) ───
export function playDuoSound(type: 'correct' | 'wrong' | 'levelup' | 'streak' | 'pop' | 'chest' | 'type', key?: string): void {
  if (typeof window === 'undefined') return;
  const state = getGamificationState();
  if (!state.soundEnabled) return;

  if (type === 'type') {
    playTypeSound(key);
    return;
  }

  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    if (type === 'correct') {
      // Crisp 2-tone major chime (C5 -> G5)
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc1.frequency.setValueAtTime(783.99, now + 0.16); // G5

      osc2.frequency.setValueAtTime(523.25, now);
      osc2.frequency.setValueAtTime(783.99, now + 0.16);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.45);
      osc2.stop(now + 0.45);
    } else if (type === 'wrong') {
      // Gentle boop tone for mistakes/strikes (F3 -> D3)
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(174.61, now); // F3
      osc.frequency.setValueAtTime(146.83, now + 0.12); // D3

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'levelup' || type === 'streak') {
      // Celebratory arpeggio fanfare (C5 -> E5 -> G5 -> C6)
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);

        gain.gain.setValueAtTime(0.16, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.3);
      });
    } else if (type === 'pop') {
      // Subtle tactile click/pop
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.06);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'chest') {
      // Gem sparkle chime
      const now = ctx.currentTime;
      const freqs = [880, 1174.66, 1760];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + idx * 0.08);

        gain.gain.setValueAtTime(0.15, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.35);
      });
    }
  } catch {
    // Audio context not allowed before user gesture
  }
}

// ─── High-Performance Mechanical Typing Sound Synthesizer ───
export function playTypeSound(key?: string): void {
  if (typeof window === 'undefined') return;
  const state = getGamificationState();
  if (!state.soundEnabled) return;

  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (key === 'Enter') {
      // Deeper tactile return / confirmation click
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.045);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.045);
    } else if (key === ' ' || key === 'Space') {
      // Satisfying spacebar mechanical thud
      osc.type = 'sine';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.04);

      gain.gain.setValueAtTime(0.10, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } else if (key === 'Backspace' || key === 'Delete') {
      // Woodblock back-pop
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(780, now);
      osc.frequency.exponentialRampToValueAtTime(290, now + 0.035);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.035);
    } else {
      // Standard crisp mechanical switch click with organic pitch jitter
      const jitter = (Math.random() - 0.5) * 160;
      const baseFreq = 1900 + jitter;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.028);

      gain.gain.setValueAtTime(0.075, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.028);
    }
  } catch {
    // Audio context not ready
  }
}

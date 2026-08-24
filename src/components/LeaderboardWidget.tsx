'use client';

import React from 'react';
import { Trophy, Flame, ChevronUp, Shield, Award, Sparkles } from 'lucide-react';
import { GamificationState } from '@/lib/gamification';

type LeaderboardWidgetProps = {
  gameState: GamificationState | null;
  userName?: string;
};

type Competitor = {
  rank: number;
  name: string;
  avatar: string;
  xp: number;
  isUser?: boolean;
  trend: 'up' | 'same' | 'down';
};

export default function LeaderboardWidget({ gameState, userName = 'You' }: LeaderboardWidgetProps) {
  const userXP = gameState?.xp || 240;

  const competitors: Competitor[] = [
    { rank: 1, name: 'Ananya Sharma', avatar: '👩‍💻', xp: Math.max(480, userXP + 120), trend: 'same' },
    { rank: 2, name: 'Rohan Verma', avatar: '👨‍🎓', xp: Math.max(390, userXP + 60), trend: 'up' },
    { rank: 3, name: userName, avatar: '⚡', xp: userXP, isUser: true, trend: 'up' },
    { rank: 4, name: 'Priya Patel', avatar: '👩‍🔬', xp: Math.max(180, userXP - 40), trend: 'down' },
    { rank: 5, name: 'Vikram Singh', avatar: '👨‍💼', xp: Math.max(140, userXP - 80), trend: 'same' },
  ];

  return (
    <div className="duo-leaderboard-card">
      <div className="duo-leaderboard-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div className="league-icon-badge">💎</div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text)' }}>
              Diamond League
            </h4>
            <span style={{ fontSize: '0.72rem', color: '#1cb0f6', fontWeight: 700 }}>
              Top 3 promote to Obsidian 🏆
            </span>
          </div>
        </div>
        <span className="league-time-tag">3d left</span>
      </div>

      <div className="duo-leaderboard-list">
        {competitors.map((c) => {
          const isTop3 = c.rank <= 3;
          return (
            <div
              key={c.rank}
              className={`leaderboard-row ${c.isUser ? 'is-current-user' : ''} ${isTop3 ? 'promotion-zone' : ''}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span className={`rank-badge rank-${c.rank}`}>
                  {c.rank === 1 ? '🥇' : c.rank === 2 ? '🥈' : c.rank === 3 ? '🥉' : `#${c.rank}`}
                </span>
                <span className="competitor-avatar">{c.avatar}</span>
                <div className="competitor-info">
                  <span className="competitor-name">
                    {c.name} {c.isUser && <span className="you-pill">YOU</span>}
                  </span>
                  <span className="competitor-sub">
                    {isTop3 ? 'Promotion Zone 🚀' : 'Safe Zone'}
                  </span>
                </div>
              </div>
              <div className="competitor-xp">
                <strong>{c.xp}</strong>
                <small>XP</small>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { addGems, refillHearts, playDuoSound, activateDoubleXp, activateStreakFreeze, GamificationState } from '@/lib/gamification';

type PowerUpShopProps = {
  gameState: GamificationState | null;
  onStateChange?: () => void;
};

export default function PowerUpShopWidget({ gameState, onStateChange }: PowerUpShopProps) {
  const [purchased, setPurchased] = useState<string | null>(null);

  const handleBuy = (item: 'freeze' | 'hearts' | 'potion', cost: number) => {
    if (!gameState || gameState.gems < cost) {
      playDuoSound('wrong');
      alert(`You need ${cost} Gems for this power-up! Practice interviews to earn more gems.`);
      return;
    }

    addGems(-cost);
    if (item === 'hearts') {
      refillHearts();
    } else if (item === 'freeze') {
      activateStreakFreeze();
    } else if (item === 'potion') {
      activateDoubleXp();
    }
    playDuoSound('levelup');
    setPurchased(item);
    setTimeout(() => setPurchased(null), 2500);
    if (onStateChange) onStateChange();
  };

  const gems = gameState?.gems ?? 50;

  return (
    <div className="duo-shop-card">
      <div className="duo-shop-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>🛒</span>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text)' }}>
              Power-Up Shop
            </h4>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-2)' }}>
              Bank: <strong style={{ color: '#1cb0f6' }}>{gems} 💎</strong>
            </span>
          </div>
        </div>
      </div>

      <div className="duo-shop-items">
        {/* Streak Freeze */}
        <div className="shop-item-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span className="shop-item-icon">🧊</span>
            <div>
              <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text)' }}>
                Streak Freeze
              </strong>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-2)' }}>
                Protects streak if you miss a day
              </span>
            </div>
          </div>
          <button
            className="btn-duo btn-duo-blue btn-duo-sm"
            onClick={() => handleBuy('freeze', 20)}
            disabled={gems < 20 || Boolean(gameState?.streakFrozen)}
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
          >
            {purchased === 'freeze' ? <Check size={14} /> : gameState?.streakFrozen ? 'Ready' : '20 💎'}
          </button>
        </div>

        {/* Refill Practice Hearts */}
        <div className="shop-item-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span className="shop-item-icon">❤️</span>
            <div>
              <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text)' }}>
                Refill Hearts (3/3)
              </strong>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-2)' }}>
                Instant full lives restoration
              </span>
            </div>
          </div>
          <button
            className="btn-duo btn-duo-green btn-duo-sm"
            onClick={() => handleBuy('hearts', 15)}
            disabled={gems < 15 || (gameState?.hearts ?? 3) >= 3}
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
          >
            {purchased === 'hearts' ? <Check size={14} /> : (gameState?.hearts ?? 3) >= 3 ? 'Full' : '15 💎'}
          </button>
        </div>

        {/* Double XP Potion */}
        <div className="shop-item-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span className="shop-item-icon">🧪</span>
            <div>
              <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text)' }}>
                2x XP Booster
              </strong>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-2)' }}>
                Double XP on your next round
              </span>
            </div>
          </div>
          <button
            className="btn-duo btn-duo-orange btn-duo-sm"
            onClick={() => handleBuy('potion', 30)}
            disabled={gems < 30 || Boolean(gameState?.doubleXpReady)}
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
          >
            {purchased === 'potion' ? <Check size={14} /> : gameState?.doubleXpReady ? 'Ready' : '30 💎'}
          </button>
        </div>
      </div>
    </div>
  );
}

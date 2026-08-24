'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Lock,
  CheckCircle,
  Play,
  Award,
  Flame,
  Star,
  ChevronRight,
  Gift,
  X,
} from 'lucide-react';
import { addGems, playDuoSound } from '@/lib/gamification';

type StageNode = {
  id: string;
  number: number;
  title: string;
  sub: string;
  type: 'hr' | 'tech' | 'behav';
  difficulty: 'fresher' | 'mid' | 'adv';
  icon: string;
  status: 'completed' | 'active' | 'locked';
  stars: number;
  xpReward: number;
  gemsReward: number;
};

const STAGES: StageNode[] = [
  {
    id: 'stage-1',
    number: 1,
    title: 'HR Icebreaker & Culture Fit',
    sub: 'Master your "Tell me about yourself" & strengths pitch',
    type: 'hr',
    difficulty: 'fresher',
    icon: '🎯',
    status: 'completed',
    stars: 3,
    xpReward: 60,
    gemsReward: 15,
  },
  {
    id: 'stage-2',
    number: 2,
    title: 'Technical Fundamentals',
    sub: 'Domain knowledge, algorithm patterns & architecture basics',
    type: 'tech',
    difficulty: 'mid',
    icon: '💻',
    status: 'active',
    stars: 1,
    xpReward: 80,
    gemsReward: 20,
  },
  {
    id: 'stage-3',
    number: 3,
    title: 'STAR Behavioral Mastery',
    sub: 'Handling conflict, leadership examples & crisis resolution',
    type: 'behav',
    difficulty: 'mid',
    icon: '🌟',
    status: 'locked',
    stars: 0,
    xpReward: 90,
    gemsReward: 25,
  },
  {
    id: 'stage-4',
    number: 4,
    title: 'Advanced Domain & System Design',
    sub: 'End-to-end scalability, database trade-offs & edge cases',
    type: 'tech',
    difficulty: 'adv',
    icon: '🏗️',
    status: 'locked',
    stars: 0,
    xpReward: 120,
    gemsReward: 35,
  },
  {
    id: 'stage-5',
    number: 5,
    title: 'Executive Round & Offer Closing',
    sub: 'Strategic vision, salary negotiation & executive presence',
    type: 'hr',
    difficulty: 'adv',
    icon: '👑',
    status: 'locked',
    stars: 0,
    xpReward: 150,
    gemsReward: 50,
  },
];

export default function CareerQuestPath() {
  const router = useRouter();
  const [selectedStage, setSelectedStage] = useState<StageNode | null>(null);
  const [chestClaimed, setChestClaimed] = useState(false);
  const [chestModal, setChestModal] = useState(false);

  const handleOpenChest = () => {
    if (chestClaimed) return;
    addGems(30);
    setChestClaimed(true);
    setChestModal(true);
  };

  const handleStartStage = (stage: StageNode) => {
    playDuoSound('pop');
    router.push(`/dashboard/interview?type=${stage.type}&diff=${stage.difficulty}`);
  };

  return (
    <div className="career-quest-container">
      {/* Path Header */}
      <div className="quest-head">
        <div className="quest-head-badge">
          <span className="quest-flag">🗺️</span>
          <span>UNIT 1 &middot; CAREER ACCELERATOR QUEST</span>
        </div>
        <h3>Interview Mastery Road</h3>
        <p>Complete milestones along the path to unlock verified candidate badges & XP.</p>
      </div>

      {/* Interactive Path Tree */}
      <div className="duo-path-tree">
        {STAGES.map((stage, idx) => {
          const isCompleted = stage.status === 'completed';
          const isActive = stage.status === 'active';
          const isLocked = stage.status === 'locked';

          // Zig-zag offset like Duolingo path
          const offsetPositions = ['0px', '45px', '-45px', '30px', '0px'];
          const offset = offsetPositions[idx % offsetPositions.length];

          return (
            <React.Fragment key={stage.id}>
              {/* Milestone Node */}
              <div
                className="duo-path-node-wrapper"
                style={{ transform: `translateX(${offset})` }}
              >
                {isActive && (
                  <div className="duo-active-tooltip">
                    <span className="tooltip-pulse" />
                    <span>START HERE</span>
                  </div>
                )}

                <button
                  className={`duo-node-btn ${stage.status}`}
                  onClick={() => setSelectedStage(stage)}
                  aria-label={`${stage.title} - ${stage.status}`}
                >
                  <div className="duo-node-inner">
                    {isLocked ? (
                      <Lock size={24} className="node-icon-locked" />
                    ) : (
                      <span className="node-emoji">{stage.icon}</span>
                    )}
                  </div>
                  {isCompleted && (
                    <div className="node-stars">
                      {'⭐'.repeat(stage.stars || 3)}
                    </div>
                  )}
                </button>

                <div className="duo-node-label">
                  <strong>{stage.title}</strong>
                  <span>{stage.status === 'completed' ? 'Completed' : stage.status === 'active' ? 'Current Goal' : 'Locked'}</span>
                </div>
              </div>

              {/* Reward Chest midway between stage 2 and 3 */}
              {idx === 1 && (
                <div className="duo-chest-wrapper" style={{ transform: 'translateX(-20px)' }}>
                  <button
                    className={`duo-chest-btn ${chestClaimed ? 'claimed' : 'ready'}`}
                    onClick={handleOpenChest}
                    title={chestClaimed ? 'Claimed +30 Gems' : 'Click to open Bonus Reward Chest!'}
                  >
                    <span className="chest-emoji">{chestClaimed ? '🎁' : '✨ 🎁 ✨'}</span>
                    <span className="chest-tag">{chestClaimed ? 'Claimed' : '+30 💎 Chest'}</span>
                  </button>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Stage Launch Modal */}
      {selectedStage && (
        <div className="duo-popover-backdrop" onClick={() => setSelectedStage(null)}>
          <div className="duo-popover-card" onClick={(e) => e.stopPropagation()}>
            <button className="duo-popover-close" onClick={() => setSelectedStage(null)}>
              <X size={16} />
            </button>
            <div style={{ fontSize: '2.8rem', marginBottom: '.6rem' }}>{selectedStage.icon}</div>
            <div style={{ fontSize: '.78rem', fontWeight: 800, color: 'var(--duo-blue, #1cb0f6)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.3rem' }}>
              Milestone {selectedStage.number}
            </div>
            <h3 style={{ fontSize: '1.35rem', margin: '0 0 .5rem' }}>{selectedStage.title}</h3>
            <p style={{ color: 'var(--text-2)', fontSize: '.9rem', margin: '0 0 1.2rem' }}>
              {selectedStage.sub}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1.4rem' }}>
              <span className="tag blue">⚡ +{selectedStage.xpReward} XP</span>
              <span className="tag purple">💎 +{selectedStage.gemsReward} Gems</span>
              <span className="tag green">{selectedStage.difficulty.toUpperCase()}</span>
            </div>

            <button
              className="btn-duo btn-duo-green"
              style={{ width: '100%' }}
              onClick={() => handleStartStage(selectedStage)}
            >
              <Play size={16} style={{ fill: 'currentColor' }} /> Practice Stage Now
            </button>
          </div>
        </div>
      )}

      {/* Chest Reward Modal */}
      {chestModal && (
        <div className="duo-popover-backdrop" onClick={() => setChestModal(false)}>
          <div className="duo-popover-card" onClick={(e) => e.stopPropagation()}>
            <button className="duo-popover-close" onClick={() => setChestModal(false)}>
              <X size={16} />
            </button>
            <div style={{ fontSize: '3rem', marginBottom: '.5rem', animation: 'duoBounce 1.5s infinite' }}>💎</div>
            <h3 style={{ fontSize: '1.4rem', margin: '0 0 .5rem' }}>Reward Chest Unlocked!</h3>
            <p style={{ color: 'var(--text-2)', fontSize: '.92rem', margin: '0 0 1.2rem' }}>
              You found a hidden bonus on the Career Quest path. <strong>+30 Gems</strong> have been added to your bank!
            </p>
            <button className="btn-duo btn-duo-blue" style={{ width: '100%' }} onClick={() => setChestModal(false)}>
              Claim & Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
  BookOpen,
} from 'lucide-react';
import { addGems, playDuoSound } from '@/lib/gamification';
import UnitGuidebookModal from '@/components/UnitGuidebookModal';

type StageNode = {
  id: string;
  unit: number;
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

const UNIT_1_STAGES: StageNode[] = [
  {
    id: 'stage-1',
    unit: 1,
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
    unit: 1,
    number: 2,
    title: 'Behavioral & Situational Basics',
    sub: 'Explain conflict, teamwork, and decision-making scenarios',
    type: 'behav',
    difficulty: 'fresher',
    icon: '🗣️',
    status: 'active',
    stars: 1,
    xpReward: 75,
    gemsReward: 20,
  },
  {
    id: 'stage-3',
    unit: 1,
    number: 3,
    title: 'STAR Method Framework',
    sub: 'Structure Situation, Task, Action & Result with high impact',
    type: 'behav',
    difficulty: 'mid',
    icon: '🌟',
    status: 'locked',
    stars: 0,
    xpReward: 90,
    gemsReward: 25,
  },
];

const UNIT_2_STAGES: StageNode[] = [
  {
    id: 'stage-4',
    unit: 2,
    number: 4,
    title: 'Technical Fundamentals',
    sub: 'Data structures, algorithms & domain problem solving',
    type: 'tech',
    difficulty: 'mid',
    icon: '💻',
    status: 'locked',
    stars: 0,
    xpReward: 110,
    gemsReward: 30,
  },
  {
    id: 'stage-5',
    unit: 2,
    number: 5,
    title: 'System Design & Trade-Offs',
    sub: 'Scalability, microservices, databases & caching strategies',
    type: 'tech',
    difficulty: 'adv',
    icon: '🏗️',
    status: 'locked',
    stars: 0,
    xpReward: 140,
    gemsReward: 40,
  },
  {
    id: 'stage-6',
    unit: 2,
    number: 6,
    title: 'Executive Final Round',
    sub: 'Leadership vision, salary negotiation & closing the offer',
    type: 'hr',
    difficulty: 'adv',
    icon: '👑',
    status: 'locked',
    stars: 0,
    xpReward: 180,
    gemsReward: 50,
  },
];

export default function CareerQuestPath() {
  const router = useRouter();
  const [selectedStage, setSelectedStage] = useState<StageNode | null>(null);
  const [chestClaimed, setChestClaimed] = useState(false);
  const [chestModal, setChestModal] = useState(false);
  const [guidebookUnit, setGuidebookUnit] = useState<{ number: number; title: string } | null>(null);

  const handleOpenChest = () => {
    if (chestClaimed) return;
    addGems(30);
    setChestClaimed(true);
    setChestModal(true);
    playDuoSound('chest');
  };

  const handleStartStage = (stage: StageNode) => {
    playDuoSound('pop');
    router.push(`/dashboard/interview?type=${stage.type}&diff=${stage.difficulty}`);
  };

  const renderStagesList = (stages: StageNode[], isUnit1: boolean) => {
    const offsetPositions = ['0px', '52px', '-52px', '40px', '-40px', '0px'];

    return (
      <div className="duo-unit-path-track">
        {stages.map((stage, idx) => {
          const isCompleted = stage.status === 'completed';
          const isActive = stage.status === 'active';
          const isLocked = stage.status === 'locked';
          const offset = offsetPositions[idx % offsetPositions.length];

          return (
            <React.Fragment key={stage.id}>
              {/* Stepping Connector Dots */}
              {idx > 0 && (
                <div className="duo-stepping-connector">
                  <span className="step-dot" />
                  <span className="step-dot" />
                  <span className="step-dot" />
                </div>
              )}

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
                  <span>
                    {isCompleted ? 'Completed' : isActive ? 'Current Goal' : 'Locked'}
                  </span>
                </div>
              </div>

              {/* Reward Chest inside Unit 1 */}
              {isUnit1 && idx === 1 && (
                <div className="duo-chest-wrapper" style={{ transform: 'translateX(-30px)' }}>
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
    );
  };

  return (
    <div className="career-quest-container">
      {/* Unit 1 Header */}
      <div className="duo-unit-banner unit-1-bg">
        <div className="duo-unit-banner-content">
          <div>
            <span className="unit-badge">UNIT 1</span>
            <h3>HR Round &amp; Culture Fit</h3>
            <p>Master your elevator pitch, STAR stories &amp; behavioral questions</p>
          </div>
          <button
            className="btn-duo btn-duo-ghost btn-duo-sm guidebook-btn"
            onClick={() => setGuidebookUnit({ number: 1, title: 'HR Round & Culture Fit' })}
          >
            <BookOpen size={16} /> Guidebook
          </button>
        </div>
      </div>

      {/* Mascot Cheer Bubble */}
      <div className="mascot-cheer-row">
        <div className="mascot-avatar">🦉</div>
        <div className="mascot-speech-bubble">
          <strong>Daily Goal Active!</strong> Practice 5 minutes today to protect your streak flame 🔥
        </div>
      </div>

      {/* Unit 1 Path */}
      {renderStagesList(UNIT_1_STAGES, true)}

      {/* Unit 2 Header */}
      <div className="duo-unit-banner unit-2-bg" style={{ marginTop: '2.5rem' }}>
        <div className="duo-unit-banner-content">
          <div>
            <span className="unit-badge">UNIT 2</span>
            <h3>Technical Deep Dive &amp; System Design</h3>
            <p>Live technical questions, architecture trade-offs &amp; executive closing</p>
          </div>
          <button
            className="btn-duo btn-duo-ghost btn-duo-sm guidebook-btn"
            onClick={() => setGuidebookUnit({ number: 2, title: 'Technical & System Design' })}
          >
            <BookOpen size={16} /> Guidebook
          </button>
        </div>
      </div>

      {/* Unit 2 Path */}
      {renderStagesList(UNIT_2_STAGES, false)}

      {/* Stage Launch Modal */}
      {selectedStage && (
        <div className="duo-popover-backdrop" onClick={() => setSelectedStage(null)}>
          <div className="duo-popover-card" onClick={(e) => e.stopPropagation()}>
            <button className="duo-popover-close" onClick={() => setSelectedStage(null)}>
              <X size={16} />
            </button>
            <div style={{ fontSize: '2.8rem', marginBottom: '.6rem' }}>{selectedStage.icon}</div>
            <div style={{ fontSize: '.78rem', fontWeight: 800, color: 'var(--duo-blue, #1cb0f6)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.3rem' }}>
              Milestone {selectedStage.number} &middot; Unit {selectedStage.unit}
            </div>
            <h3 style={{ fontSize: '1.35rem', margin: '0 0 .5rem' }}>{selectedStage.title}</h3>
            <p style={{ color: 'var(--text-2)', fontSize: '.9rem', margin: '0 0 1.2rem' }}>
              {selectedStage.sub}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.8rem', marginBottom: '1.4rem', flexWrap: 'wrap' }}>
              <span className="tag blue">⚡ +{selectedStage.xpReward} XP</span>
              <span className="tag purple">💎 +{selectedStage.gemsReward} Gems</span>
              <span className="tag green">{selectedStage.difficulty.toUpperCase()}</span>
            </div>

            <button
              className="btn-duo btn-duo-green btn-duo-lg"
              style={{ width: '100%' }}
              onClick={() => handleStartStage(selectedStage)}
            >
              <Play size={18} style={{ fill: 'currentColor' }} /> Practice Milestone Now
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
              Claim &amp; Continue
            </button>
          </div>
        </div>
      )}

      {/* Guidebook Modal */}
      {guidebookUnit && (
        <UnitGuidebookModal
          unitNumber={guidebookUnit.number}
          unitTitle={guidebookUnit.title}
          isOpen={true}
          onClose={() => setGuidebookUnit(null)}
        />
      )}
    </div>
  );
}

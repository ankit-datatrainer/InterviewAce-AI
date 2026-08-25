'use client';

import React from 'react';
import DashboardModal from '@/components/DashboardModal';

export type DuolingoModalProps = {
  isOpen: boolean;
  type?: 'quit_warning' | 'strike_warning' | 'terminated' | 'success' | 'quest_complete';
  title: string;
  subtitle?: string;
  heartsRemaining?: number;
  maxHearts?: number;
  streakDays?: number;
  xpEarned?: number;
  gemsEarned?: number;
  primaryButtonText: string;
  onPrimaryClick: () => void;
  secondaryButtonText?: string;
  onSecondaryClick?: () => void;
  onClose?: () => void;
  children?: React.ReactNode;
};

export default function DuolingoModal({
  isOpen,
  type = 'quit_warning',
  title,
  subtitle,
  heartsRemaining = 3,
  maxHearts = 3,
  streakDays,
  xpEarned,
  gemsEarned,
  primaryButtonText,
  onPrimaryClick,
  secondaryButtonText,
  onSecondaryClick,
  onClose,
  children,
}: DuolingoModalProps) {
  return (
    <DashboardModal
      open={isOpen}
      onClose={onClose ?? (() => {})}
      ariaLabel={title}
      cardClassName="duo-modal-card"
      maxWidth="480px"
      showClose={Boolean(onClose)}
      dismissible={Boolean(onClose)}
    >

        {/* Mascot / Avatar / Badge Graphic */}
        <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'center' }}>
          {type === 'quit_warning' && (
            <div
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ff9600 0%, #ff5252 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                boxShadow: '0 12px 28px -6px rgba(255, 150, 0, 0.45)',
                border: '4px solid #fff',
                animation: 'duoBounce 1.8s infinite',
              }}
            >
              🦉
            </div>
          )}

          {type === 'strike_warning' && (
            <div
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.2rem',
                boxShadow: '0 12px 28px -6px rgba(239, 68, 68, 0.5)',
                border: '4px solid #fff',
                animation: 'duoShake 0.6s ease',
              }}
            >
              ⚠️
            </div>
          )}

          {type === 'terminated' && (
            <div
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #64748b 0%, #334155 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.4rem',
                boxShadow: '0 12px 28px -6px rgba(100, 116, 139, 0.4)',
                border: '4px solid #fff',
              }}
            >
              💔
            </div>
          )}

          {type === 'success' && (
            <div
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #58cc02 0%, #22c55e 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.4rem',
                boxShadow: '0 12px 28px -6px rgba(88, 204, 2, 0.5)',
                border: '4px solid #fff',
                animation: 'duoBounce 2s infinite',
              }}
            >
              🎉
            </div>
          )}

          {type === 'quest_complete' && (
            <div
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ffc800 0%, #ff9600 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.4rem',
                boxShadow: '0 12px 28px -6px rgba(255, 200, 0, 0.5)',
                border: '4px solid #fff',
                animation: 'duoPulse 2s infinite',
              }}
            >
              💎
            </div>
          )}
        </div>

        {/* Hearts indicator if applicable */}
        {(type === 'strike_warning' || type === 'terminated' || type === 'quit_warning') && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.4rem 0.9rem',
              borderRadius: '999px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              marginBottom: '1rem',
            }}
          >
            {Array.from({ length: maxHearts }).map((_, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: '1.2rem',
                  filter: idx < heartsRemaining ? 'drop-shadow(0 2px 4px rgba(239,68,68,0.4))' : 'grayscale(1) opacity(0.35)',
                  transition: 'all 0.3s',
                }}
              >
                {idx < heartsRemaining ? '❤️' : '🤍'}
              </span>
            ))}
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ef4444', marginLeft: '0.3rem' }}>
              {heartsRemaining} of {maxHearts} Lives
            </span>
          </div>
        )}

        {/* Title */}
        <h2
          style={{
            fontSize: '1.55rem',
            fontWeight: 800,
            color: 'var(--text, #fff)',
            margin: '0 0 0.6rem',
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h2>

        {/* Subtitle */}
        {subtitle && (
          <p
            style={{
              fontSize: '0.94rem',
              color: 'var(--text-2, #94a3b8)',
              lineHeight: 1.55,
              margin: '0 0 1.5rem',
            }}
          >
            {subtitle}
          </p>
        )}

        {/* Rewards pill if earned */}
        {(xpEarned || gemsEarned || streakDays) && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            {xpEarned && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '14px',
                  background: 'rgba(255, 200, 0, 0.15)',
                  border: '1px solid rgba(255, 200, 0, 0.3)',
                  fontWeight: 800,
                  color: '#ffc800',
                  fontSize: '0.92rem',
                }}
              >
                ⚡ +{xpEarned} XP
              </div>
            )}
            {gemsEarned && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '14px',
                  background: 'rgba(28, 176, 246, 0.15)',
                  border: '1px solid rgba(28, 176, 246, 0.3)',
                  fontWeight: 800,
                  color: '#1cb0f6',
                  fontSize: '0.92rem',
                }}
              >
                💎 +{gemsEarned} Gems
              </div>
            )}
            {streakDays && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '14px',
                  background: 'rgba(255, 150, 0, 0.14)',
                  border: '1px solid rgba(255, 150, 0, 0.3)',
                  fontWeight: 800,
                  color: '#ff9600',
                  fontSize: '0.92rem',
                }}
              >
                🔥 {streakDays} day streak
              </div>
            )}
          </div>
        )}

        {children}

        {/* Action Buttons (Duolingo 3D Tactile Buttons) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button
            onClick={onPrimaryClick}
            className={`btn-duo ${type === 'strike_warning' ? 'btn-duo-green' : type === 'terminated' ? 'btn-duo-blue' : 'btn-duo-green'}`}
            style={{
              width: '100%',
              padding: '0.95rem 1.4rem',
              fontSize: '1rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              borderRadius: '16px',
            }}
          >
            {primaryButtonText}
          </button>

          {secondaryButtonText && onSecondaryClick && (
            <button
              onClick={onSecondaryClick}
              className="btn-duo btn-duo-ghost"
              style={{
                width: '100%',
                padding: '0.85rem 1.4rem',
                fontSize: '0.95rem',
                fontWeight: 750,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                borderRadius: '16px',
              }}
            >
              {secondaryButtonText}
            </button>
          )}
        </div>
    </DashboardModal>
  );
}

'use client';

import React, { CSSProperties, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

type DashboardModalProps = {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  children: React.ReactNode;
  cardClassName?: string;
  cardStyle?: CSSProperties;
  maxWidth?: string;
  showClose?: boolean;
  dismissible?: boolean;
};

let openModalCount = 0;

export default function DashboardModal({
  open,
  onClose,
  ariaLabel,
  children,
  cardClassName = '',
  cardStyle,
  maxWidth = '440px',
  showClose = true,
  dismissible = true,
}: DashboardModalProps) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    openModalCount += 1;
    document.body.classList.add('dashboard-modal-open');

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dismissible) onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.requestAnimationFrame(() => dialogRef.current?.focus());

    return () => {
      openModalCount = Math.max(0, openModalCount - 1);
      if (openModalCount === 0) document.body.classList.remove('dashboard-modal-open');
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [dismissible, onClose, open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="duo-popover-backdrop"
      onMouseDown={(event) => {
        if (dismissible && event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={`duo-popover-card ${cardClassName}`.trim()}
        style={{ maxWidth, ...cardStyle }}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
      >
        {showClose && dismissible && (
          <button className="duo-popover-close" onClick={onClose} aria-label="Close dialog">
            <X size={17} />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}

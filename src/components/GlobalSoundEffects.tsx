'use client';

import { useEffect, useRef } from 'react';
import { playDuoSound, playTypeSound } from '@/lib/gamification';

const IGNORED_KEYS = new Set([
  'Shift',
  'Control',
  'Alt',
  'Meta',
  'CapsLock',
  'Tab',
  'Escape',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  'Insert',
  'ContextMenu',
  'NumLock',
  'ScrollLock',
  'Pause',
  'PrintScreen',
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
  'F6',
  'F7',
  'F8',
  'F9',
  'F10',
  'F11',
  'F12',
]);

export default function GlobalSoundEffects() {
  const lastClickTimeRef = useRef<number>(0);

  useEffect(() => {
    // 1. GLOBAL KEYBOARD TYPING SOUND EFFECT (Dashboard, Forms, Chat, Inputs)
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const isInputElement =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.getAttribute('role') === 'textbox';

      if (!isInputElement) return;

      // Ignore non-typing modifier keys
      if (IGNORED_KEYS.has(e.key)) return;

      // Ignore shortcuts like Ctrl+C, Ctrl+V, etc.
      if ((e.ctrlKey || e.metaKey || e.altKey) && e.key.length !== 1) {
        return;
      }

      playTypeSound(e.key);
    };

    // 2. GLOBAL CLICK SOUND EFFECT (Dashboard sidebar, buttons, links, tabs, interactive cards)
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Don't play click sound when clicking inside text inputs or textareas (typing sound handles those)
      if (
        target.tagName === 'INPUT' &&
        (target as HTMLInputElement).type !== 'button' &&
        (target as HTMLInputElement).type !== 'submit' &&
        (target as HTMLInputElement).type !== 'checkbox' &&
        (target as HTMLInputElement).type !== 'radio'
      ) {
        return;
      }
      if (target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Check if target or any parent is an interactive clickable element
      const interactiveEl = target.closest(
        'button, a, [role="button"], [role="tab"], [role="checkbox"], [role="switch"], [role="link"], input[type="button"], input[type="submit"], input[type="checkbox"], input[type="radio"], .btn, .btn-duo, .side-link, .b-nav-item, .clickable, .tab-btn, .nav-link-item, .award-float-badge, .stat-pill, .chip, .duo-coach-card'
      );

      if (interactiveEl) {
        // Avoid disabled elements
        if ((interactiveEl as HTMLButtonElement).disabled) return;

        // Prevent double triggers within 40ms
        const now = Date.now();
        if (now - lastClickTimeRef.current < 40) return;
        lastClickTimeRef.current = now;

        playDuoSound('pop');
      }
    };

    // Attach listeners to window with capture phase for universal application-wide coverage
    window.addEventListener('keydown', handleKeyDown, { capture: true, passive: true });
    window.addEventListener('click', handleGlobalClick, { capture: true, passive: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('click', handleGlobalClick, { capture: true });
    };
  }, []);

  return null;
}

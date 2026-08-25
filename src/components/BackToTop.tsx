'use client';

import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { playDuoSound } from '@/lib/gamification';

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 280) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    try {
      playDuoSound('pop');
    } catch {
      // Ignore if sound not loaded
    }
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`back-to-top-btn ${visible ? 'back-to-top-visible' : ''}`}
      aria-label="Scroll back to top"
      title="Back to Top"
    >
      <ArrowUp size={20} strokeWidth={2.5} />
    </button>
  );
}

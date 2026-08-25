'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Moon, Sun, Menu, X, Flame, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { getGamificationState, playDuoSound, GamificationState } from '@/lib/gamification';

export default function Navbar() {
  const [dark, setDark] = useState<boolean | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [gameState, setGameState] = useState<GamificationState | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const current = saved || document.documentElement.getAttribute('data-theme') || 'light';
    setDark(current === 'dark');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
      document.cookie = `theme=${saved};path=/;max-age=31536000;SameSite=Lax`;
    }

    setGameState(getGamificationState());
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<GamificationState>;
      if (customEvent.detail) setGameState(customEvent.detail);
      else setGameState(getGamificationState());
    };
    window.addEventListener('gamification_updated', handleUpdate);
    return () => window.removeEventListener('gamification_updated', handleUpdate);
  }, []);

  useEffect(() => {
    let isMounted = true;
    let authSub: { unsubscribe: () => void } | null = null;

    try {
      const supabase = createClient();

      // Check current session on mount safely
      supabase.auth.getUser()
        .then((res) => {
          if (isMounted) {
            setIsAuthenticated(!!res?.data?.user && !res?.error);
          }
        })
        .catch(() => {
          if (isMounted) {
            setIsAuthenticated(false);
          }
        });

      // Listen for auth state changes safely
      const listener = supabase.auth.onAuthStateChange((_event, session) => {
        if (isMounted) {
          setIsAuthenticated(!!session?.user);
        }
      });
      authSub = listener.data?.subscription || null;
    } catch {
      if (isMounted) setIsAuthenticated(false);
    }

    return () => {
      isMounted = false;
      if (authSub) {
        authSub.unsubscribe();
      }
    };
  }, []);

  function toggleTheme() {
    playDuoSound('pop');
    const next = dark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    document.cookie = `theme=${next};path=/;max-age=31536000;SameSite=Lax`;
    setDark(!dark);
  }

  const isLanding = pathname === '/';

  // Hide the marketing navbar inside all app portals (student, admin, coach).
  if (
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/dashboard') ||
    pathname?.startsWith('/coach')
  ) {
    return null;
  }

  const navLinks = [
    { label: 'Features', href: isLanding ? '#features' : '/#features' },
    { label: 'How It Works', href: isLanding ? '#how' : '/#how' },
    { label: 'Coaching', href: isLanding ? '#coaching' : '/#coaching' },
    { label: 'Hall of Fame', href: isLanding ? '#testimonials' : '/#testimonials' },
    { label: 'FAQ', href: isLanding ? '#faq' : '/#faq' },
  ];

  return (
    <nav className="topnav">
      <div className="container nav-inner">
        <div className="nav-brand-wrap">
          <Link href="/" className="logo" onClick={() => playDuoSound('pop')}>
            <span className="logo-wordmark">Interview<span className="logo-ace">Ace</span></span>
            <span className="logo-badge" style={{ background: 'var(--duo-green, #58cc02)', color: '#fff' }}>ARENA</span>
          </Link>
        </div>

        <div className="nav-links">
          {navLinks.map((link) =>
            link.href.startsWith('#') ? (
              <a key={link.label} href={link.href} className="nav-link-item" onClick={() => playDuoSound('pop')}>
                {link.label}
              </a>
            ) : (
              <Link key={link.label} href={link.href} className="nav-link-item" onClick={() => playDuoSound('pop')}>
                {link.label}
              </Link>
            )
          )}
        </div>

        <div className="nav-actions">
          {/* Quick Streak / XP Pill */}
          {gameState && (
            <Link
              href="/dashboard"
              className="stat-pill streak-pill nav-streak-badge"
              style={{ textDecoration: 'none', display: 'inline-flex' }}
              title="Your Daily Interview Streak"
              onClick={() => playDuoSound('streak')}
            >
              <span className="flame-icon">🔥</span>
              <span>{gameState.streak}d</span>
              <span style={{ color: '#1cb0f6', marginLeft: '4px' }}>💎 {gameState.gems}</span>
            </Link>
          )}

          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            {dark === null ? <Moon size={18} /> : dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {isAuthenticated ? (
            <Link href="/dashboard" className="btn-duo btn-duo-green btn-duo-sm" onClick={() => playDuoSound('pop')}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="nav-login-btn" onClick={() => playDuoSound('pop')}>
                Log in
              </Link>
              <Link href="/signup" className="btn-duo btn-duo-green btn-duo-sm" onClick={() => playDuoSound('pop')}>
                Start Free
              </Link>
            </>
          )}

          <button
            className="hamburger"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="mobile-menu open">
          {navLinks.map((link) =>
            link.href.startsWith('#') ? (
              <a key={link.label} href={link.href} onClick={() => { playDuoSound('pop'); setMobileOpen(false); }} style={{ minHeight: '44px', display: 'flex', alignItems: 'center', fontSize: '1rem', padding: '0.5rem 0' }}>
                {link.label}
              </a>
            ) : (
              <Link key={link.label} href={link.href} onClick={() => { playDuoSound('pop'); setMobileOpen(false); }} style={{ minHeight: '44px', display: 'flex', alignItems: 'center', fontSize: '1rem', padding: '0.5rem 0' }}>
                {link.label}
              </Link>
            )
          )}
          {isAuthenticated ? (
            <Link href="/dashboard" className="btn-duo btn-duo-green btn-duo-sm" onClick={() => { playDuoSound('pop'); setMobileOpen(false); }} style={{ minHeight: '44px', justifyContent: 'center' }}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-duo btn-duo-ghost btn-duo-sm" onClick={() => { playDuoSound('pop'); setMobileOpen(false); }} style={{ minHeight: '44px', justifyContent: 'center' }}>
                Log in
              </Link>
              <Link href="/signup" className="btn-duo btn-duo-green btn-duo-sm" onClick={() => { playDuoSound('pop'); setMobileOpen(false); }} style={{ minHeight: '44px', justifyContent: 'center' }}>
                Start Free
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

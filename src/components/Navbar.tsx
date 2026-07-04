'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Moon, Sun, Menu, X } from 'lucide-react';
import { createClient } from '@/lib/supabase';

export default function Navbar() {
  const [dark, setDark] = useState<boolean | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const current = saved || document.documentElement.getAttribute('data-theme') || 'light';
    setDark(current === 'dark');
    // Keep the SSR cookie in sync with a pre-existing localStorage preference,
    // so future server renders apply the right theme with no flash.
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
      document.cookie = `theme=${saved};path=/;max-age=31536000;SameSite=Lax`;
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // Check current session on mount
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(!!user);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  function toggleTheme() {
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
    { label: 'How it works', href: isLanding ? '#how' : '/#how' },
    { label: 'Pricing', href: isLanding ? '#pricing' : '/#pricing' },
    { label: 'Coaching', href: '/dashboard/coaching' },
    { label: 'FAQ', href: isLanding ? '#faq' : '/#faq' },
  ];

  return (
    <nav className="topnav">
      <div className="container nav-inner">
        <Link href="/" className="logo">
          <span className="logo-wordmark">Interview<span className="logo-ace">Ace</span></span>
          <span className="logo-badge">AI</span>
        </Link>

        <div className="nav-links">
          {navLinks.map((link) =>
            link.href.startsWith('#') ? (
              <a key={link.label} href={link.href}>
                {link.label}
              </a>
            ) : (
              <Link key={link.label} href={link.href}>
                {link.label}
              </Link>
            )
          )}
        </div>

        <div className="nav-actions">
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            {dark === null ? <Moon size={18} /> : dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {isAuthenticated ? (
            <Link href="/dashboard" className="btn btn-primary btn-sm">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">
                Log in
              </Link>
              <Link href="/signup" className="btn btn-primary btn-sm">
                Start free
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
              <a key={link.label} href={link.href} onClick={() => setMobileOpen(false)} style={{ minHeight: '44px', display: 'flex', alignItems: 'center', fontSize: '1rem', padding: '0.5rem 0' }}>
                {link.label}
              </a>
            ) : (
              <Link key={link.label} href={link.href} onClick={() => setMobileOpen(false)} style={{ minHeight: '44px', display: 'flex', alignItems: 'center', fontSize: '1rem', padding: '0.5rem 0' }}>
                {link.label}
              </Link>
            )
          )}
          {isAuthenticated ? (
            <Link href="/dashboard" className="btn btn-primary btn-sm" onClick={() => setMobileOpen(false)} style={{ minHeight: '44px', justifyContent: 'center' }}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm" onClick={() => setMobileOpen(false)} style={{ minHeight: '44px', justifyContent: 'center' }}>
                Log in
              </Link>
              <Link href="/signup" className="btn btn-primary btn-sm" onClick={() => setMobileOpen(false)} style={{ minHeight: '44px', justifyContent: 'center' }}>
                Start free
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

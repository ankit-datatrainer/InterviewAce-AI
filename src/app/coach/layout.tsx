'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  Video,
  Users,
  IndianRupee,
  Star,
  UserCircle,
  Settings,
  ArrowLeft,
  GraduationCap,
  Menu,
  X,
  LogOut
} from 'lucide-react';
import { createClient } from '@/lib/supabase';

const coachLinks = [
  { href: '/coach', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/coach/sessions', label: 'My Sessions', icon: Video },
  { href: '/coach/availability', label: 'Availability', icon: CalendarDays },
  { href: '/coach/students', label: 'My Students', icon: Users },
  { href: '/coach/earnings', label: 'Earnings', icon: IndianRupee },
  { href: '/coach/reviews', label: 'Reviews', icon: Star },
  { href: '/coach/profile', label: 'My Profile', icon: UserCircle },
  { href: '/coach/settings', label: 'Settings', icon: Settings },
];

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  const isActive = (href: string) => {
    if (href === '/coach') return pathname === '/coach';
    return pathname.startsWith(href);
  };

  return (
    <div className="app-shell">
      {/* Mobile Header */}
      <div className="mobile-dash-header">
        <h2>Coach Portal</h2>
        <button 
          className="dash-hamburger" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Dashboard Menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.5rem .8rem', marginBottom: '.6rem' }}>
          <span
            style={{
               width: 32,
               height: 32,
               borderRadius: 10,
               background: 'var(--grad)',
               display: 'grid',
               placeItems: 'center',
               color: '#fff',
               fontSize: '.95rem',
               boxShadow: '0 6px 18px -4px rgba(37,99,235,.6)',
            }}
          >
            <GraduationCap size={17} />
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '.95rem' }}>
            Coach Portal
          </span>
        </div>

        <span className="side-group">Manage</span>
        {coachLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`side-link${isActive(link.href) ? ' on' : ''}`}
            >
              <span className="ic"><Icon size={18} /></span>
              {link.label}
            </Link>
          );
        })}

        <span className="side-group">Exit</span>
        <button onClick={handleLogout} className="side-link" style={{ border: 'none', background: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
          <span className="ic"><LogOut size={18} /></span>
          Log out
        </button>
        <Link href="/" className="side-link">
          <span className="ic"><ArrowLeft size={18} /></span>
          Back to website
        </Link>
      </aside>

      {/* Overlay to close menu when clicking outside on mobile */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 65
          }}
        />
      )}

      {/* Bottom Nav for mobile max-width: 680px */}
      <nav className="bottom-nav">
        <Link href="/coach" className={`b-nav-item ${isActive('/coach') ? 'on' : ''}`}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </Link>
        <Link href="/coach/availability" className={`b-nav-item ${pathname === '/coach/availability' ? 'on' : ''}`}>
          <CalendarDays size={20} />
          <span>Availability</span>
        </Link>
        <button className="b-nav-item" onClick={() => setMobileMenuOpen(true)}>
          <Menu size={20} />
          <span>Menu</span>
        </button>
      </nav>

      <div className="app-main">
        {children}
      </div>
    </div>
  );
}

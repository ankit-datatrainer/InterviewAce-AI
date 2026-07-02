'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Home,
  Mic,
  FileText,
  ClipboardList,
  GraduationCap,
  TrendingUp,
  Settings,
  ArrowLeft,
  LogOut,
  Clock,
  Star,
  Menu,
  X
} from 'lucide-react';
import { createClient } from '@/lib/supabase';

const studentLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/dashboard/interview', label: 'Mock Interviews', icon: Mic },
  { href: '/dashboard/history', label: 'Interview History', icon: Clock },
  { href: '/dashboard/ats', label: 'Resume Analyzer', icon: FileText },
  { href: '/dashboard/resume-builder', label: 'Resume Builder', icon: FileText },
  { href: '/dashboard/star-builder', label: 'STAR Builder', icon: Star },
  { href: '/dashboard/analysis', label: 'Reports', icon: ClipboardList },
  { href: '/dashboard/coaching', label: 'Coaching Sessions', icon: GraduationCap },
  { href: '/dashboard/analytics', label: 'Progress Analytics', icon: TrendingUp },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <div className="app-shell">
      {/* Mobile Header */}
      <div className="mobile-dash-header">
        <h2>Dashboard</h2>
        <button 
          className="dash-hamburger" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Dashboard Menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <span className="side-group">Student</span>
        {studentLinks.map((link) => {
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
        <button onClick={handleLogout} className="side-link" style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
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
        <Link href="/dashboard" className={`b-nav-item ${isActive('/dashboard') ? 'on' : ''}`}>
          <Home size={20} />
          <span>Home</span>
        </Link>
        <Link href="/dashboard/interview" className={`b-nav-item ${pathname === '/dashboard/interview' ? 'on' : ''}`}>
          <Mic size={20} />
          <span>Practice</span>
        </Link>
        <Link href="/dashboard/ats" className={`b-nav-item ${pathname === '/dashboard/ats' ? 'on' : ''}`}>
          <FileText size={20} />
          <span>Resume</span>
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

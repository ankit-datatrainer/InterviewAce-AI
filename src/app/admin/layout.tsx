'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Mic,
  FileText,
  GraduationCap,
  IndianRupee,
  Wallet,
  TrendingUp,
  Megaphone,
  ScrollText,
  Database,
  TicketCheck,
  Settings,
  ArrowLeft,
  Shield,
  Menu,
  X,
  LogOut
} from 'lucide-react';
import { createClient } from '@/lib/supabase';

const adminLinks = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/analytics', label: 'Analytics', icon: TrendingUp },
  { href: '/admin/users', label: 'User Management', icon: Users },
  { href: '/admin/interviews', label: 'Interview Management', icon: Mic },
  { href: '/admin/resumes', label: 'Resume Reports', icon: FileText },
  { href: '/admin/coaches', label: 'Coach Management', icon: GraduationCap },
  { href: '/admin/payouts', label: 'Coach Payouts', icon: Wallet },
  { href: '/admin/payments', label: 'Payments', icon: IndianRupee },
  { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/admin/content', label: 'Content Management', icon: Database },
  { href: '/admin/tickets', label: 'Support Tickets', icon: TicketCheck },
  { href: '/admin/audit', label: 'Audit Log', icon: ScrollText },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  async function handleLogout() {
    // Clear admin cookies
    document.cookie = "isAdmin=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "admin_bypass=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <div className="app-shell">
      {/* Mobile Header */}
      <div className="mobile-dash-header">
        <h2>Admin Panel</h2>
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
            <Shield size={17} />
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '.95rem' }}>
            Admin Panel
          </span>
        </div>

        <span className="side-group">Manage</span>
        {adminLinks.map((link) => {
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
        <Link href="/admin" className={`b-nav-item ${isActive('/admin') ? 'on' : ''}`}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </Link>
        <Link href="/admin/users" className={`b-nav-item ${pathname === '/admin/users' ? 'on' : ''}`}>
          <Users size={20} />
          <span>Users</span>
        </Link>
        <Link href="/admin/interviews" className={`b-nav-item ${pathname === '/admin/interviews' ? 'on' : ''}`}>
          <Mic size={20} />
          <span>Interviews</span>
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

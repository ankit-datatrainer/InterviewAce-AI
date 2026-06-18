'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Mic,
  FileText,
  GraduationCap,
  IndianRupee,
  Database,
  TicketCheck,
  Settings,
  ArrowLeft,
  Shield,
} from 'lucide-react';

const adminLinks = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'User Management', icon: Users },
  { href: '/admin/interviews', label: 'Interview Management', icon: Mic },
  { href: '/admin/resumes', label: 'Resume Reports', icon: FileText },
  { href: '/admin/coaches', label: 'Coach Management', icon: GraduationCap },
  { href: '/admin/payments', label: 'Payments', icon: IndianRupee },
  { href: '/admin/content', label: 'Content Management', icon: Database },
  { href: '/admin/tickets', label: 'Support Tickets', icon: TicketCheck },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
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
        <Link href="/" className="side-link">
          <span className="ic"><ArrowLeft size={18} /></span>
          Back to website
        </Link>
      </aside>

      <div className="app-main">
        {children}
      </div>
    </div>
  );
}

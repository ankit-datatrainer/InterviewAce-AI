'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle, LogIn } from 'lucide-react';
import { createClient } from '@/lib/supabase';

// Landing page for the Supabase email-verification link. Shows the success
// message and a single "Go to login" button that takes the user to the login
// page to sign in.
export default function EmailVerifiedPage() {
  const router = useRouter();

  const goToLogin = async () => {
    // The verification link auto-establishes a session via the URL hash. Clear
    // it so the user lands on a clean login screen and signs in explicitly.
    try { await createClient().auth.signOut(); } catch { /* ignore */ }
    router.push('/login');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div className="widget" style={{ maxWidth: 520, width: '100%', textAlign: 'center', padding: '3.5rem 2.5rem', border: '1px solid rgba(16,185,129,0.25)' }}>
        <CheckCircle size={72} color="#10b981" style={{ margin: '0 auto 1.5rem', filter: 'drop-shadow(0 0 18px rgba(16,185,129,0.35))' }} />
        <h1 style={{ fontSize: '1.6rem', marginBottom: '1rem' }}>Email verified</h1>
        <p style={{ color: 'var(--text-2)', fontSize: '1.05rem', lineHeight: 1.7, margin: '0 0 2rem' }}>
          Your email has been verified successfully. Please return to the application window to continue.
        </p>
        <button
          onClick={goToLogin}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 2.5rem', fontSize: '1rem', borderRadius: 'var(--r-full)' }}
        >
          <LogIn size={18} /> Go to login
        </button>
      </div>
    </div>
  );
}

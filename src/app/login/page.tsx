'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, AlertCircle, Mail, LogIn } from 'lucide-react'

import { createClient } from '@/lib/supabase'
import { ADMIN_EMAILS } from '@/lib/roles'

/* ── inline micro-styles that don't exist in the global sheet ── */
const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '100px 16px 60px',
    position: 'relative' as const,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 20,
    padding: '2.4rem 2rem',
    backdropFilter: 'blur(24px)',
    boxShadow: 'var(--shadow)',
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
  cardGlow: {
    position: 'absolute' as const,
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: '50%',
    background: 'var(--grad)',
    opacity: 0.08,
    filter: 'blur(60px)',
    pointerEvents: 'none' as const,
  },
  inputGroup: {
    marginBottom: '1.25rem',
  },
  label: {
    display: 'block',
    fontSize: '0.82rem',
    fontWeight: 600,
    color: 'var(--text-2)',
    marginBottom: 6,
    letterSpacing: '0.02em',
    textTransform: 'uppercase' as const,
  },
  inputWrap: {
    position: 'relative' as const,
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'var(--card)',
    border: '1px solid var(--line)',
    borderRadius: 12,
    fontSize: '0.95rem',
    color: 'var(--text)',
    transition: 'border-color .2s, box-shadow .2s',
    outline: 'none',
  },
  eyeBtn: {
    position: 'absolute' as const,
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-3)',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
  },
  alertBox: {
    borderRadius: 12,
    padding: '0.85rem 1rem',
    fontSize: '0.86rem',
    lineHeight: 1.5,
    marginBottom: '1rem',
    display: 'flex',
    gap: '0.6rem',
    alignItems: 'flex-start' as const,
  },
  resendBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    background: 'transparent',
    border: 'none',
    color: 'inherit',
    fontWeight: 600,
    fontSize: '0.84rem',
    cursor: 'pointer',
    textDecoration: 'underline' as const,
    textUnderlineOffset: 3,
    opacity: 0.9,
    padding: 0,
  },
  loginBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '0.82rem 1.5rem',
    background: 'var(--grad)',
    color: '#fff',
    fontWeight: 700,
    fontSize: '0.95rem',
    borderRadius: 14,
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 10px 30px -10px rgba(0,163,255,.55)',
    transition: 'transform .2s var(--ease), box-shadow .2s',
    marginTop: '0.4rem',
  },
  divider: {
    height: 1,
    background: 'var(--line)',
    margin: '1.5rem 0',
    border: 'none',
  },
  footer: {
    textAlign: 'center' as const,
    fontSize: '0.9rem',
    color: 'var(--text-2)',
  },
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  function friendlyError(msg: string): string {
    const lower = msg.toLowerCase()
    if (lower.includes('email not confirmed')) {
      return 'Your email hasn\'t been verified yet. Check your inbox for the verification link.'
    }
    if (lower.includes('invalid login credentials')) {
      return 'Incorrect email or password. Please try again.'
    }
    if (lower.includes('user not found')) {
      return 'No account found with this email. Please sign up first.'
    }
    if (lower.includes('too many requests') || lower.includes('rate limit')) {
      return 'Too many attempts. Please wait a moment and try again.'
    }
    return msg
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setEmailNotConfirmed(false)
    setResendMessage(null)
    setLoading(true)

    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        
        if (data.maintenance) {
          if (!ADMIN_EMAILS.includes(email.trim().toLowerCase())) {
            setError("Site is currently under maintenance. Only administrators can log in right now.");
            setLoading(false);
            return;
          }
        }
      }
    } catch(e) {
      // ignore fetch error
    }

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      const isNotConfirmed = error.message.toLowerCase().includes('email not confirmed')
      setEmailNotConfirmed(isNotConfirmed)
      setError(friendlyError(error.message))
      setLoading(false)
      return
    }

    // Admin status is authoritative on the server (proxy + role check). This
    // cookie only affects the maintenance banner, so it's safe to derive here.
    if (ADMIN_EMAILS.includes(email.trim().toLowerCase())) {
      document.cookie = "isAdmin=true; path=/; max-age=86400";
      router.push('/admin')
    } else {
      document.cookie = "isAdmin=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      router.push('/dashboard')
    }
  }

  async function handleResend() {
    if (!email) return
    setResendLoading(true)
    setResendMessage(null)

    try {
      const res = await fetch('/api/auth/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const result = await res.json()

      if (!res.ok) {
        setResendMessage(result.error || 'Failed to resend verification email.')
      } else {
        setResendMessage('Verification email sent! Please check your inbox.')
      }
    } catch {
      setResendMessage('Something went wrong. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }

  const inputStyle = (field: string) => ({
    ...styles.input,
    borderColor: focusedField === field ? 'var(--blue)' : 'var(--line)',
    boxShadow: focusedField === field ? '0 0 0 3px rgba(139,92,246,.12)' : 'none',
  })

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        {/* Decorative glow */}
        <div style={styles.cardGlow} />

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: '2rem', position: 'relative' }}>
          <Link href="/" className="logo" style={{ display: 'inline-flex', justifyContent: 'center' }}>
            <span className="logo-wordmark">Interview<span className="logo-ace">Ace</span></span>
            <span className="logo-badge">AI</span>
          </Link>
          <h2 style={{ marginTop: '1rem', fontSize: '1.45rem', fontWeight: 700 }}>Welcome back</h2>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginTop: 4 }}>
            Sign in to continue to your dashboard
          </p>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleLogin}>
          {/* Email */}
          <div style={styles.inputGroup}>
            <label htmlFor="email" style={styles.label}>Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              required
              style={inputStyle('email')}
            />
          </div>

          {/* Password */}
          <div style={styles.inputGroup}>
            <label htmlFor="password" style={styles.label}>Password</label>
            <div style={styles.inputWrap}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                required
                style={{ ...inputStyle('password'), paddingRight: 44 }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* ── Alert: Error or Warning ── */}
          {error && (
            <div style={{
              ...styles.alertBox,
              background: emailNotConfirmed ? 'var(--warning-bg)' : 'var(--error-bg)',
              border: `1px solid ${emailNotConfirmed ? 'var(--warning-border)' : 'var(--error-border)'}`,
              color: emailNotConfirmed ? 'var(--warning-text)' : 'var(--error-text)',
            }}>
              <AlertCircle size={17} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <span>{error}</span>
                {emailNotConfirmed && (
                  <>
                    <br />
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendLoading}
                      style={{ ...styles.resendBtn, color: 'inherit' }}
                    >
                      <Mail size={14} />
                      {resendLoading ? 'Sending…' : 'Resend verification email'}
                    </button>
                    {resendMessage && (
                      <p style={{
                        fontSize: '0.82rem',
                        marginTop: 6,
                        color: resendMessage.includes('sent') ? 'var(--success-text)' : 'var(--error-text)',
                      }}>
                        {resendMessage}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Login Button ── */}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.loginBtn,
              opacity: loading ? 0.7 : 1,
              transform: loading ? 'none' : undefined,
            }}
            onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 16px 38px -10px rgba(0,163,255,.7)'; }}}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 10px 30px -10px rgba(0,163,255,.55)'; }}
          >
            <LogIn size={18} />
            {loading ? 'Signing in…' : 'Log in'}
          </button>
        </form>

        {/* ── Divider ── */}
        <hr style={styles.divider} />

        {/* ── Sign up link ── */}
        <p style={styles.footer}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" style={{ color: 'var(--blue)', fontWeight: 600 }}>
            Create one free
          </Link>
        </p>
      </div>
    </div>
  )
}


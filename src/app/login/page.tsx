'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'

import { createClient } from '@/lib/supabase'

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

    // Hardcoded Admin Bypass
    if (email.trim().toLowerCase() === 'admin@test.com' && password.trim() === 'password123') {
      document.cookie = "admin_bypass=true; path=/";
      setLoading(false);
      window.location.href = '/dashboard/admin';
      return;
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

    router.push('/dashboard')
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '140px', paddingBottom: '60px', paddingLeft: '1rem', paddingRight: '1rem' }}>
      <div className="widget" style={{ width: '100%', maxWidth: '440px', padding: 'clamp(1.4rem, 4vw, 2.4rem)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link href="/" className="logo" style={{ display: 'inline-flex', justifyContent: 'center' }}>
            <span className="logo-wordmark">Interview<span className="logo-ace">Ace</span></span>
            <span className="logo-badge">AI</span>
          </Link>
          <h2 style={{ marginTop: '1.2rem', fontSize: '1.5rem' }}>Welcome back</h2>
          <p style={{ color: 'var(--text-2)', fontSize: '.92rem', marginTop: '.3rem' }}>
            Log in to your account to continue
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: '100%', paddingRight: '40px' }}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 0 }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              background: emailNotConfirmed ? 'rgba(234,179,8,.12)' : 'rgba(239,68,68,.12)',
              border: `1px solid ${emailNotConfirmed ? 'rgba(234,179,8,.3)' : 'rgba(239,68,68,.3)'}`,
              borderRadius: '10px',
              padding: '.75rem .95rem',
              fontSize: '.88rem',
              color: emailNotConfirmed ? '#EAB308' : '#EF4444',
              marginBottom: '1rem',
            }}>
              {error}
            </div>
          )}

          {emailNotConfirmed && (
            <div style={{ marginBottom: '1rem' }}>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                className="btn btn-ghost btn-sm"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {resendLoading ? 'Sending...' : 'Resend verification email'}
              </button>
              {resendMessage && (
                <p style={{
                  fontSize: '.85rem',
                  color: resendMessage.includes('sent') ? '#22C55E' : '#EF4444',
                  textAlign: 'center',
                  marginTop: '.5rem',
                }}>
                  {resendMessage}
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginBottom: '1.2rem' }}
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '.9rem', color: 'var(--text-2)' }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" style={{ color: 'var(--blue)', fontWeight: 600 }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

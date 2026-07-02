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

    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        
        if (data.maintenance) {
          const userEmail = email.toLowerCase();
          const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase();
          const isAdmin = (
            userEmail === adminEmail || 
            userEmail === 'admin@interviewace.ai' || 
            userEmail === 'ankit@interviewace.ai' ||
            userEmail === 'admin@test.com'
          );
          
          if (!isAdmin) {
            setError("Site is currently under maintenance. Only administrators can log in right now.");
            setLoading(false);
            return;
          }
        }
      }
    } catch(e) {
      // ignore fetch error
    }

    // Hardcoded Admin Bypass
    if (email.trim().toLowerCase() === 'admin@test.com' && password.trim() === 'password123') {
      document.cookie = "admin_bypass=true; path=/";
      document.cookie = "isAdmin=true; path=/; max-age=86400";
      setLoading(false);
      window.location.href = '/admin';
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

    const userEmail = email.toLowerCase()
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase()
    const isAdmin = (
      userEmail === adminEmail || 
      userEmail === 'admin@interviewace.ai' || 
      userEmail === 'ankit@interviewace.ai'
    )

    if (isAdmin) {
      document.cookie = "isAdmin=true; path=/; max-age=86400";
      router.push('/admin')
    } else {
      // Normal user logs in, ensure isAdmin cookie is removed just in case
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

  return (
    <div className="min-h-screen flex items-center justify-center pt-[80px] pb-[60px] px-4">
      <div className="widget w-full max-w-[440px] p-[1.4rem] lg:p-[2.4rem]">
        <div className="text-center mb-[2rem]">
          <Link href="/" className="logo inline-flex justify-center">
            <span className="logo-wordmark">Interview<span className="logo-ace">Ace</span></span>
            <span className="logo-badge">AI</span>
          </Link>
          <h2 className="mt-[1.2rem] text-[1.5rem]">Welcome back</h2>
          <p className="text-[var(--text-2)] text-[0.92rem] mt-[0.3rem]">
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
                className="w-full pr-[40px]"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-[12px] top-1/2 -translate-y-1/2 bg-transparent border-none text-[var(--text-3)] cursor-pointer p-0"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              background: emailNotConfirmed ? 'var(--warning-bg)' : 'var(--error-bg)',
              border: `1px solid ${emailNotConfirmed ? 'var(--warning-border)' : 'var(--error-border)'}`,
              color: emailNotConfirmed ? 'var(--warning-text)' : 'var(--error-text)',
            }} className="rounded-[10px] px-[0.95rem] py-[0.75rem] text-[0.88rem] mb-[1rem]">
              {error}
            </div>
          )}

          {emailNotConfirmed && (
            <div className="mb-[1rem]">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                className="btn btn-ghost btn-sm w-full justify-center"
              >
                {resendLoading ? 'Sending...' : 'Resend verification email'}
              </button>
              {resendMessage && (
                <p style={{
                  color: resendMessage.includes('sent') ? '#22C55E' : '#EF4444',
                }} className="text-[0.85rem] text-center mt-[0.5rem]">
                  {resendMessage}
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary w-full justify-center mb-[1.2rem]"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p className="text-center text-[0.9rem] text-[var(--text-2)]">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-[var(--blue)] font-semibold">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

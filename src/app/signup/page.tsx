'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { User, Briefcase, GraduationCap, Check, ChevronLeft, ChevronRight, Settings, Eye, EyeOff } from 'lucide-react'

import { createClient } from '@/lib/supabase'

const STEPS = [
  { id: 1, title: 'Account Details', icon: User },
  { id: 2, title: 'Professional Status', icon: Briefcase },
  { id: 3, title: 'Additional Details', icon: Settings },
]

export default function SignupPage() {
  const router = useRouter()
  
  const [currentStep, setCurrentStep] = useState(1)
  
  // Step 1
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  // Step 2
  const [userType, setUserType] = useState<'student' | 'professional' | ''>('')
  
  // Step 3 - Student
  const [college, setCollege] = useState('')
  const [course, setCourse] = useState('')
  const [gradYear, setGradYear] = useState('')
  
  // Step 3 - Professional
  const [company, setCompany] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [experience, setExperience] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  const handleNext = () => {
    setError(null)
    if (currentStep === 1) {
      if (!name || !email || !phone || !password) {
        setError('Please fill in all account details.')
        return
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.')
        return
      }
    }
    if (currentStep === 2) {
      if (!userType) {
        setError('Please select your professional status.')
        return
      }
    }
    setCurrentStep(c => c + 1)
  }

  const handleBack = () => {
    setError(null)
    setCurrentStep(c => c - 1)
  }

  async function handleSubmit() {
    setError(null)
    setConfirmationEmail(null)
    
    // Validate Step 3
    if (userType === 'student' && (!college || !course || !gradYear)) {
      setError('Please fill in all student details.')
      return
    }
    if (userType === 'professional' && (!company || !jobTitle || !experience)) {
      setError('Please fill in all professional details.')
      return
    }

    setLoading(true)

    const metadata = {
      full_name: name,
      phone,
      user_type: userType,
      college: userType === 'student' ? college : undefined,
      course: userType === 'student' ? course : undefined,
      graduation_year: userType === 'student' ? gradYear : undefined,
      company_name: userType === 'professional' ? company : undefined,
      job_title: userType === 'professional' ? jobTitle : undefined,
      experience_years: userType === 'professional' ? experience : undefined,
    }

    // Prefer our OWN branded verification email (no Supabase branding). Falls
    // back automatically to the standard Supabase flow if it isn't configured.
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, metadata }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setConfirmationEmail(email)
        setLoading(false)
        return
      }
      if (res.status === 409) {
        setError(data.error || 'An account with this email already exists.')
        setLoading(false)
        return
      }
      // else: data.fallback === true → continue to the default flow below.
    } catch {
      // network issue → fall back to the default flow below.
    }

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Land the verification link on our success page (works on any host).
        emailRedirectTo: `${window.location.origin}/auth/verified`,
        data: metadata,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.session) {
      router.push('/dashboard')
      return
    }

    setConfirmationEmail(email)
    setLoading(false)
  }

  async function handleResend() {
    if (!confirmationEmail) return
    setResendLoading(true)
    setResendMessage(null)

    try {
      const res = await fetch('/api/auth/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: confirmationEmail }),
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

  // Calculate Progress
  const progressPercent = Math.round(((currentStep - 1) / (STEPS.length - 1)) * 100) || 10;

  if (confirmationEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center p-[2rem]">
        <div className="widget w-full max-w-[440px] p-[1.4rem] lg:p-[2.4rem]">
          <div className="text-center mb-[2rem]">
            <Link href="/" className="logo inline-flex justify-center">
              <span className="logo-wordmark">Interview<span className="logo-ace">Ace</span></span>
              <span className="logo-badge">AI</span>
            </Link>
          </div>
          <div className="text-center">
            <div style={{
              background: 'var(--success-bg)',
              border: '1px solid var(--success-border)',
              color: 'var(--success-text)',
            }} className="rounded-xl p-5 text-[0.95rem] mb-6 shadow-sm">
              <p className="font-semibold mb-2 text-base">Verification email sent!</p>
              <p className="opacity-90">We&apos;ve sent a verification link to <strong className="font-semibold">{confirmationEmail}</strong>. Please check your inbox (and spam folder) to confirm your account.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                onClick={handleResend} 
                disabled={resendLoading} 
                className="btn w-full justify-center"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line-2)',
                  color: 'var(--text)',
                  marginBottom: '14px'
                }}
              >
                {resendLoading ? 'Sending...' : 'Resend verification email'}
              </button>
              
              {resendMessage && (
                <p style={{ color: resendMessage.includes('sent') ? 'var(--success-text)' : 'var(--error-text)' }} className="text-sm text-center">
                  {resendMessage}
                </p>
              )}
              
              <Link href="/login" className="btn btn-primary w-full justify-center inline-flex">
                Already verified? Log in
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .signup-page-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 80px 1rem 1rem 1rem;
          background: linear-gradient(135deg, rgba(147, 51, 234, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%);
        }
        .signup-card {
          display: flex;
          width: 100%;
          max-width: 900px;
          background: var(--surface-solid);
          border-radius: 24px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          border: 1px solid var(--line);
        }
        .signup-sidebar {
          flex: 0 0 260px;
          background: var(--bg-2);
          padding: 2rem 1.5rem;
          border-right: 1px solid var(--line);
        }
        .signup-main {
          flex: 1;
          padding: 2rem 2rem;
          display: flex;
          flex-direction: column;
        }
        
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        
        /* Stepper Logic */
        .step-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
          position: relative;
        }
        .step-item:not(:last-child)::after {
          content: '';
          position: absolute;
          left: 17px; 
          top: 45px;
          bottom: -25px;
          width: 2px;
          background: var(--line);
          z-index: 0;
        }
        .step-item.active:not(:last-child)::after, 
        .step-item.completed:not(:last-child)::after {
          background: var(--blue);
        }
        .step-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--surface-solid);
          border: 2px solid var(--line);
          color: var(--text-3);
          z-index: 1;
          transition: all 0.3s ease;
        }
        .step-item.active .step-icon {
          background: var(--blue);
          border-color: var(--blue);
          color: #fff;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
        }
        .step-item.completed .step-icon {
          background: var(--blue);
          border-color: var(--blue);
          color: #fff;
        }
        .step-text {
          font-weight: 500;
          color: var(--text-3);
          transition: color 0.3s ease;
        }
        .step-item.active .step-text, .step-item.completed .step-text {
          color: var(--text);
        }

        /* Type Card */
        .type-card {
          border: 2px solid var(--line);
          border-radius: 16px;
          padding: 1.5rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          background: var(--surface-solid);
        }
        .type-card:hover {
          border-color: var(--blue);
          transform: translateY(-2px);
        }
        .type-card.selected {
          border-color: var(--blue);
          background: rgba(59, 130, 246, 0.05);
        }
        
        /* Status Grid */
        .status-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        @media (max-width: 1024px) {
          .signup-page-container { padding: 100px 1rem 1rem 1rem; }
          .signup-card { flex-direction: column; }
          .signup-sidebar { flex: none; width: 100%; padding: 1.5rem; border-right: none; border-bottom: 1px solid var(--line); }
          .stepper-container { display: flex; justify-content: space-around; }
          .step-item:not(:last-child)::after { display: none; }
          .step-item { margin-bottom: 0; flex-direction: column; gap: 0.5rem; text-align: center; }
          .step-text { font-size: 0.85rem; }
          .signup-main { padding: 2rem; }
        }
        
        @media (max-width: 680px) {
          .signup-page-container { padding: 80px 1rem 1rem 1rem; }
          .signup-main { padding: 1.5rem 1rem; }
          .form-grid { grid-template-columns: 1fr; gap: 1rem; }
          .status-grid { grid-template-columns: 1fr; }
          .step-text { display: none; }
          .signup-main-header { flex-direction: column; gap: 0.5rem; }
          .btn-nav-container { flex-direction: column; gap: 1rem; }
          .btn-nav-container .btn { width: 100%; }
        }
      `}} />

      <div className="signup-page-container">
        <div className="signup-card">
          
          {/* Sidebar */}
          <div className="signup-sidebar">
            <Link href="/" className="logo" style={{ display: 'inline-flex', marginBottom: '2rem' }}>
              <span className="logo-wordmark">Interview<span className="logo-ace">Ace</span></span>
              <span className="logo-badge">AI</span>
            </Link>

            <div className="stepper-container">
              {STEPS.map((step) => {
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;
                const Icon = step.icon;
                return (
                  <div key={step.id} className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                    <div className="step-icon">
                      {isCompleted ? <Check size={18} /> : <Icon size={18} />}
                    </div>
                    <div className="step-text">{step.title}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="signup-main">
            {/* Header Area */}
            <div className="signup-main-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.8rem', marginBottom: '.5rem' }}>Welcome to InterviewAce</h2>
                <p style={{ color: 'var(--text-2)' }}>Complete the {STEPS.length} steps to get started</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', color: 'var(--text-2)', fontSize: '.9rem' }}>
                <Link href="/login" style={{ color: 'var(--blue)' }}>Already have an account?</Link>
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1, height: '6px', background: 'var(--bg-2)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--blue)', transition: 'width 0.3s ease' }} />
              </div>
              <span style={{ fontSize: '.85rem', color: 'var(--text-2)', fontWeight: 600 }}>{progressPercent}%</span>
            </div>

            {/* Form Container */}
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>{STEPS[currentStep-1].title}</h3>

              {error && (
                <div style={{
                  background: 'var(--error-bg)',
                  border: '1px solid var(--error-border)',
                  color: 'var(--error-text)',
                }} className="rounded-[10px] padding-[.75rem] text-[.88rem] mb-[1rem]">
                  {error}
                </div>
              )}

              {/* Step 1: Account Details */}
              {currentStep === 1 && (
                <div className="form-grid">
                  <div className="field">
                    <label>Full Name</label>
                    <input type="text" className="input" placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Email Address</label>
                    <input type="email" className="input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Phone Number</label>
                    <input type="tel" className="input" placeholder="+1 (555) 000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Password</label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type={showPassword ? 'text' : 'password'} 
                        className="input" 
                        placeholder="At least 6 characters" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        style={{ paddingRight: '40px' }}
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
                </div>
              )}

              {/* Step 2: Professional Status */}
              {currentStep === 2 && (
                <div className="status-grid">
                  <div className={`type-card ${userType === 'student' ? 'selected' : ''}`} onClick={() => setUserType('student')}>
                    <GraduationCap size={48} style={{ margin: '0 auto 1rem auto', color: userType === 'student' ? 'var(--blue)' : 'var(--text-3)' }} />
                    <h4 style={{ fontSize: '1.1rem', marginBottom: '.5rem' }}>Student</h4>
                    <p style={{ color: 'var(--text-2)', fontSize: '.9rem' }}>I am currently pursuing my degree and looking for internships or fresh grad roles.</p>
                  </div>
                  <div className={`type-card ${userType === 'professional' ? 'selected' : ''}`} onClick={() => setUserType('professional')}>
                    <Briefcase size={48} style={{ margin: '0 auto 1rem auto', color: userType === 'professional' ? 'var(--blue)' : 'var(--text-3)' }} />
                    <h4 style={{ fontSize: '1.1rem', marginBottom: '.5rem' }}>Working Professional</h4>
                    <p style={{ color: 'var(--text-2)', fontSize: '.9rem' }}>I am actively working and looking to level up or transition in my career.</p>
                  </div>
                </div>
              )}

              {/* Step 3: Additional Details */}
              {currentStep === 3 && userType === 'student' && (
                <div className="form-grid">
                  <div className="field" style={{ gridColumn: '1 / -1' }}>
                    <label>College / University Name</label>
                    <input type="text" className="input" placeholder="e.g. Stanford University" value={college} onChange={(e) => setCollege(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Course / Program</label>
                    <input type="text" className="input" placeholder="e.g. B.S. Computer Science" value={course} onChange={(e) => setCourse(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Expected Graduation Year</label>
                    <input type="text" className="input" placeholder="e.g. 2025" value={gradYear} onChange={(e) => setGradYear(e.target.value)} />
                  </div>
                </div>
              )}

              {currentStep === 3 && userType === 'professional' && (
                <div className="form-grid">
                  <div className="field" style={{ gridColumn: '1 / -1' }}>
                    <label>Current/Latest Company Name</label>
                    <input type="text" className="input" placeholder="e.g. Google" value={company} onChange={(e) => setCompany(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Job Title</label>
                    <input type="text" className="input" placeholder="e.g. Senior Software Engineer" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Years of Experience</label>
                    <input type="number" className="input" placeholder="e.g. 5" value={experience} onChange={(e) => setExperience(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="btn-nav-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--line)' }}>
              <button 
                className="btn btn-ghost" 
                onClick={handleBack} 
                disabled={currentStep === 1 || loading}
                style={{ borderRadius: '50%', width: 44, height: 44, padding: 0, justifyContent: 'center', opacity: currentStep === 1 ? 0 : 1, pointerEvents: currentStep === 1 ? 'none' : 'auto' }}
              >
                <ChevronLeft size={20} />
              </button>
              
              {currentStep < STEPS.length ? (
                <button className="btn btn-primary" onClick={handleNext} style={{ minWidth: 150, justifyContent: 'center', borderRadius: '30px', padding: '.8rem 2rem' }}>
                  Next Step
                </button>
              ) : (
                <button className="btn btn-primary" onClick={handleSubmit} disabled={loading} style={{ minWidth: 150, justifyContent: 'center', borderRadius: '30px', padding: '.8rem 2rem' }}>
                  {loading ? 'Creating...' : 'Submit'}
                </button>
              )}

              <button 
                className="btn btn-ghost hidden md:flex" 
                disabled={true}
                style={{ borderRadius: '50%', width: 44, height: 44, padding: 0, justifyContent: 'center', opacity: 0, pointerEvents: 'none' }}
              >
                <ChevronRight size={20} />
              </button>
            </div>

          </div>

        </div>
      </div>
    </>
  )
}

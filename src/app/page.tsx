'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';
import {
  Zap,
  Mic,
  FileText,
  Check,
  Star,
  ChevronLeft,
  ChevronRight,
  Plus,
  MessageSquare,
  BookOpen,
  Phone,
  Mail,
  Target,
  TrendingUp,
  Bot,
  Clock,
  GraduationCap,
  BarChart3,
  Send,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const TYPING_STRINGS = [
  'I applied a structured approach using the STAR method to keep my answer concise and relevant...',
  'For the system design question, I broke the problem into components: load balancer, cache layer, database sharding...',
];

const METRICS = [
  { value: 10000, suffix: '+', label: 'Interviews conducted' },
  { value: 5000, suffix: '+', label: 'Students trained' },
  { value: 95, suffix: '%', label: 'User satisfaction' },
  { value: 500, suffix: '+', label: 'Career coaches' },
];

const FEATURES = [
  {
    icon: Mic,
    title: 'AI Mock Interviews',
    desc: 'Face a lifelike AI interviewer that adapts questions to your role, resume and experience level — just like the real thing.',
    list: [
      'HR, technical, behavioral & managerial rounds',
      'Live HeyGen avatar with natural voice',
      'Real-time transcript & follow-up questions',
      'Strike-based discipline system for realism',
    ],
  },
  {
    icon: FileText,
    title: 'AI Resume Analyzer',
    desc: 'Upload your resume and see exactly how applicant tracking systems score it — then fix it section by section.',
    list: [
      'Instant ATS score for PDF, DOC & DOCX',
      'Missing keyword detection per job role',
      'Section-by-section improvement suggestions',
      'Built-in editable resume builder',
    ],
  },
  {
    icon: GraduationCap,
    title: 'Expert Coaching',
    desc: 'Book 1-on-1 video sessions with verified coaches — from communication trainers to senior HR professionals.',
    list: [
      '500+ verified coaches across 6 categories',
      'Transparent ratings, experience & pricing',
      'Instant booking with calendar sync',
      'Session notes & personalised action plans',
    ],
  },
  {
    icon: BarChart3,
    title: 'Performance Analytics',
    desc: 'Watch your confidence, clarity and scores climb across every interview with rich progress dashboards.',
    list: [
      '10-metric scoring on every interview',
      'Confidence & communication growth charts',
      'Skill-gap trends with recommended actions',
      'Downloadable PDF performance reports',
    ],
  },
];

const STEPS = [
  { num: 1, title: 'Sign up & create profile', desc: 'Tell us your target role, experience level and dream companies in under two minutes.' },
  { num: 2, title: 'Upload your resume', desc: 'Get an instant ATS score and a prioritized fix list before you ever face a question.' },
  { num: 3, title: 'Take an AI mock interview', desc: 'Answer adaptive questions from a live avatar interviewer in a realistic interview room.' },
  { num: 4, title: 'Receive detailed feedback', desc: 'A 10-metric scorecard, transcript review and a clear plan for what to improve next.' },
];

const PLANS_MONTHLY = [
  {
    name: 'Free',
    price: '₹0',
    period: '/forever',
    desc: 'Try the platform, zero risk',
    features: ['1 AI mock interview', 'Basic ATS resume analysis', 'Overall score & summary feedback', 'Community support'],
    cta: 'Start free',
    popular: false,
  },
  {
    name: 'Pro',
    price: '₹499',
    period: '/month',
    desc: 'For active job seekers',
    features: ['Unlimited AI mock interviews', 'Advanced 10-metric feedback', 'Interview recording & playback', 'Full resume builder & keyword fixes', 'Progress analytics dashboard'],
    cta: 'Upgrade to Pro',
    popular: true,
  },
  {
    name: 'Premium',
    price: '₹999',
    period: '/month',
    desc: 'For serious career growth',
    features: ['Everything in Pro', '2 expert coaching sessions / month', 'Priority support', 'Personalised career roadmap', 'Mock panel & group discussion rounds'],
    cta: 'Go Premium',
    popular: false,
  },
];

const PLANS_YEARLY = [
  {
    name: 'Free',
    price: '₹0',
    period: '/forever',
    desc: 'Try the platform, zero risk',
    features: ['1 AI mock interview', 'Basic ATS resume analysis', 'Overall score & summary feedback', 'Community support'],
    cta: 'Start free',
    popular: false,
  },
  {
    name: 'Pro',
    price: '₹399',
    period: '/month',
    desc: 'For active job seekers',
    features: ['Unlimited AI mock interviews', 'Advanced 10-metric feedback', 'Interview recording & playback', 'Full resume builder & keyword fixes', 'Progress analytics dashboard'],
    cta: 'Upgrade to Pro',
    popular: true,
  },
  {
    name: 'Premium',
    price: '₹799',
    period: '/month',
    desc: 'For serious career growth',
    features: ['Everything in Pro', '2 expert coaching sessions / month', 'Priority support', 'Personalised career roadmap', 'Mock panel & group discussion rounds'],
    cta: 'Go Premium',
    popular: false,
  },
];

const TESTIMONIALS = [
  {
    stars: 5,
    quote: 'I bombed my first three campus interviews. After 12 mock rounds on InterviewAce, I cracked a placement at a Big-4 firm. The strike system trained me to stop rambling.',
    name: 'Priya Sharma',
    role: 'MBA Graduate \u00b7 Placed at Deloitte',
    initials: 'PS',
  },
  {
    stars: 5,
    quote: 'My resume was getting auto-rejected everywhere. The ATS analyzer found 14 missing keywords for data analyst roles. Score went from 52 to 89 — interviews started coming in within two weeks.',
    name: 'Rahul Verma',
    role: 'B.Tech Fresher \u00b7 Data Analyst at Zomato',
    initials: 'RV',
  },
  {
    stars: 4,
    quote: 'The communication coach I booked spotted habits I never knew I had — filler words, weak eye contact. Three sessions later my confidence score jumped 28 points.',
    name: 'Ananya Kapoor',
    role: 'Final-year Student \u00b7 DU',
    initials: 'AK',
  },
  {
    stars: 5,
    quote: 'As a tier-2 city student, I had no one to practice English interviews with. The AI interviewer never judges, never gets tired, and the feedback is brutally specific. Game changer.',
    name: 'Mohit Jain',
    role: 'BCA Graduate \u00b7 SDE at Paytm',
    initials: 'MJ',
  },
  {
    stars: 5,
    quote: 'The system design mock interviews are incredibly realistic. The AI pushed me to justify my database choices and load-balancing strategies. It helped me clear my L4 interview at Google!',
    name: 'Karan Desai',
    role: 'Senior Software Engineer \u00b7 Google',
    initials: 'KD',
  },
  {
    stars: 4,
    quote: 'I used to freeze during HR rounds when asked tricky behavioral questions. The structured feedback on my STAR method answers completely transformed my approach.',
    name: 'Neha Gupta',
    role: 'Marketing Manager \u00b7 Flipkart',
    initials: 'NG',
  },
  {
    stars: 5,
    quote: 'The Resume Analyzer is pure magic. It highlighted formatting issues that were breaking ATS parsers. Once fixed, my callback rate went from literally 0% to almost 40%.',
    name: 'Arjun Reddy',
    role: 'Product Designer \u00b7 CRED',
    initials: 'AR',
  },
  {
    stars: 5,
    quote: 'I booked a 1-on-1 coaching session before my final round at Microsoft. My coach was an ex-MSFT director who gave me exactly the mock experience I needed to succeed.',
    name: 'Sneha Patel',
    role: 'Program Manager \u00b7 Microsoft',
    initials: 'SP',
  },
  {
    stars: 5,
    quote: 'Being from a non-CS background, I struggled with explaining my projects confidently. The AI avatar\'s real-time strike system stopped me from using too much jargon and rambling.',
    name: 'Vikram Singh',
    role: 'Data Scientist \u00b7 Fractal',
    initials: 'VS',
  },
  {
    stars: 4,
    quote: 'The dashboard analytics are addictive. Seeing my confidence score rise from 45% to 88% over two weeks gave me the push I needed before my campus placements began.',
    name: 'Riya Mehta',
    role: 'B.Tech Student \u00b7 VIT',
    initials: 'RM',
  }
];

const FAQS = [
  {
    q: 'How realistic are the AI interviews?',
    a: 'Very. The AI interviewer uses a live avatar, speaks naturally, asks adaptive follow-ups based on your answers, and enforces real interview discipline through a strike system for interruptions, going off-topic or long silences. Most students say it feels harder than their actual interviews.',
  },
  {
    q: 'How is the ATS score calculated?',
    a: 'We parse your resume the same way applicant tracking systems do — checking formatting compatibility, keyword match against your target role, section structure, quantified achievements and readability. You get a 0\u2013100 score with a breakdown of exactly which factors cost you points.',
  },
  {
    q: 'Can I edit my resume inside the platform?',
    a: 'Yes. The resume builder lets you edit every section — summary, experience, skills, projects, education — with AI suggestions inline. Re-score instantly after each change and export a clean, ATS-safe PDF.',
  },
  {
    q: 'How do coaching sessions work?',
    a: 'Browse coaches by category, rating and price, then book a slot that fits your schedule. Sessions happen over video inside the platform. Afterwards your coach shares written feedback and an action plan that appears in your dashboard.',
  },
  {
    q: 'Is my data private?',
    a: 'Your resumes, recordings and transcripts are encrypted and visible only to you (and a coach, only if you book one). We never sell data or share it with employers without your explicit consent.',
  },
  {
    q: 'How long are interview recordings stored?',
    a: 'Recordings are stored for 90 days on Free and Pro plans, and 12 months on Premium. You can download or permanently delete any recording at any time from Settings \u2192 Privacy.',
  },
];

/* ------------------------------------------------------------------ */
/*  Counter hook                                                       */
/* ------------------------------------------------------------------ */

function useCountUp(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            setCount(Math.floor(progress * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
}

/* ------------------------------------------------------------------ */
/*  Metric Card                                                        */
/* ------------------------------------------------------------------ */

function MetricCard({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const { count, ref } = useCountUp(value);
  return (
    <div className="metric" ref={ref}>
      <div className="num">
        {count.toLocaleString()}
        {suffix}
      </div>
      <div className="lbl">{label}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function Home() {
  /* ---- state ---- */
  const [yearly, setYearly] = useState(false);
  const [tIdx, setTIdx] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [typedText, setTypedText] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  /* ---- reveal on scroll ---- */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('in');
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  /* ---- hero typing effect ---- */
  useEffect(() => {
    let strIdx = 0;
    let charIdx = 0;
    let deleting = false;
    let timeout: ReturnType<typeof setTimeout>;

    const tick = () => {
      const current = TYPING_STRINGS[strIdx];
      if (!deleting) {
        charIdx++;
        setTypedText(current.slice(0, charIdx));
        if (charIdx === current.length) {
          deleting = true;
          timeout = setTimeout(tick, 2000);
          return;
        }
        timeout = setTimeout(tick, 32);
      } else {
        charIdx--;
        setTypedText(current.slice(0, charIdx));
        if (charIdx === 0) {
          deleting = false;
          strIdx = (strIdx + 1) % TYPING_STRINGS.length;
          timeout = setTimeout(tick, 400);
          return;
        }
        timeout = setTimeout(tick, 18);
      }
    };
    timeout = setTimeout(tick, 800);
    return () => clearTimeout(timeout);
  }, []);

  /* ---- testimonial auto-advance ---- */
  const advanceTestimonial = useCallback(() => {
    setTIdx((i) => (i + 1) % TESTIMONIALS.length);
  }, []);

  useEffect(() => {
    const iv = setInterval(advanceTestimonial, 7000);
    return () => clearInterval(iv);
  }, [advanceTestimonial]);

  /* ---- helpers ---- */
  const plans = yearly ? PLANS_YEARLY : PLANS_MONTHLY;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  const handleContactSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    showToast('Message sent! We\'ll get back to you within 24 hours.');
    (e.target as HTMLFormElement).reset();
  };

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <>
      {/* ==================== HERO ==================== */}
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            {/* Left */}
            <div>
              <span className="chip">
                <Zap size={14} /> AI-powered career platform
              </span>
              <h1>
                Ace every interview <span className="grad-text">with AI</span>
              </h1>
              <p className="sub">
                Practice with a realistic AI interviewer, get your resume past ATS filters, and book 1-on-1 sessions with expert coaches — everything you need to walk into your next interview with total confidence.
              </p>
              <div className="hero-ctas">
                <Link href="/dashboard/interview" className="btn btn-primary">
                  <Mic size={18} /> Start free mock interview
                </Link>
                <Link href="/dashboard/ats" className="btn btn-ghost">
                  <FileText size={18} /> Analyze my resume
                </Link>
              </div>
              <div className="hero-note">
                <span>
                  <Check size={15} /> No credit card required
                </span>
                <span>
                  <Check size={15} /> Feedback in under 2 minutes
                </span>
                <span>
                  <Check size={15} /> Built for students &amp; freshers
                </span>
              </div>
            </div>

            {/* Right -- side-by-side video call mockup */}
            <div className="hero-video-call">
              {/* Decorative backdrop elements */}
              <div className="hero-dashed-circle" />
              <div className="hero-dots-grid" />

              {/* Video call container */}
              <div className="vc-container">
                {/* Header bar */}
                <div className="vc-header">
                  <div className="vc-header-left">
                    <span className="vc-live-dot" />
                    <span>Live Interview Session</span>
                  </div>
                  <div className="vc-header-right">
                    <span className="vc-timer-badge">⏱ 12:34</span>
                  </div>
                </div>

                {/* Two video panels side by side */}
                <div className="vc-panels">
                  {/* AI Interviewer Panel */}
                  <div className="vc-panel interviewer-panel">
                    <div className="vc-video-wrapper">
                      <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=800" alt="AI Interviewer" />
                      <div className="vc-speaking-ring" />
                    </div>
                    <div className="vc-label">
                      <span className="vc-label-dot active" />
                      <span>Alex · AI Interviewer</span>
                    </div>
                  </div>

                  {/* Candidate Panel */}
                  <div className="vc-panel candidate-panel">
                    <div className="vc-video-wrapper">
                      <img src="/male_candidate.png" alt="Candidate" />
                    </div>
                    <div className="vc-label">
                      <span className="vc-label-dot" />
                      <span>You · Candidate</span>
                    </div>
                  </div>
                </div>

                {/* Bottom controls bar */}
                <div className="vc-controls">
                  <div className="vc-ctrl-btn"><Mic size={16} /></div>
                  <div className="vc-ctrl-btn"><Bot size={16} /></div>
                  <div className="vc-ctrl-btn end"><Phone size={16} /></div>
                </div>
              </div>

              {/* Float badges */}
              <div className="float-badge fb-1" style={{ zIndex: 12 }}>
                <Target size={16} style={{ color: '#22C55E' }} />
                Readiness score <b style={{ color: '#22C55E' }}>86%</b>
              </div>
              <div className="float-badge fb-2" style={{ zIndex: 12 }}>
                <TrendingUp size={16} style={{ color: '#2563EB' }} />
                ATS score improved <b style={{ color: '#22C55E' }}>+31 pts</b>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== TRUST METRICS ==================== */}
      <section>
        <div className="container">
          <div className="metrics reveal">
            {METRICS.map((m) => (
              <MetricCard key={m.label} value={m.value} suffix={m.suffix} label={m.label} />
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FEATURES ==================== */}
      <section id="features">
        <div className="container">
          <div className="sec-head reveal">
            <span className="chip">Platform modules</span>
            <h2>Everything between you and the offer letter</h2>
            <p>Four connected modules that take you from nervous first attempt to confident final round.</p>
          </div>
          <div className="feat-grid">
            {FEATURES.map((f) => (
              <div className="feat-card reveal" key={f.title}>
                <div className="feat-icon">
                  <f.icon size={24} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                <ul className="feat-list">
                  {f.list.map((item) => (
                    <li key={item}>
                      <Check size={16} style={{ flexShrink: 0, color: '#22C55E' }} /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS ==================== */}
      <section id="how" style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="container">
          <div className="sec-head reveal">
            <span className="chip">Getting started</span>
            <h2>From sign-up to job-ready in four steps</h2>
            <p>No setup, no scheduling, no awkward role-plays with friends. Just you and your AI interviewer.</p>
          </div>
          <div className="steps reveal">
            {STEPS.map((s, i) => (
              <div className="step" key={s.num}>
                <div className="step-num">{s.num}</div>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
                {i < STEPS.length - 1 && <div className="connector" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== PRICING ==================== */}
      <section id="pricing">
        <div className="container">
          <div className="sec-head reveal">
            <span className="chip">Pricing</span>
            <h2>Start free. Upgrade when you&rsquo;re ready.</h2>
            <p>Simple plans for every stage of the job hunt — cancel anytime.</p>
          </div>

          <div className="bill-toggle reveal">
            <span>Monthly</span>
            <button
              className={`switch${yearly ? ' on' : ''}`}
              onClick={() => setYearly(!yearly)}
              aria-label="Toggle billing period"
            />
            <span>Yearly</span>
            <span className="save-tag">Save 20%</span>
          </div>

          <div className="plans reveal">
            {plans.map((p) => (
              <div className={`plan${p.popular ? ' popular' : ''}`} key={p.name}>
                {p.popular && <div className="pop-badge">Most Popular</div>}
                <h3>{p.name}</h3>
                <div className="price">
                  {p.price} <small>{p.period}</small>
                </div>
                <div className="for">{p.desc}</div>
                <ul>
                  {p.features.map((feat) => (
                    <li key={feat}>
                      <Check size={16} style={{ flexShrink: 0, color: '#22C55E' }} /> {feat}
                    </li>
                  ))}
                </ul>
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== TESTIMONIALS ==================== */}
      <section id="testimonials" style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="container">
          <div className="sec-head reveal">
            <span className="chip">Success stories</span>
            <h2>Students who stopped fearing interviews</h2>
          </div>

          <div className="carousel reveal">
            <div className="t-track">
              <div 
                className="t-slides" 
                style={{ 
                  transform: `translateX(-${tIdx * 100}%)`,
                  transition: 'transform 1.2s cubic-bezier(0.22, 1, 0.36, 1)'
                }}
              >
                {TESTIMONIALS.map((t, idx) => (
                  <div 
                    className="t-card" 
                    key={t.name}
                    style={{
                      opacity: idx === tIdx ? 1 : 0.3,
                      transform: idx === tIdx ? 'scale(1)' : 'scale(0.95)',
                      transition: 'all 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
                      filter: idx === tIdx ? 'blur(0px)' : 'blur(4px)'
                    }}
                  >
                    <div className="stars">
                      {Array.from({ length: t.stars }).map((_, i) => (
                        <Star key={i} size={18} fill="#FBBF24" stroke="#FBBF24" style={{ display: 'inline' }} />
                      ))}
                      {Array.from({ length: 5 - t.stars }).map((_, i) => (
                        <Star key={`e${i}`} size={18} stroke="#FBBF24" style={{ display: 'inline', opacity: 0.3 }} />
                      ))}
                    </div>
                    <blockquote>&ldquo;{t.quote}&rdquo;</blockquote>
                    <div className="t-who">
                      <div className="t-ava">{t.initials}</div>
                      <div>
                        <b>{t.name}</b>
                        <span>{t.role}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button
              className="t-arrow t-prev"
              onClick={() => setTIdx((i) => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)}
              aria-label="Previous testimonial"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              className="t-arrow t-next"
              onClick={() => setTIdx((i) => (i + 1) % TESTIMONIALS.length)}
              aria-label="Next testimonial"
            >
              <ChevronRight size={20} />
            </button>
            <div className="t-nav">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  className={`t-dot${i === tIdx ? ' on' : ''}`}
                  onClick={() => setTIdx(i)}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FAQ ==================== */}
      <section id="faq">
        <div className="container">
          <div className="sec-head reveal">
            <span className="chip">FAQ</span>
            <h2>Questions, answered</h2>
          </div>
          <div className="faq reveal">
            {FAQS.map((item, i) => (
              <div className={`faq-item${openFaq === i ? ' open' : ''}`} key={i}>
                <button className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{item.q}</span>
                  <span className="pm"><Plus size={14} /></span>
                </button>
                <div className="faq-a" style={{ maxHeight: openFaq === i ? '300px' : '0' }}>
                  <p>{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== CONTACT ==================== */}
      <section id="contact" style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--line)' }}>
        <div className="container">
          <div className="sec-head reveal">
            <span className="chip">Contact</span>
            <h2>We&rsquo;re here to help</h2>
          </div>
          <div className="contact-grid reveal">
            {/* Left -- channels */}
            <div className="contact-card">
              <div className="c-channel">
                <div className="c-ico"><MessageSquare size={20} /></div>
                <div>
                  <b>Live chat</b>
                  <span>Average reply in under 3 minutes, 9 AM – 9 PM IST</span>
                </div>
              </div>
              <div className="c-channel">
                <div className="c-ico"><BookOpen size={20} /></div>
                <div>
                  <b>Support center</b>
                  <span>Guides, tutorials and troubleshooting for every module</span>
                </div>
              </div>
              <div className="c-channel">
                <div className="c-ico"><Phone size={20} /></div>
                <div>
                  <b>Career guidance helpline</b>
                  <span>Free 15-minute career direction calls for students</span>
                </div>
              </div>
              <div className="c-channel">
                <div className="c-ico"><Mail size={20} /></div>
                <div>
                  <b>Email</b>
                  <span>support@interviewace.ai · replies within 24 hours</span>
                </div>
              </div>
            </div>

            {/* Right -- form */}
            <div className="form-card">
              <form onSubmit={handleContactSubmit}>
                <div className="form-row">
                  <div className="field">
                    <label>Name</label>
                    <input type="text" placeholder="Your full name" required />
                  </div>
                  <div className="field">
                    <label>Email</label>
                    <input type="email" placeholder="you@email.com" required />
                  </div>
                </div>
                <div className="field">
                  <label>Phone</label>
                  <input type="tel" placeholder="+91 98XXX XXXXX" />
                </div>
                <div className="field">
                  <label>Message</label>
                  <textarea rows={4} placeholder="How can we help you?" required />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  <Send size={16} /> Send message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== TOAST ==================== */}
      <div className={`toast${toastVisible ? ' show' : ''}`}>
        <Check size={18} style={{ color: '#22C55E' }} /> {toastMsg}
      </div>

      <Footer />
    </>
  );
}

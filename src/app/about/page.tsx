import Link from 'next/link';
import {
  Target,
  Users,
  Shield,
  Heart,
  Zap,
  Mic,
  FileText,
  GraduationCap,
  BarChart3,
  ArrowRight,
  BookOpen,
  Eye,
} from 'lucide-react';
import Footer from '@/components/Footer';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const TEAM = [
  {
    name: 'Arjun Mehta',
    initials: 'AM',
    role: 'Co-founder & CEO',
    background: 'Ex-Google, IIT Delhi',
    bio: 'Spent 8 years building hiring tools at Google before realising the real problem was on the candidate side. Left to build what he wished existed during his own campus placements.',
    gradient: 'linear-gradient(135deg, #2563EB, #06B6D4)',
  },
  {
    name: 'Sneha Iyer',
    initials: 'SI',
    role: 'Co-founder & CPO',
    background: 'IIM Bangalore, Ex-McKinsey',
    bio: 'Coached 200+ MBA students through case interviews. Saw the same fixable mistakes repeated across batches and knew AI could scale honest feedback to millions.',
    gradient: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
  },
  {
    name: 'Vikram Desai',
    initials: 'VD',
    role: 'CTO',
    background: 'Ex-Amazon, IIT Bombay',
    bio: 'Led speech and NLP teams at Amazon Alexa. Now applies those skills to build an AI interviewer that listens, adapts, and gives feedback better than most humans do.',
    gradient: 'linear-gradient(135deg, #F59E0B, #EF4444)',
  },
  {
    name: 'Priyanka Rao',
    initials: 'PR',
    role: 'Head of Coaching',
    background: 'Former HR Head at Infosys',
    bio: 'Hired over 3,000 freshers at Infosys across 6 years. Now she trains our coach network and designs the feedback rubrics that power every scorecard.',
    gradient: 'linear-gradient(135deg, #22C55E, #06B6D4)',
  },
  {
    name: 'Rohan Kulkarni',
    initials: 'RK',
    role: 'Head of AI',
    background: 'Ex-Microsoft Research, IIIT Hyderabad',
    bio: 'Published 12 papers on conversational AI. Obsessed with making the AI interviewer feel less like a chatbot and more like a tough-but-fair senior recruiter.',
    gradient: 'linear-gradient(135deg, #06B6D4, #2563EB)',
  },
];

const STATS = [
  { value: '10,000+', label: 'Mock interviews conducted' },
  { value: '5,000+', label: 'Students trained' },
  { value: '500+', label: 'Expert coaches' },
  { value: '95%', label: 'Satisfaction rate' },
];

const VALUES = [
  {
    icon: Eye,
    title: 'Accessibility First',
    desc: 'World-class interview prep should not be a privilege of metro-city students or those who can afford expensive coaching. We start at zero rupees because access matters more than revenue.',
  },
  {
    icon: Target,
    title: 'Brutal Honesty in Feedback',
    desc: 'Your friends will say your answer was "fine." We will not. Our AI scores you across 10 metrics and tells you exactly where you lost the interviewer. That honesty is a feature, not a bug.',
  },
  {
    icon: Shield,
    title: 'Privacy by Default',
    desc: 'Your resumes, recordings, and transcripts are encrypted and visible only to you. We never sell your data or share it with employers. Your preparation is your business alone.',
  },
  {
    icon: Users,
    title: 'Built by Recruiters, for Candidates',
    desc: 'Our team includes former HR heads and hiring managers from companies like Google, Infosys, and McKinsey. We know what the other side of the table looks for because we have sat there.',
  },
];

const MODULES = [
  { icon: Mic, title: 'AI Mock Interviews', desc: 'Face a lifelike AI interviewer that adapts to your role, resume, and experience.' },
  { icon: FileText, title: 'ATS Resume Analyzer', desc: 'See how tracking systems score your resume and fix it section by section.' },
  { icon: GraduationCap, title: 'Expert Coaching Marketplace', desc: 'Book 1-on-1 video sessions with 500+ verified coaches across six categories.' },
  { icon: BarChart3, title: 'Progress Analytics', desc: 'Track your growth across every interview with rich dashboards and trend charts.' },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AboutPage() {
  return (
    <>
      {/* ==================== HERO ==================== */}
      <section className="hero" style={{ paddingBottom: '60px' }}>
        <div className="container">
          <div className="sec-head" style={{ maxWidth: '52rem' }}>
            <span className="chip">
              <Heart size={14} /> Our story
            </span>
            <h1 style={{ fontSize: 'clamp(2.2rem, 4.5vw, 3.4rem)', marginTop: '1rem' }}>
              About <span className="grad-text">InterviewAce AI</span>
            </h1>
            <p style={{ fontSize: '1.12rem', color: 'var(--text-2)', maxWidth: '40rem', margin: '1rem auto 0' }}>
              We are building the platform we wish existed when we were students — one where
              every graduate in India can walk into an interview room with real confidence, regardless
              of their college tier, their city, or how many &ldquo;connections&rdquo; they have.
            </p>
          </div>
        </div>
      </section>

      {/* ==================== OUR STORY ==================== */}
      <section style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="container">
          <div className="sec-head">
            <span className="chip">
              <BookOpen size={14} /> Founded in 2024
            </span>
            <h2>The gap between talent and opportunity</h2>
          </div>

          <div style={{ maxWidth: '46rem', margin: '0 auto' }}>
            <div className="widget" style={{ marginBottom: '1.2rem' }}>
              <p style={{ color: 'var(--text-2)', fontSize: '.95rem', lineHeight: '1.75' }}>
                InterviewAce AI was founded in 2024 by a team of IIT and IIM alumni, engineers,
                and former recruiters who had collectively sat through thousands of campus interviews.
                The pattern they saw was painful and predictable: brilliant students — people who
                could solve complex problems and build impressive projects — crumbling the moment
                a microphone turned on and a stranger asked, &ldquo;Tell me about yourself.&rdquo;
              </p>
            </div>

            <div className="widget" style={{ marginBottom: '1.2rem' }}>
              <p style={{ color: 'var(--text-2)', fontSize: '.95rem', lineHeight: '1.75' }}>
                These students did not lack talent. They lacked practice. They lacked honest,
                specific feedback. And most of all, they lacked access — because the best coaching
                was locked behind expensive urban centres, and the only &ldquo;practice&rdquo; most
                students got was rehearsing answers alone in front of a mirror.
              </p>
            </div>

            <div className="widget">
              <p style={{ color: 'var(--text-2)', fontSize: '.95rem', lineHeight: '1.75' }}>
                We built InterviewAce AI to close that gap. The gap between what you know and how
                you present it. The gap between a tier-2 city and a metro. The gap between talent
                and opportunity — which, more often than people admit, is just confidence and
                preparation. Today, a student in Jaipur or Coimbatore gets the same quality of
                AI interview practice and feedback as someone prepping with an expensive career
                coach in Bangalore. That is the product. That is the mission.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== OUR MISSION ==================== */}
      <section>
        <div className="container">
          <div className="sec-head">
            <span className="chip">
              <Zap size={14} /> Our mission
            </span>
            <h2>Democratize interview preparation</h2>
            <p>
              Make world-class coaching and AI-powered practice accessible to every student
              in India — at zero rupees to start, with no ceiling on how far you can go.
            </p>
          </div>

          <div className="feat-grid">
            {MODULES.map((m) => (
              <div className="feat-card" key={m.title}>
                <div className="feat-icon">
                  <m.icon size={24} />
                </div>
                <h3>{m.title}</h3>
                <p>{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== STATS ==================== */}
      <section style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="container">
          <div className="sec-head">
            <span className="chip">
              <BarChart3 size={14} /> Our numbers
            </span>
            <h2>Growing every single day</h2>
            <p>Real numbers from real students using the platform across India.</p>
          </div>

          <div className="metrics">
            {STATS.map((s) => (
              <div className="metric" key={s.label}>
                <div className="num">{s.value}</div>
                <div className="lbl">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== TEAM ==================== */}
      <section>
        <div className="container">
          <div className="sec-head">
            <span className="chip">
              <Users size={14} /> The team
            </span>
            <h2>People who have been on both sides of the table</h2>
            <p>
              Former interviewers, recruiters, and engineers who understand the problem
              from every angle.
            </p>
          </div>

          <div className="coach-grid">
            {TEAM.map((t) => (
              <div className="coach-card" key={t.name}>
                <div className="coach-top">
                  <div
                    className="coach-ava"
                    style={{ background: t.gradient }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <h4>{t.name}</h4>
                    <div className="des">{t.role}</div>
                  </div>
                </div>
                <div className="coach-meta">
                  <span>{t.background}</span>
                </div>
                <p style={{ fontSize: '.88rem', color: 'var(--text-2)', lineHeight: '1.6' }}>
                  {t.bio}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== VALUES ==================== */}
      <section style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="container">
          <div className="sec-head">
            <span className="chip">
              <Heart size={14} /> What we stand for
            </span>
            <h2>Our core values</h2>
            <p>
              These are not wall posters. They are the decisions we make every day when
              building this product.
            </p>
          </div>

          <div className="feat-grid">
            {VALUES.map((v) => (
              <div className="feat-card" key={v.title}>
                <div className="feat-icon">
                  <v.icon size={24} />
                </div>
                <h3>{v.title}</h3>
                <p>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== CTA ==================== */}
      <section>
        <div className="container">
          <div className="sec-head" style={{ marginBottom: '0' }}>
            <span className="chip">
              <Zap size={14} /> Get started
            </span>
            <h2>Ready to ace your next interview?</h2>
            <p style={{ marginBottom: '2rem' }}>
              Join thousands of students who stopped fearing interviews and started landing offers.
              Your first mock interview is completely free — no credit card, no catch.
            </p>
            <div style={{ display: 'flex', gap: '.9rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/dashboard/interview" className="btn btn-primary">
                <Mic size={18} /> Start free mock interview <ArrowRight size={16} />
              </Link>
              <Link href="/dashboard/ats" className="btn btn-ghost">
                <FileText size={18} /> Analyze my resume
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

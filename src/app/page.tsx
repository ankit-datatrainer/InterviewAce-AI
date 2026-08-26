'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';
import {
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
  Bot,
  GraduationCap,
  BarChart3,
  Send,
  Award,
  Sparkles,
  Gift,
  Play,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import { addGems, addXP, playDuoSound } from '@/lib/gamification';
import DashboardModal from '@/components/DashboardModal';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const METRICS = [
  { icon: '🎯', value: 10000, suffix: '+', label: 'Quests & Interviews Completed', badge: '+60 XP Avg' },
  { icon: '🏆', value: 5000, suffix: '+', label: 'Candidates Leveled Up', badge: 'Diamond Tier' },
  { icon: '🔥', value: 95, suffix: '%', label: 'Practice Win & Offer Rate', badge: 'Top 1% Rank' },
  { icon: '👑', value: 500, suffix: '+', label: 'Grandmaster FAANG Coaches', badge: 'Verified Mentors' },
];

const RPG_SKILLS = [
  {
    id: 'mock-arena',
    tier: 'Unit 1 · Skill 01',
    title: 'AI Mock Interview Arena',
    desc: 'Battle an adaptive AI avatar that listens to your voice, tracks your eye contact, and challenges you with real-time follow-ups.',
    icon: Mic,
    iconBg: 'linear-gradient(135deg, #58cc02, #0d79d1)',
    xpReward: 60,
    gemsReward: 15,
    powerUps: [
      '⚡ 3-Strike Shield Rule (Enforces real-world discipline)',
      '🗣️ Live HeyGen Avatar with natural speech synthesis',
      '📝 Real-time transcript review & STAR method score',
      '🎯 HR, Technical, Behavioral & Managerial rounds',
    ],
    actionLink: '/dashboard/interview',
    actionText: 'Enter Mock Arena',
  },
  {
    id: 'resume-radar',
    tier: 'Unit 1 · Skill 02',
    title: 'ATS Resume Radar & Scanner',
    desc: 'Instant 0–100 ATS compatibility scan. Uncover missing keywords and transform your bullet points into high-impact metrics.',
    icon: FileText,
    iconBg: 'linear-gradient(135deg, #1cb0f6, #8b5cf6)',
    xpReward: 35,
    gemsReward: 10,
    powerUps: [
      '📊 Instant 0–100 ATS match score for PDF/DOCX',
      '🔍 Missing keyword hunter matched to target roles',
      '✨ Built-in interactive Resume Builder with live preview',
      '🚀 1-Click ATS-safe clean PDF export',
    ],
    actionLink: '/dashboard/ats',
    actionText: 'Scan My Resume',
  },
  {
    id: 'boss-coaching',
    tier: 'Unit 2 · Skill 03',
    title: 'Grandmaster 1-on-1 Coaching',
    desc: 'Book high-impact video sessions with verified directors and hiring leads from Google, Microsoft, Deloitte, and Amazon.',
    icon: GraduationCap,
    iconBg: 'linear-gradient(135deg, #ff9600, #ff4b4b)',
    xpReward: 150,
    gemsReward: 40,
    powerUps: [
      '👑 500+ Verified coaches across 6 specialization tracks',
      '📅 Instant booking with Google & Outlook calendar sync',
      '📋 Written session critique & tailored career roadmap',
      '💎 Personalized STAR behavioral story review',
    ],
    actionLink: '/dashboard/coaching',
    actionText: 'Meet Grandmasters',
  },
  {
    id: 'growth-radar',
    tier: 'Unit 2 · Skill 04',
    title: '10-Metric Growth Radar & XP',
    desc: 'Watch your communication, technical precision, and composure climb across every interview with competitive league tracking.',
    icon: BarChart3,
    iconBg: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
    xpReward: 40,
    gemsReward: 15,
    powerUps: [
      '📈 10-Metric scorecard with detailed rubrics',
      '💎 Diamond & Obsidian League leaderboard standings',
      '🛡️ Practice streak tracker with freeze protection',
      '📄 Downloadable PDF performance audit certificates',
    ],
    actionLink: '/dashboard/analytics',
    actionText: 'View Career Radar',
  },
];

type QuestStage = {
  stageNum: number;
  title: string;
  desc: string;
  icon: string;
  status: 'completed' | 'active' | 'locked';
  stars: number;
  xp: number;
  gems: number;
  tier: string;
  link: string;
  checklist: string[];
};

const QUEST_STAGES: QuestStage[] = [
  {
    stageNum: 1,
    title: 'Profile Calibration',
    desc: 'Set target role, seniority & dream companies in under 2 mins',
    icon: '🎯',
    status: 'completed',
    stars: 3,
    xp: 40,
    gems: 10,
    tier: 'Unit 1 · Fresher',
    link: '/dashboard',
    checklist: ['Select target role & domain', 'Set experience level', 'Calibrate salary target'],
  },
  {
    stageNum: 2,
    title: 'ATS Resume Power-Up',
    desc: 'Scan resume to unlock 85+ score and fix recruiter filters',
    icon: '📄',
    status: 'completed',
    stars: 3,
    xp: 50,
    gems: 15,
    tier: 'Unit 1 · Mid',
    link: '/dashboard/ats',
    checklist: ['Upload PDF or DOCX resume', 'Apply missing keyword fixes', 'Export ATS-proof format'],
  },
  {
    stageNum: 3,
    title: 'The AI Avatar Arena',
    desc: 'Face adaptive AI interviewer with 3-Strike discipline shield',
    icon: '🎙️',
    status: 'active',
    stars: 1,
    xp: 75,
    gems: 25,
    tier: 'Unit 2 · Advanced',
    link: '/dashboard/interview',
    checklist: ['Answer adaptive voice questions', 'Avoid silence & rambling strikes', 'Receive 10-metric scorecard'],
  },
  {
    stageNum: 4,
    title: 'Mastery & Offer Letter',
    desc: 'Grandmaster feedback, league promotion & dream offer',
    icon: '👑',
    status: 'locked',
    stars: 0,
    xp: 150,
    gems: 50,
    tier: 'Unit 2 · Boss Round',
    link: '/dashboard/coaching',
    checklist: ['Complete full interview loop', '1-on-1 Grandmaster mock review', 'Unlock Diamond League badge'],
  },
];

const GRANDMASTER_COACHES = [
  {
    name: 'Saurabh Sharda',
    title: 'Personality Development Coach',
    image: 'https://tqxmetsdfnijczgbdoif.supabase.co/storage/v1/object/public/coach-avatars/0d2d366c-8140-4ce3-97c2-40f12fa012ae/1783313856464-opa1i7.jpg',
    fallbackImage: '/images/saurabh.jpg',
    experience: '16+ Years Experience',
    rating: 5,
    reviews: '1 reviews',
    bio: 'About the Coach: A Youth Personality Development Entrepreneur with 15+ years of entrepreneurial experience. I blend practical insights to build self-confidence, master communication, and develop executive presence.',
    tags: ['Personality Development', 'Communication', 'Leadership', 'Self-Confidence'],
    badge: '👑 Personality Mentor',
    slug: 'saurabh-sharda',
    xpReward: 150,
  },
  {
    name: 'Ankit Kumar',
    title: 'Generative AI & Agentic AI Expert',
    image: '/images/ankit.jpg',
    fallbackImage: '/images/ankit.jpg',
    experience: '5+ Years Experience',
    rating: 5,
    reviews: '0 reviews',
    bio: 'I specialize in Generative AI and Agentic AI systems. I will help you master LLM architectures, AI agents, and system design for modern AI engineering and tech leadership interviews.',
    tags: ['Generative AI', 'Agentic AI', 'LLMs', 'System Design'],
    badge: '⚡ AI Architect',
    slug: 'ankit-kumar',
    xpReward: 150,
  },
  {
    name: 'Sagar Tandon',
    title: 'Public Speaking & Interview Expert',
    image: 'https://tqxmetsdfnijczgbdoif.supabase.co/storage/v1/object/public/coach-avatars/_new/1783522410829-297mcj.jpg',
    fallbackImage: '/images/saurabh.jpg',
    experience: '10+ Years Experience',
    rating: 5,
    reviews: '0 reviews',
    bio: 'Sagar Tandon is a Public Speaking & Interview Expert dedicated to helping students and professionals communicate with confidence, conquer stage fear, and excel in competitive interview rounds.',
    tags: ['Communication', 'Public Speaking', 'Interview Prep'],
    badge: '🎤 Speech Maestro',
    slug: 'sagar-tandon',
    xpReward: 140,
  },
];

const TESTIMONIALS = [
  {
    stars: 5,
    league: '🥇 Diamond League Top 1%',
    placement: 'Placed at Deloitte · MBA Graduate',
    quote: 'I bombed my first three campus interviews. After 12 mock rounds on InterviewAce, I cracked a placement at Deloitte. The strike system trained me to stop rambling.',
    name: 'Priya Sharma',
    role: 'MBA Graduate · Deloitte',
    initials: 'PS',
    atsScore: 'ATS 91%',
    strikes: '0 Strikes',
  },
  {
    stars: 5,
    league: '🚀 Obsidian League Promotion',
    placement: 'Data Analyst at Zomato',
    quote: 'My resume was getting auto-rejected everywhere. The ATS analyzer found 14 missing keywords. Score went from 52 to 89 — interviews started coming in within two weeks.',
    name: 'Rahul Verma',
    role: 'B.Tech Fresher · Zomato',
    initials: 'RV',
    atsScore: 'ATS 89%',
    strikes: 'Score 92%',
  },
  {
    stars: 5,
    league: '👑 Grandmaster Graduate',
    placement: 'Placed at Google · Senior SDE',
    quote: 'The system design mock interviews are incredibly realistic. The AI pushed me to justify my database choices and load-balancing strategies. Cleared my L4 round at Google!',
    name: 'Karan Desai',
    role: 'Senior Software Engineer · Google',
    initials: 'KD',
    atsScore: 'ATS 96%',
    strikes: 'Score 95%',
  },
  {
    stars: 5,
    league: '🌟 Master Mentee',
    placement: 'Program Manager at Microsoft',
    quote: 'I booked a 1-on-1 coaching session before my final round at Microsoft. My coach gave me exactly the mock experience I needed to succeed.',
    name: 'Sneha Patel',
    role: 'Program Manager · Microsoft',
    initials: 'SP',
    atsScore: 'ATS 94%',
    strikes: 'Score 90%',
  },
  {
    stars: 5,
    league: '💎 Emerald League Champion',
    placement: 'Product Designer at CRED',
    quote: 'The Resume Analyzer is pure magic. It highlighted formatting issues that were breaking ATS parsers. Once fixed, my callback rate went from 0% to almost 40%.',
    name: 'Arjun Reddy',
    role: 'Product Designer · CRED',
    initials: 'AR',
    atsScore: 'ATS 93%',
    strikes: 'Score 88%',
  },
];

const FAQS = [
  {
    q: 'How realistic is the AI Mock Interview arena?',
    a: 'Extremely realistic. The AI interviewer uses a live conversational avatar with adaptive questions, voice recognition, and enforces real-world discipline with a 3-Strike Rule for long pauses, interruptions, and off-topic tangents. Finishing a session with 0 strikes earns you the "Laser Focus" badge and +75 XP.',
    icon: '🎙️',
    badge: 'AI Arena',
  },
  {
    q: 'How does the ATS Resume Radar score my resume?',
    a: 'Our algorithm parses your resume exactly like enterprise Applicant Tracking Systems (Workday, Greenhouse, Taleo) do. It scans formatting, keyword density for your target job title, quantified achievements, and section structures to generate an instant 0–100 score with actionable fix suggestions.',
    icon: '📄',
    badge: 'ATS Scanner',
  },
  {
    q: 'What are Practice Streaks, XP & Gems used for?',
    a: 'Practicing daily builds your Streak and awards Career XP that advances you across League Tiers (from Bronze to Obsidian). Earned Gems can be redeemed in the Power-Up Shop for Streak Freezes, Bonus AI Practice Passes, and 1-on-1 Grandmaster Coaching discounts.',
    icon: '💎',
    badge: 'Gamification',
  },
  {
    q: 'How do 1-on-1 Grandmaster Coaching sessions work?',
    a: 'Browse verified mentors from Google, Microsoft, Amazon and top firms. Select a category (System Design, Behavioral STAR, HR, Executive Pitch), pick a live video slot with calendar sync, and receive structured feedback plus a custom action plan in your dashboard.',
    icon: '👑',
    badge: 'Coaching',
  },
  {
    q: 'Is my interview and resume data encrypted and private?',
    a: '100% yes. Your resume uploads, audio/video streams, and practice transcripts are encrypted end-to-end and stored securely. We never sell your candidate data or share recordings with employers without your explicit permission.',
    icon: '🛡️',
    badge: 'Privacy Vault',
  },
  {
    q: 'Can I edit my resume directly inside the platform?',
    a: 'Yes! The built-in ATS Resume Builder lets you tweak each section with instant AI suggestions, re-score in real-time, and download an ATS-safe, recruiter-approved PDF with zero formatting errors.',
    icon: '⭐',
    badge: 'Resume Builder',
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

function GamifiedMetricCard({ icon, value, suffix, label, badge }: { icon: string; value: number; suffix: string; label: string; badge: string }) {
  const { count, ref } = useCountUp(value);
  return (
    <div className="gamified-metric-card" ref={ref} onClick={() => playDuoSound('pop')}>
      <div className="gamified-metric-icon">{icon}</div>
      <div className="gamified-metric-val">
        {count.toLocaleString()}
        {suffix}
      </div>
      <div className="gamified-metric-lbl">{label}</div>
      <div className="gamified-metric-badge">{badge}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function Home() {
  const [tIdx, setTIdx] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [selectedStage, setSelectedStage] = useState<QuestStage | null>(null);
  const [chestClaimed, setChestClaimed] = useState(false);
  const [chestModal, setChestModal] = useState(false);

  /* ---- reveal on scroll ---- */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
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
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  const handleOpenChest = () => {
    if (chestClaimed) return;
    addGems(30);
    addXP(50);
    setChestClaimed(true);
    setChestModal(true);
    playDuoSound('chest');
  };

  const handleContactSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    playDuoSound('correct');
    showToast('Guild dispatch received! A mentor will contact you in under 24 hours.');
    (e.target as HTMLFormElement).reset();
  };

  return (
    <div className="home-page">
      {/* ==================== HERO ==================== */}
      <section className="hero home-hero-motion">
        <div className="home-hero-aurora" aria-hidden="true">
          <span className="home-aurora-orb home-aurora-orb-one" />
          <span className="home-aurora-orb home-aurora-orb-two" />
          <span className="home-aurora-grid" />
        </div>
        <div className="container">
          <div className="hero-grid">
            {/* Left */}
            <div className="hero-copy">
              <div className="hero-kicker">
                <span className="hero-kicker-dot" />
                AI interview practice
              </div>
              <h1>
                Practice smarter.<br />
                <span className="grad-text">Get hired.</span>
              </h1>
              <p className="sub">
                Realistic interviews. Instant feedback. Better answers.
              </p>

              <div className="hero-ctas">
                <Link
                  href="/dashboard/interview"
                  className="btn-duo btn-duo-green btn-duo-lg"
                  onClick={() => playDuoSound('pop')}
                >
                  <Mic size={20} /> Enter Practice Arena
                </Link>
                <a
                  href="#features"
                  className="btn-duo btn-duo-ghost btn-duo-lg hero-next-btn"
                  onClick={() => playDuoSound('pop')}
                >
                  Next <ArrowRight size={18} />
                </a>
              </div>

              <div className="hero-mini-proof">
                <span>
                  <Check size={15} /> Free to start
                </span>
                <span>
                  <Check size={15} /> Instant feedback
                </span>
              </div>
            </div>

            {/* Right -- side-by-side video call mockup with Gamified HUD & Floating Award */}
            <div className="hero-video-call">
              <div className="hero-dashed-circle" />
              <div className="hero-dots-grid" />
              <span className="hero-orbit-dot hero-orbit-dot-one" aria-hidden="true" />
              <span className="hero-orbit-dot hero-orbit-dot-two" aria-hidden="true" />

              <div className="vc-container">
                {/* Header bar */}
                <div className="vc-header">
                  <div className="vc-header-left">
                    <span className="vc-live-dot" />
                    <span>AI Interview &middot; Live</span>
                  </div>
                  <div className="vc-header-right">
                    <span className="vc-timer-badge">🛡️ 0/3 Strikes</span>
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
                      <span>Alex &middot; AI Senior Recruiter</span>
                    </div>
                  </div>

                  {/* Candidate Panel */}
                  <div className="vc-panel candidate-panel">
                    <div className="vc-video-wrapper">
                      <img src="/male_candidate.png" alt="Candidate" />
                    </div>
                    <div className="vc-label">
                      <span className="vc-label-dot" />
                      <span>You &middot; Level 3 Contender</span>
                    </div>
                  </div>
                </div>

                <div className="vc-compact-feedback" aria-label="Live answer feedback: strong answer, 92 percent">
                  <span className="vc-feedback-icon"><Check size={15} /></span>
                  <strong>Strong answer</strong>
                  <span className="vc-feedback-score">92%</span>
                </div>

                {/* Bottom controls bar */}
                <div className="vc-controls">
                  <button className="vc-ctrl-btn" onClick={() => playDuoSound('pop')} title="Microphone"><Mic size={16} /></button>
                  <button className="vc-ctrl-btn" onClick={() => playDuoSound('pop')} title="AI Avatar"><Bot size={16} /></button>
                  <button className="vc-ctrl-btn end" onClick={() => playDuoSound('wrong')} title="Leave Arena"><Phone size={16} /></button>
                </div>
              </div>

              {/* Float badges */}
              <div className="float-badge fb-1" style={{ zIndex: 12 }}>
                <Award size={16} style={{ color: '#ffc800' }} />
                <span><b style={{ color: '#ffc800' }}>+60 XP</b></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== TRUST METRICS ==================== */}
      <section style={{ padding: '40px 0' }}>
        <div className="container">
          <div className="award-section-badge-wrap reveal">
            <div className="award-float-badge green">
              <span>⚡</span>
              <span>Level Milestone: <strong>500,000+</strong> Practice Rounds Mastered Worldwide</span>
            </div>
          </div>

          <div className="gamified-metrics-grid reveal">
            {METRICS.map((m) => (
              <GamifiedMetricCard
                key={m.label}
                icon={m.icon}
                value={m.value}
                suffix={m.suffix}
                label={m.label}
                badge={m.badge}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FEATURES (RPG SKILL TREES) ==================== */}
      <section id="features">
        <div className="container">
          <div className="sec-head reveal">
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
              <span className="chip" style={{ background: 'rgba(28, 176, 246, 0.12)', color: '#1cb0f6', borderColor: 'rgba(28, 176, 246, 0.3)' }}>
                ⚡ Career Skill Tree
              </span>
              <div className="award-float-badge gold" style={{ animationDelay: '0.8s' }}>
                <span>🎖️</span>
                <span><strong>Level IV Mastery</strong> Certified</span>
              </div>
            </div>
            <h2>Four Power-Up Modules to Master Any Interview</h2>
            <p>Progress from foundational icebreakers to FAANG system design with interactive practice tracks.</p>
          </div>

          <div className="rpg-skills-grid">
            {RPG_SKILLS.map((skill) => {
              const Icon = skill.icon;
              return (
                <div className="rpg-skill-card reveal" key={skill.id}>
                  <div>
                    <div className="rpg-skill-card-head">
                      <div className="rpg-skill-icon-wrap" style={{ background: skill.iconBg }}>
                        <Icon size={26} />
                      </div>
                      <div className="rpg-reward-tag">
                        <span>⚡ +{skill.xpReward} XP</span>
                        <span>&middot;</span>
                        <span>💎 +{skill.gemsReward}</span>
                      </div>
                    </div>

                    <div className="rpg-tier-pill">{skill.tier}</div>
                    <h3>{skill.title}</h3>
                    <p>{skill.desc}</p>

                    <ul className="rpg-powerups-list">
                      {skill.powerUps.map((p, idx) => (
                        <li key={idx}>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rpg-card-action">
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-2)', fontWeight: 700 }}>
                      🎮 Fully Playable Online
                    </span>
                    <Link
                      href={skill.actionLink}
                      className="btn-duo btn-duo-green btn-duo-sm"
                      onClick={() => playDuoSound('pop')}
                    >
                      {skill.actionText} &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS (4-STAGE CAREER QUEST MAP) ==================== */}
      <section id="how" style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="container">
          <div className="sec-head reveal">
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
              <span className="chip" style={{ background: 'rgba(88, 204, 2, 0.12)', color: '#58cc02', borderColor: 'rgba(88, 204, 2, 0.3)' }}>
                🗺️ Career Quest Path
              </span>
              <div className="award-float-badge diamond" style={{ animationDelay: '1.2s' }}>
                <span>💎</span>
                <span><strong>Awwwards UX</strong> 4-Stage Journey</span>
              </div>
            </div>
            <h2>The 4-Stage Journey from Candidate to Dream Offer</h2>
            <p>Click on any stage node to preview objectives, XP bounties, and difficulty tiers.</p>
          </div>

          <div className="home-quest-map reveal">
            <div className="home-quest-nodes-grid">
              {/* Stepping Connector lines for desktop */}
              <div className="home-stage-connector-line done" style={{ left: '12.5%', width: '25%' }} />
              <div className="home-stage-connector-line done" style={{ left: '37.5%', width: '25%' }} />
              <div className="home-stage-connector-line" style={{ left: '62.5%', width: '25%' }} />

              {QUEST_STAGES.map((stage) => {
                return (
                  <div className="home-stage-column" key={stage.stageNum}>
                    <button
                      className={`home-stage-node-btn ${stage.status}`}
                      onClick={() => {
                        playDuoSound(stage.status === 'completed' ? 'correct' : stage.status === 'active' ? 'pop' : 'wrong');
                        setSelectedStage(stage);
                      }}
                      title={`${stage.title} - Click for details`}
                      aria-label={`View stage ${stage.stageNum}: ${stage.title}`}
                    >
                      <span>{stage.icon}</span>
                      {stage.status === 'completed' && (
                        <span style={{ position: 'absolute', bottom: '-8px', fontSize: '0.75rem', letterSpacing: '-0.1em' }}>
                          ⭐⭐⭐
                        </span>
                      )}
                      {stage.status === 'active' && (
                        <div className="duo-active-tooltip">
                          <Play size={10} fill="#fff" /> START
                        </div>
                      )}
                    </button>

                    <div className="home-stage-info">
                      <span className="home-stage-num-badge">Stage 0{stage.stageNum}</span>
                      <h4>{stage.title}</h4>
                      <p>{stage.desc}</p>
                      <span className="home-stage-xp-pill">+{stage.xp} XP &middot; +{stage.gems} 💎</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mystery Reward Chest on Landing Page */}
            <div className="home-mystery-chest-bar">
              <div className="home-chest-left">
                <div className="home-chest-emoji">{chestClaimed ? '✨' : '🎁'}</div>
                <div>
                  <div className="home-chest-title">
                    {chestClaimed ? '🎉 Explorer Chest Claimed (+30 💎 & +50 ⚡ XP)' : 'Mystery Career Explorer Chest'}
                  </div>
                  <div className="home-chest-desc">
                    {chestClaimed
                      ? 'Reward credited to your account! Practice in the arena to earn more.'
                      : 'Click to unlock a free starter bounty of Gems & XP for your candidate journey!'}
                  </div>
                </div>
              </div>
              <button
                className={`btn-duo ${chestClaimed ? 'btn-duo-ghost' : 'btn-duo-orange'}`}
                onClick={handleOpenChest}
                disabled={chestClaimed}
              >
                <Gift size={18} /> {chestClaimed ? 'Opened' : 'Claim Free 30 💎'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== COACHING ARENA ==================== */}
      <section id="coaching">
        <div className="container">
          <div className="sec-head reveal">
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
              <span className="chip" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
                👑 Expert Coaches
              </span>
              <div className="award-float-badge purple" style={{ animationDelay: '0.5s' }}>
                <span>🌟</span>
                <span><strong>Top 0.1%</strong> Verified Mentors</span>
              </div>
            </div>
            <h2>1-on-1 Mentorship with Industry Experts</h2>
            <p>Connect with verified coaches for live 1-on-1 interview drills, AI system design, and executive communication.</p>
          </div>

          <div className="coaches-arena-grid reveal">
            {GRANDMASTER_COACHES.map((c) => (
              <div className="duo-coach-card" key={c.name}>
                <div className="coach-league-ribbon">{c.badge}</div>

                <div>
                  <div className="duo-coach-avatar-row">
                    <div className="duo-coach-avatar-img-wrap">
                      <img
                        src={c.image}
                        alt={c.name}
                        className="duo-coach-img"
                        onError={(e) => {
                          if (c.fallbackImage && (e.currentTarget.src !== c.fallbackImage)) {
                            e.currentTarget.src = c.fallbackImage;
                          }
                        }}
                      />
                    </div>
                    <div>
                      <h4 className="duo-coach-name">{c.name}</h4>
                      <div className="duo-coach-role">{c.title}</div>
                    </div>
                  </div>

                  <div className="coach-stats-row">
                    <span style={{ color: '#f59e0b', fontWeight: 800 }}>★ {c.experience}</span>
                    <span style={{ color: '#f59e0b', fontWeight: 700, marginLeft: 'auto' }}>⭐ {c.rating} <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>({c.reviews})</span></span>
                  </div>

                  <p style={{ fontSize: '0.84rem', color: 'var(--text-2)', margin: '0.7rem 0 0.8rem', lineHeight: 1.5 }}>
                    {c.bio}
                  </p>

                  <div className="coach-tags-wrap">
                    {c.tags.map((tag) => (
                      <span key={tag} className="coach-subject-tag">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="coach-xp-booster" style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
                    <Sparkles size={14} /> +{c.xpReward} XP Session Booster
                  </div>
                </div>

                <div style={{ marginTop: '1.2rem' }}>
                  <Link
                    href={`/dashboard/coaching/${c.slug}`}
                    className="btn-duo btn-duo-purple btn-duo-sm"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => playDuoSound('pop')}
                  >
                    Book Session &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== TESTIMONIALS (HALL OF FAME) ==================== */}
      <section id="testimonials" style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="container">
          <div className="sec-head reveal">
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
              <span className="chip" style={{ background: 'rgba(255, 200, 0, 0.12)', color: '#ffc800', borderColor: 'rgba(255, 200, 0, 0.3)' }}>
                🏆 Candidate Hall of Fame
              </span>
              <div className="award-float-badge gold" style={{ animationDelay: '1.6s' }}>
                <span>🏅</span>
                <span><strong>Awwwards Choice</strong> 100% Placement Verified</span>
              </div>
            </div>
            <h2>Diamond League Placements &amp; Offer Letters</h2>
            <p>Real contenders who leveled up their interview confidence and secured top company placements.</p>
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
                    className="t-card hall-fame-card" 
                    key={t.name}
                    style={{
                      opacity: idx === tIdx ? 1 : 0.3,
                      transform: idx === tIdx ? 'scale(1)' : 'scale(0.95)',
                      transition: 'all 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
                      filter: idx === tIdx ? 'blur(0px)' : 'blur(4px)'
                    }}
                  >
                    <div className="hall-fame-header">
                      <span className="league-placement-badge">{t.league}</span>
                      <div className="stars">
                        {Array.from({ length: t.stars }).map((_, i) => (
                          <Star key={i} size={18} fill="#FBBF24" stroke="#FBBF24" style={{ display: 'inline' }} />
                        ))}
                      </div>
                    </div>

                    <blockquote>&ldquo;{t.quote}&rdquo;</blockquote>

                    <div className="t-who">
                      <div className="t-ava">{t.initials}</div>
                      <div>
                        <b>{t.name}</b>
                        <span>{t.role}</span>
                      </div>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '6px', background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}>
                          {t.atsScore}
                        </span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '6px', background: 'rgba(28,176,246,0.12)', color: '#1cb0f6', border: '1px solid rgba(28,176,246,0.25)' }}>
                          {t.strikes}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              className="t-arrow t-prev"
              onClick={() => {
                playDuoSound('pop');
                setTIdx((i) => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
              }}
              aria-label="Previous testimonial"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              className="t-arrow t-next"
              onClick={() => {
                playDuoSound('pop');
                setTIdx((i) => (i + 1) % TESTIMONIALS.length);
              }}
              aria-label="Next testimonial"
            >
              <ChevronRight size={20} />
            </button>
            <div className="t-nav">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  className={`t-dot${i === tIdx ? ' on' : ''}`}
                  onClick={() => {
                    playDuoSound('pop');
                    setTIdx(i);
                  }}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FAQ (ADVENTURER'S GUIDEBOOK) ==================== */}
      <section id="faq">
        <div className="container">
          <div className="sec-head reveal">
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
              <span className="chip" style={{ background: 'rgba(28, 176, 246, 0.12)', color: '#1cb0f6', borderColor: 'rgba(28, 176, 246, 0.3)' }}>
                📖 Adventurer&apos;s Guidebook
              </span>
              <div className="award-float-badge green" style={{ animationDelay: '0.9s' }}>
                <span>📜</span>
                <span><strong>Level 10 Codex</strong> Complete Rules</span>
              </div>
            </div>
            <h2>Rules of the Arena &amp; FAQs</h2>
            <p>Everything you need to know about XP calculation, strikes, and coaching loops.</p>
          </div>

          <div className="guidebook-faq-grid reveal">
            {FAQS.map((item, i) => (
              <div className={`guidebook-faq-item${openFaq === i ? ' open' : ''}`} key={i}>
                <button
                  className="guidebook-faq-q"
                  onClick={() => {
                    playDuoSound('pop');
                    setOpenFaq(openFaq === i ? null : i);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <div className="guidebook-icon-badge">{item.icon}</div>
                    <span>{item.q}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '6px', background: 'rgba(0,0,0,0.06)', color: 'var(--text-2)' }}>
                      {item.badge}
                    </span>
                    <Plus
                      size={16}
                      style={{
                        transform: openFaq === i ? 'rotate(45deg)' : 'none',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </div>
                </button>
                <div className="guidebook-faq-a" style={{ maxHeight: openFaq === i ? '320px' : '0' }}>
                  <p>{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== CONTACT (SUMMON GUILD HELP) ==================== */}
      <section id="contact" style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--line)' }}>
        <div className="container">
          <div className="sec-head reveal">
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
              <span className="chip" style={{ background: 'rgba(88, 204, 2, 0.12)', color: '#58cc02', borderColor: 'rgba(88, 204, 2, 0.3)' }}>
                🛡️ Guild Support
              </span>
              <div className="award-float-badge diamond" style={{ animationDelay: '1.1s' }}>
                <span>⚡</span>
                <span><strong>Level S Response</strong> &lt; 3 Min SLA</span>
              </div>
            </div>
            <h2>Summon Arena Mentor Support</h2>
            <p>Need custom company interview rubrics, technical help, or candidate guidance? We respond in under 3 minutes.</p>
          </div>

          <div className="contact-grid reveal">
            {/* Left -- channels */}
            <div className="contact-card">
              <div className="c-channel">
                <div className="c-ico" style={{ background: 'rgba(88, 204, 2, 0.15)', color: '#58cc02' }}><MessageSquare size={20} /></div>
                <div>
                  <b>Live Guild Chat</b>
                  <span>Average response time under 3 minutes (9 AM – 9 PM IST)</span>
                </div>
              </div>
              <div className="c-channel">
                <div className="c-ico" style={{ background: 'rgba(28, 176, 246, 0.15)', color: '#1cb0f6' }}><BookOpen size={20} /></div>
                <div>
                  <b>Candidate Guidebook</b>
                  <span>Rubrics, ATS formats and question banks for 120+ roles</span>
                </div>
              </div>
              <div className="c-channel">
                <div className="c-ico" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}><Phone size={20} /></div>
                <div>
                  <b>Career Direction Call</b>
                  <span>Complimentary 15-min strategy session for active job seekers</span>
                </div>
              </div>
              <div className="c-channel">
                <div className="c-ico" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}><Mail size={20} /></div>
                <div>
                  <b>Direct Mentor Dispatch</b>
                  <span>support@interviewace.ai &middot; guaranteed reply in 24h</span>
                </div>
              </div>
            </div>

            {/* Right -- form */}
            <div className="form-card">
              <form onSubmit={handleContactSubmit}>
                <div className="form-row">
                  <div className="field">
                    <label>Candidate Name</label>
                    <input type="text" placeholder="e.g. Ananya Sharma" required />
                  </div>
                  <div className="field">
                    <label>Email Address</label>
                    <input type="email" placeholder="you@domain.com" required />
                  </div>
                </div>
                <div className="field">
                  <label>Target Role / Company</label>
                  <input type="text" placeholder="e.g. SDE-1 @ Google or Product Manager" />
                </div>
                <div className="field">
                  <label>Message / Question</label>
                  <textarea rows={4} placeholder="How can the Guild help you prepare?" required />
                </div>
                <button type="submit" className="btn-duo btn-duo-green" style={{ width: '100%', justifyContent: 'center' }}>
                  <Send size={16} /> Dispatch Message &middot; Earn +10 XP
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== INTERACTIVE STAGE DETAILS MODAL ==================== */}
      <DashboardModal
        open={Boolean(selectedStage)}
        onClose={() => setSelectedStage(null)}
        ariaLabel={selectedStage ? `${selectedStage.title} stage details` : 'Stage details'}
        maxWidth="500px"
      >
        {selectedStage && (
          <>
            <div style={{ fontSize: '3.5rem', marginBottom: '0.6rem' }}>{selectedStage.icon}</div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--duo-blue, #1cb0f6)', textTransform: 'uppercase' }}>
              {selectedStage.tier}
            </span>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.3rem 0 0.5rem' }}>
              Stage 0{selectedStage.stageNum}: {selectedStage.title}
            </h3>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginBottom: '1.2rem' }}>
              {selectedStage.desc}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.8rem', marginBottom: '1.4rem' }}>
              <span className="stat-pill" style={{ background: 'rgba(255, 200, 0, 0.12)', color: '#ffc800', borderColor: 'rgba(255, 200, 0, 0.3)' }}>
                ⚡ +{selectedStage.xp} XP Bounty
              </span>
              <span className="stat-pill" style={{ background: 'rgba(28, 176, 246, 0.12)', color: '#1cb0f6', borderColor: 'rgba(28, 176, 246, 0.3)' }}>
                💎 +{selectedStage.gems} Gems
              </span>
            </div>

            <div style={{ textAlign: 'left', background: 'var(--card)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--line)', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-2)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                Stage Objectives:
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.45rem', fontSize: '0.86rem' }}>
                {selectedStage.checklist.map((item, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={15} color="#22c55e" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href={selectedStage.link}
              className="btn-duo btn-duo-green"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => {
                playDuoSound('pop');
                setSelectedStage(null);
              }}
            >
              <Play size={16} fill="#fff" /> Start Stage Quest
            </Link>
          </>
        )}
      </DashboardModal>

      {/* ==================== CELEBRATORY MYSTERY CHEST MODAL ==================== */}
      <DashboardModal
        open={chestModal}
        onClose={() => setChestModal(false)}
        ariaLabel="Career explorer bounty unlocked"
        showClose={false}
      >
            <div style={{ fontSize: '4rem', marginBottom: '0.6rem', animation: 'duoBounce 1.5s infinite' }}>🎁</div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ffc800', textTransform: 'uppercase' }}>
              Bounty Unlocked
            </span>
            <h3 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0.3rem 0 0.5rem' }}>
              Career Explorer Bounty!
            </h3>
            <p style={{ color: 'var(--text-2)', fontSize: '0.92rem', marginBottom: '1.4rem' }}>
              You found a hidden candidate treasure! We credited <strong>+30 Gems 💎</strong> and <strong>+50 XP ⚡</strong> to your arena balance.
            </p>

            <button
              className="btn-duo btn-duo-green"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => {
                playDuoSound('pop');
                setChestModal(false);
              }}
            >
              Awesome! Let&apos;s Practice &rarr;
            </button>
      </DashboardModal>

      {/* ==================== TOAST ==================== */}
      <div className={`toast${toastVisible ? ' show' : ''}`}>
        <Check size={18} style={{ color: '#22C55E' }} /> {toastMsg}
      </div>

      <Footer />
    </div>
  );
}

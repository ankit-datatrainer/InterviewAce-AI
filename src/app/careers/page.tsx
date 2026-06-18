import Link from 'next/link';
import Footer from '@/components/Footer';
import {
  MapPin,
  Briefcase,
  IndianRupee,
  Users,
  BookOpen,
  Rocket,
  Wifi,
  Heart,
  GraduationCap,
  Mail,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const PERKS = [
  {
    icon: Wifi,
    title: 'Remote-first',
    desc: 'Work from anywhere in India. We default to async communication, write things down instead of scheduling calls, and trust you to manage your own time. No pointless meetings, no "just hopping on a quick sync."',
  },
  {
    icon: Heart,
    title: 'Real impact',
    desc: 'Every feature you ship directly helps a student land their dream job. You will hear from real users — students who cracked placements, freshers who got their first offer letter — because of something you built.',
  },
  {
    icon: BookOpen,
    title: 'Learning budget',
    desc: 'Rs. 50,000 per year for courses, conferences, books, or anything that makes you better at your craft. No approvals needed, no justification essays. Just learn and grow.',
  },
  {
    icon: TrendingUp,
    title: 'Equity for all',
    desc: 'Every team member gets ESOPs from day one — not just founders and early employees. We believe everyone who helps build InterviewAce should own a piece of what we are creating together.',
  },
];

const POSITIONS = [
  {
    title: 'Senior Full-Stack Engineer',
    department: 'Engineering',
    departmentColor: 'blue' as const,
    stack: 'Next.js, React, Node.js',
    location: 'Remote',
    salary: '18-28 LPA',
  },
  {
    title: 'AI/ML Engineer',
    department: 'Engineering',
    departmentColor: 'blue' as const,
    stack: 'NLP, LLMs, Python',
    location: 'Remote / Bangalore',
    salary: '22-35 LPA',
  },
  {
    title: 'Product Designer',
    department: 'Design',
    departmentColor: 'green' as const,
    stack: 'UI/UX, Figma, Design Systems',
    location: 'Remote',
    salary: '14-22 LPA',
  },
  {
    title: 'Growth Marketing Manager',
    department: 'Marketing',
    departmentColor: 'amber' as const,
    stack: 'SEO, Paid Ads, Analytics',
    location: 'Remote / Delhi',
    salary: '12-18 LPA',
  },
  {
    title: 'Content Writer',
    department: 'Content',
    departmentColor: 'green' as const,
    stack: 'Career & Education Writing',
    location: 'Remote',
    salary: '6-10 LPA',
  },
  {
    title: 'Student Ambassador',
    department: 'Community',
    departmentColor: 'amber' as const,
    stack: 'Part-time, Campus Outreach',
    location: 'Any city',
    salary: 'Stipend + Pro access',
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CareersPage() {
  return (
    <>
      {/* ==================== HERO ==================== */}
      <section className="hero" style={{ paddingBottom: '60px' }}>
        <div className="container">
          <div style={{ maxWidth: '52rem', margin: '0 auto', textAlign: 'center' }}>
            <span className="chip">
              <Rocket size={14} /> We are hiring
            </span>
            <h1 style={{ marginTop: '1.1rem', marginBottom: '1.2rem' }}>
              Join the team that&rsquo;s changing how India{' '}
              <span className="grad-text">prepares for interviews</span>
            </h1>
            <p className="sub" style={{ maxWidth: '38rem', margin: '0 auto 2rem', textAlign: 'center' }}>
              We are a small, focused team building something that genuinely matters.
              If you care about education, technology, and giving every student a fair
              shot at their career — we would love to work with you.
            </p>
            <div style={{ display: 'flex', gap: '.9rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="#positions" className="btn btn-primary">
                <Briefcase size={18} /> View open positions
              </a>
              <a href="#culture" className="btn btn-ghost">
                <Users size={18} /> Meet the team
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== WHY WORK HERE ==================== */}
      <section style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="container">
          <div className="sec-head">
            <span className="chip">Why InterviewAce</span>
            <h2>Built different, on purpose</h2>
            <p>
              We did not set out to build another startup with ping-pong tables and
              mandatory fun. Here is what actually matters to us.
            </p>
          </div>
          <div className="feat-grid">
            {PERKS.map((perk) => (
              <div className="feat-card" key={perk.title}>
                <div className="feat-icon">
                  <perk.icon size={24} />
                </div>
                <h3>{perk.title}</h3>
                <p>{perk.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== OPEN POSITIONS ==================== */}
      <section id="positions">
        <div className="container">
          <div className="sec-head">
            <span className="chip">Open roles</span>
            <h2>Find your place here</h2>
            <p>
              Every role is remote-friendly unless noted otherwise. We hire across
              India and work on IST-flexible hours.
            </p>
          </div>
          <div style={{ maxWidth: '820px', margin: '0 auto' }}>
            <div className="widget">
              {POSITIONS.map((pos, i) => (
                <div
                  className="list-row"
                  key={pos.title}
                  style={{
                    flexWrap: 'wrap',
                    gap: '0.6rem',
                    padding: '1.1rem 0',
                    borderBottom: i < POSITIONS.length - 1 ? '1px solid var(--line)' : 'none',
                  }}
                >
                  <div style={{ flex: '1 1 280px' }}>
                    <div style={{ fontWeight: 700, fontSize: '1.02rem', marginBottom: '.35rem' }}>
                      {pos.title}
                    </div>
                    <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className={`tag ${pos.departmentColor}`}>{pos.department}</span>
                      <span className="meta" style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                        <MapPin size={13} /> {pos.location}
                      </span>
                      <span className="meta" style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                        <IndianRupee size={13} /> {pos.salary}
                      </span>
                    </div>
                    <div className="meta" style={{ marginTop: '.3rem', color: 'var(--text-3)', fontSize: '.8rem' }}>
                      {pos.stack}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <Link
                      href={`mailto:careers@interviewace.ai?subject=Application: ${pos.title}`}
                      className="btn btn-primary btn-sm"
                    >
                      Apply <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== CULTURE ==================== */}
      <section
        id="culture"
        style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}
      >
        <div className="container">
          <div className="sec-head">
            <span className="chip">
              <Users size={14} /> Our culture
            </span>
            <h2>Small team, big heart</h2>
          </div>
          <div
            className="widget"
            style={{ maxWidth: '760px', margin: '0 auto', padding: '2rem', lineHeight: 1.8 }}
          >
            <p style={{ color: 'var(--text-2)', fontSize: '1.02rem' }}>
              We are 28 people spread across 12 cities in India. Our average age is 27.
              Most of us were once students who struggled with interviews ourselves — the
              anxiety before a campus placement, the resume that kept getting rejected by
              ATS filters, the feeling of not knowing what to say when the interviewer
              asked {"\"tell me about yourself.\""} That is not a company origin story we
              rehearsed; it is the lived experience of the people writing the code,
              designing the screens, and shaping the product every day.
            </p>
            <p style={{ color: 'var(--text-2)', fontSize: '1.02rem', marginTop: '1rem' }}>
              We build with empathy because we remember what it felt like. We ship fast
              because students preparing for placements cannot wait for quarterly roadmaps.
              We disagree openly and honestly, but we always come back to the same
              question: does this help a student walk into their next interview with more
              confidence? If the answer is yes, we build it. If not, we move on.
            </p>
            <div
              style={{
                display: 'flex',
                gap: '2rem',
                marginTop: '1.8rem',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div className="grad-text" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem' }}>
                  28
                </div>
                <div style={{ fontSize: '.84rem', color: 'var(--text-3)' }}>Team members</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="grad-text" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem' }}>
                  12
                </div>
                <div style={{ fontSize: '.84rem', color: 'var(--text-3)' }}>Cities</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="grad-text" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem' }}>
                  27
                </div>
                <div style={{ fontSize: '.84rem', color: 'var(--text-3)' }}>Avg. age</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="grad-text" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem' }}>
                  0
                </div>
                <div style={{ fontSize: '.84rem', color: 'var(--text-3)' }}>Pointless meetings/week</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== CTA ==================== */}
      <section>
        <div className="container">
          <div
            className="widget"
            style={{
              maxWidth: '680px',
              margin: '0 auto',
              textAlign: 'center',
              padding: '3rem 2rem',
            }}
          >
            <div className="feat-icon" style={{ margin: '0 auto 1.2rem' }}>
              <Mail size={24} />
            </div>
            <h2 style={{ fontSize: 'clamp(1.4rem, 2.8vw, 1.8rem)', marginBottom: '.8rem' }}>
              Don&rsquo;t see your role?
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '1rem', maxWidth: '28rem', margin: '0 auto 1.6rem' }}>
              We are always looking for passionate people who care about education
              and technology. Send us a note about what you would love to work on —
              we read every email.
            </p>
            <Link
              href="mailto:careers@interviewace.ai"
              className="btn btn-primary"
              style={{ margin: '0 auto' }}
            >
              <Mail size={18} /> careers@interviewace.ai
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

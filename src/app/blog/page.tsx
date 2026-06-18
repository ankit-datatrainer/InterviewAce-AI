import Link from 'next/link';
import Footer from '@/components/Footer';
import {
  Calendar,
  Clock,
  ArrowRight,
  Mail,
  BookOpen,
  Sparkles,
  Send,
  User,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const FEATURED_POST = {
  tag: 'Success Story',
  tagColor: 'green',
  title: 'How I went from 0 interview calls to 4 offers in 60 days',
  excerpt:
    'When Priya graduated from a tier-2 college in Pune, her inbox was painfully empty. No calls, no shortlists, nothing. She rewrote her resume three times, but kept getting the same silence. Then she found InterviewAce. Over the next two months she ran 30+ AI mock interviews, rebuilt her resume with ATS-optimized keywords, and booked two coaching sessions that fixed her introduction and body language. By day 60, she had four offer letters on her desk — including one from a Big 4 consulting firm. This is the unfiltered story of what she did differently, week by week.',
  author: 'Priya Sharma',
  date: 'Jun 8, 2026',
  readTime: '8 min read',
};

const BLOG_POSTS = [
  {
    tag: 'Interview Tips',
    tagColor: 'blue',
    title: '10 HR interview questions every fresher gets wrong',
    excerpt:
      'Most freshers memorize textbook answers to "Tell me about yourself" and "Where do you see yourself in 5 years." Recruiters can spot these rehearsed responses in seconds. Here are the real answers they want to hear.',
    date: 'Jun 5, 2026',
    readTime: '5 min read',
  },
  {
    tag: 'Resume',
    tagColor: 'amber',
    title: 'What recruiters actually see when they scan your resume in 6 seconds',
    excerpt:
      'The average recruiter spends six seconds on a resume before deciding yes or no. We tracked eye movements across 200 HR professionals to find out exactly where they look first — and what makes them stop.',
    date: 'Jun 2, 2026',
    readTime: '6 min read',
  },
  {
    tag: 'Strategy',
    tagColor: 'red',
    title: "The STAR method is overrated — here's what actually works",
    excerpt:
      'STAR (Situation, Task, Action, Result) is the most recommended interview framework on the internet. But top candidates use a subtly different structure that sounds more natural and lands much harder.',
    date: 'May 28, 2026',
    readTime: '7 min read',
  },
  {
    tag: 'Career',
    tagColor: 'green',
    title: 'Why your ATS score matters more than your CGPA',
    excerpt:
      'Companies like TCS, Infosys, and Wipro now filter 80% of applications through software before a human ever reads them. If your resume scores below 70, your 9.2 CGPA is invisible.',
    date: 'May 24, 2026',
    readTime: '4 min read',
  },
  {
    tag: 'Communication',
    tagColor: 'blue',
    title: 'Body language mistakes that cost you the job (and how to fix them)',
    excerpt:
      'Fidgeting with your pen, breaking eye contact every three seconds, crossing your arms — these silent signals tell the interviewer more than your words do. A communication coach breaks down the five worst habits.',
    date: 'May 20, 2026',
    readTime: '5 min read',
  },
  {
    tag: 'Success Story',
    tagColor: 'green',
    title: 'From tier-3 college to Big 4: A placement guide nobody talks about',
    excerpt:
      'Rohit studied at a college most recruiters have never heard of. No campus placements, no alumni network, no referrals. Eighteen months later he was working at EY. This is his step-by-step playbook.',
    date: 'May 15, 2026',
    readTime: '10 min read',
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function BlogPage() {
  return (
    <>
      {/* ==================== HERO ==================== */}
      <section className="hero" style={{ paddingBottom: '48px' }}>
        <div className="container">
          <div className="sec-head" style={{ marginBottom: 0 }}>
            <span className="chip">
              <BookOpen size={14} /> Blog
            </span>
            <h1 style={{ fontSize: 'clamp(2rem, 4.2vw, 3.2rem)', marginTop: '1rem' }}>
              InterviewAce <span className="grad-text">Blog</span>
            </h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-2)', maxWidth: '34rem', margin: '0.8rem auto 0' }}>
              Tips, guides and stories to help you crack your next interview.
            </p>
          </div>
        </div>
      </section>

      {/* ==================== FEATURED POST ==================== */}
      <section style={{ paddingTop: 0 }}>
        <div className="container">
          <Link href="#" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
            <div
              className="feat-card"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                padding: '2.4rem',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <span className={`tag ${FEATURED_POST.tagColor}`}>{FEATURED_POST.tag}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', color: 'var(--text-3)' }}>
                    <Calendar size={13} /> {FEATURED_POST.date}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', color: 'var(--text-3)' }}>
                    <Clock size={13} /> {FEATURED_POST.readTime}
                  </span>
                </div>

                <h2 style={{ fontSize: 'clamp(1.4rem, 2.8vw, 1.9rem)', marginBottom: '0.9rem', lineHeight: 1.3 }}>
                  {FEATURED_POST.title}
                </h2>

                <p style={{ color: 'var(--text-2)', fontSize: '0.96rem', lineHeight: 1.7, maxWidth: '52rem', marginBottom: '1.3rem' }}>
                  {FEATURED_POST.excerpt}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'var(--grad)',
                        display: 'grid',
                        placeItems: 'center',
                        color: '#fff',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                      }}
                    >
                      PS
                    </div>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{FEATURED_POST.author}</span>
                  </div>

                  <span
                    className="btn btn-ghost btn-sm"
                    style={{ pointerEvents: 'none' }}
                  >
                    Read full story <ArrowRight size={15} />
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* ==================== BLOG GRID ==================== */}
      <section style={{ paddingTop: '24px' }}>
        <div className="container">
          <div className="sec-head">
            <span className="chip">
              <Sparkles size={14} /> Latest posts
            </span>
            <h2>Read, learn, prepare</h2>
            <p>Practical advice from coaches, hiring managers and students who have been in your shoes.</p>
          </div>

          <div className="coach-grid">
            {BLOG_POSTS.map((post) => (
              <Link href="#" key={post.title} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="feat-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <span className={`tag ${post.tagColor}`}>{post.tag}</span>
                    </div>

                    <h3 style={{ fontSize: '1.08rem', marginBottom: '0.55rem', lineHeight: 1.35 }}>
                      {post.title}
                    </h3>

                    <p
                      style={{
                        color: 'var(--text-2)',
                        fontSize: '0.88rem',
                        lineHeight: 1.6,
                        flex: 1,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {post.excerpt}
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '1.1rem',
                        paddingTop: '0.85rem',
                        borderTop: '1px solid var(--line)',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', fontSize: '0.78rem', color: 'var(--text-3)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Calendar size={12} /> {post.date}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Clock size={12} /> {post.readTime}
                        </span>
                      </div>

                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        Read more <ArrowRight size={13} />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== NEWSLETTER CTA ==================== */}
      <section style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="container">
          <div
            className="feat-card"
            style={{
              maxWidth: '680px',
              margin: '0 auto',
              textAlign: 'center',
              padding: '2.8rem 2rem',
            }}
          >
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'var(--grad)',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  margin: '0 auto 1.2rem',
                  boxShadow: '0 10px 24px -8px rgba(37,99,235,.55)',
                }}
              >
                <Mail size={24} />
              </div>

              <h3 style={{ fontSize: '1.35rem', marginBottom: '0.5rem' }}>
                Get interview tips in your inbox every Thursday
              </h3>
              <p style={{ color: 'var(--text-2)', fontSize: '0.92rem', marginBottom: '1.5rem', maxWidth: '28rem', margin: '0 auto 1.5rem' }}>
                One actionable tip, one resource, zero spam. Join 4,000+ students who read it every week.
              </p>

              <form
                style={{
                  display: 'flex',
                  gap: '0.6rem',
                  maxWidth: '440px',
                  margin: '0 auto',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                }}
                action="#"
              >
                <div className="field" style={{ flex: 1, minWidth: '220px', marginBottom: 0 }}>
                  <input
                    type="email"
                    placeholder="you@email.com"
                    required
                    style={{ textAlign: 'center' }}
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  <Send size={15} /> Subscribe
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

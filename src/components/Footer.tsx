import Link from 'next/link';


export default function Footer() {
  return (
    <footer>
      <div className="container">
        {/* Award-Level Showcase Banner */}
        <div className="award-footer-showcase">
          <div className="award-footer-left">
            <div className="award-footer-trophy-box">🏆</div>
            <div>
              <div className="award-footer-title">
                <span>Global EdTech Excellence Award 2026</span>
                <span className="winner-tag">Level 10 Diamond</span>
              </div>
              <p className="award-footer-desc">
                Ranked #1 AI Career Practice Arena &middot; Over 500,000+ candidate practice loops completed worldwide.
              </p>
            </div>
          </div>
          <div className="award-footer-badges">
            <div className="award-laurel-badge">
              <span>🌟</span>
              <span>Awwwards EdTech Winner</span>
            </div>
            <div className="award-laurel-badge" style={{ animationDelay: '1.2s' }}>
              <span>🎖️</span>
              <span>4.98/5 Contender Rating</span>
            </div>
          </div>
        </div>

        <div className="foot-grid">
          <div>
            <Link href="/" className="logo" style={{ marginBottom: '1rem', display: 'flex' }}>
              <span className="logo-wordmark">Interview<span className="logo-ace">Ace</span></span>
              <span className="logo-badge">AI</span>
            </Link>
            <p style={{ color: 'var(--text-2)', fontSize: '.88rem', maxWidth: '18rem', marginTop: '.8rem' }}>
              AI mock interviews, ATS resume analysis and expert coaching — built to make every student employable.
            </p>
          </div>

          <div>
            <h5>Product</h5>
            <Link href="/dashboard/interview">Mock interviews</Link>
            <Link href="/dashboard/ats">Resume analyzer</Link>
            <Link href="/dashboard/coaching">Coaching</Link>
          </div>

          <div>
            <h5>Company</h5>
            <Link href="/about">About us</Link>
            <Link href="/careers">Careers</Link>
            <Link href="/blog">Blog</Link>
          </div>

          <div>
            <h5>Support</h5>
            <Link href="/#contact">Contact</Link>
            <Link href="/#faq">FAQ</Link>
            <Link href="/privacy">Privacy policy</Link>
            <Link href="/terms">Terms of service</Link>
          </div>
        </div>

        <div className="foot-bottom">
          <span>&copy; 2026 InterviewAce AI. All rights reserved.</span>
          <span>
            Made with 💙 for job seekers everywhere
          </span>
        </div>
      </div>
    </footer>
  );
}

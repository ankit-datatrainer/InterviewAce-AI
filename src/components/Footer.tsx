import Link from 'next/link';


export default function Footer() {
  return (
    <footer>
      <div className="container">
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
            <Link href="/#pricing">Pricing</Link>
          </div>

          <div>
            <h5>Company</h5>
            <Link href="/about">About us</Link>
            <Link href="/careers">Careers</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/admin">Admin demo</Link>
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

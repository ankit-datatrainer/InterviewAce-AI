import Link from 'next/link';
import Footer from '@/components/Footer';

export default function PrivacyPolicy() {
  return (
    <>
    <section className="hero" style={{ paddingBottom: '88px' }}>
      <div className="container">
        <div className="sec-head">
          <span className="chip">Legal</span>
          <h2>Privacy Policy</h2>
          <p>Last updated: June 1, 2026</p>
        </div>

        <div className="widget" style={{ maxWidth: '860px', margin: '0 auto', padding: 'clamp(1.4rem, 4vw, 2.4rem)', overflowWrap: 'break-word' }}>

          {/* Introduction */}
          <h3 style={{ fontSize: '1.2rem', marginBottom: '.6rem' }}>Introduction</h3>
          <p style={{ color: 'var(--text-2)', fontSize: '.94rem', marginBottom: '1.6rem' }}>
            InterviewAce AI (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the website{' '}
            <strong>interviewace.ai</strong> and associated services. This Privacy Policy explains
            how we collect, use, store, and protect your personal information when you use our
            platform. We are committed to being transparent about our data practices and giving you
            control over your information. By using InterviewAce AI, you agree to the practices
            described in this policy.
          </p>

          {/* Information We Collect */}
          <h3 style={{ fontSize: '1.2rem', marginBottom: '.6rem' }}>Information We Collect</h3>
          <p style={{ color: 'var(--text-2)', fontSize: '.94rem', marginBottom: '.8rem' }}>
            We collect the following types of information to provide and improve our services:
          </p>

          <h4 style={{ fontSize: '1rem', marginBottom: '.4rem' }}>Account Information</h4>
          <ul style={{ color: 'var(--text-2)', fontSize: '.92rem', marginBottom: '1rem', paddingLeft: '1.4rem', listStyle: 'disc', display: 'grid', gap: '.35rem' }}>
            <li>Full name, email address, and phone number</li>
            <li>College or university name, course, and graduation year</li>
            <li>Profile details such as target role and experience level</li>
          </ul>

          <h4 style={{ fontSize: '1rem', marginBottom: '.4rem' }}>Resume Data</h4>
          <ul style={{ color: 'var(--text-2)', fontSize: '.92rem', marginBottom: '1rem', paddingLeft: '1.4rem', listStyle: 'disc', display: 'grid', gap: '.35rem' }}>
            <li>Uploaded resume files (PDF, DOC, DOCX)</li>
            <li>Parsed content including skills, experience, education, and projects</li>
            <li>ATS analysis results and improvement history</li>
          </ul>

          <h4 style={{ fontSize: '1rem', marginBottom: '.4rem' }}>Interview Data</h4>
          <ul style={{ color: 'var(--text-2)', fontSize: '.92rem', marginBottom: '1rem', paddingLeft: '1.4rem', listStyle: 'disc', display: 'grid', gap: '.35rem' }}>
            <li>Audio and video recordings of mock interview sessions</li>
            <li>Interview transcripts and AI-generated follow-up questions</li>
            <li>Performance scores, feedback, and metric breakdowns</li>
          </ul>

          <h4 style={{ fontSize: '1rem', marginBottom: '.4rem' }}>Usage Data</h4>
          <ul style={{ color: 'var(--text-2)', fontSize: '.92rem', marginBottom: '1rem', paddingLeft: '1.4rem', listStyle: 'disc', display: 'grid', gap: '.35rem' }}>
            <li>Pages visited, features used, and session duration</li>
            <li>Device type, browser, operating system, and IP address</li>
            <li>Referring URLs and general geographic region</li>
          </ul>

          <h4 style={{ fontSize: '1rem', marginBottom: '.4rem' }}>Payment Information</h4>
          <p style={{ color: 'var(--text-2)', fontSize: '.92rem', marginBottom: '1.6rem' }}>
            Payments are processed securely by <strong>Stripe</strong>. We never store your credit
            card number, CVV, or full card details on our servers. We only retain a transaction
            reference, billing email, and subscription status for our records.
          </p>

          {/* How We Use Your Data */}
          <h3 style={{ fontSize: '1.2rem', marginBottom: '.6rem' }}>How We Use Your Data</h3>
          <p style={{ color: 'var(--text-2)', fontSize: '.94rem', marginBottom: '.8rem' }}>
            We use the information we collect for the following purposes:
          </p>
          <ul style={{ color: 'var(--text-2)', fontSize: '.92rem', marginBottom: '1.6rem', paddingLeft: '1.4rem', listStyle: 'disc', display: 'grid', gap: '.35rem' }}>
            <li>
              <strong>Provide and improve our services</strong> &mdash; powering AI mock interviews,
              resume analysis, performance analytics, and coaching features
            </li>
            <li>
              <strong>Generate interview feedback and analytics</strong> &mdash; producing
              scorecards, skill-gap analysis, and personalised improvement recommendations
            </li>
            <li>
              <strong>Match you with relevant coaches</strong> &mdash; suggesting coaches based on
              your target role, skill gaps, and preferences
            </li>
            <li>
              <strong>Send service updates and career tips</strong> &mdash; keeping you informed
              about new features, interview tips, and relevant opportunities. You can opt out of
              non-essential emails at any time from your account settings
            </li>
            <li>
              <strong>Aggregate anonymized data for platform improvements</strong> &mdash; analysing
              usage patterns in aggregate (with all personally identifiable information removed) to
              improve question quality, AI accuracy, and overall user experience
            </li>
          </ul>

          {/* Data Storage & Security */}
          <h3 style={{ fontSize: '1.2rem', marginBottom: '.6rem' }}>Data Storage &amp; Security</h3>
          <p style={{ color: 'var(--text-2)', fontSize: '.94rem', marginBottom: '.8rem' }}>
            We take the security of your data seriously and implement industry-standard safeguards:
          </p>
          <ul style={{ color: 'var(--text-2)', fontSize: '.92rem', marginBottom: '.8rem', paddingLeft: '1.4rem', listStyle: 'disc', display: 'grid', gap: '.35rem' }}>
            <li>
              All data is stored on <strong>encrypted servers hosted on AWS (India region)</strong>,
              ensuring low latency and compliance with local data residency expectations
            </li>
            <li>
              Data at rest is protected with <strong>AES-256 encryption</strong>; data in transit is
              secured with <strong>TLS 1.3</strong>
            </li>
            <li>Access to production systems is restricted to authorised personnel with multi-factor authentication</li>
            <li>We conduct regular security audits and vulnerability assessments</li>
          </ul>

          <h4 style={{ fontSize: '1rem', marginBottom: '.4rem' }}>Retention Periods</h4>
          <ul style={{ color: 'var(--text-2)', fontSize: '.92rem', marginBottom: '1.6rem', paddingLeft: '1.4rem', listStyle: 'disc', display: 'grid', gap: '.35rem' }}>
            <li>
              <strong>Interview recordings:</strong> retained for 90 days on Free and Pro plans, and
              12 months on Premium. You can download or delete recordings at any time.
            </li>
            <li>
              <strong>Resumes:</strong> retained while your account is active. Deleted permanently
              when you delete your account.
            </li>
            <li>
              <strong>Account data:</strong> retained while your account is active and for up to 30
              days after deletion to allow for recovery if requested.
            </li>
          </ul>

          {/* Data Sharing */}
          <h3 style={{ fontSize: '1.2rem', marginBottom: '.6rem' }}>Data Sharing</h3>
          <p style={{ color: 'var(--text-2)', fontSize: '.94rem', marginBottom: '.8rem' }}>
            Your trust is non-negotiable. Here is exactly how we handle data sharing:
          </p>
          <ul style={{ color: 'var(--text-2)', fontSize: '.92rem', marginBottom: '1.6rem', paddingLeft: '1.4rem', listStyle: 'disc', display: 'grid', gap: '.35rem' }}>
            <li>
              <strong>We NEVER sell your personal data</strong> to employers, recruiters, or any
              third party &mdash; under any circumstances
            </li>
            <li>
              <strong>Coaches</strong> only see the data you explicitly choose to share during a
              booked session (such as your resume or a specific interview recording). They cannot
              access your full account or history
            </li>
            <li>
              <strong>Service providers</strong> &mdash; we work with trusted partners including
              Stripe (payments), AWS (hosting), and analytics tools, all of which operate under
              strict Data Processing Agreements (DPAs) and are contractually prohibited from using
              your data for their own purposes
            </li>
            <li>
              <strong>Legal obligations</strong> &mdash; we may disclose data if required by law,
              regulation, or valid legal process, and we will notify you where legally permitted
            </li>
          </ul>

          {/* Your Rights */}
          <h3 style={{ fontSize: '1.2rem', marginBottom: '.6rem' }}>Your Rights</h3>
          <p style={{ color: 'var(--text-2)', fontSize: '.94rem', marginBottom: '.8rem' }}>
            You are in control of your data. Here is what you can do at any time:
          </p>
          <ul style={{ color: 'var(--text-2)', fontSize: '.92rem', marginBottom: '1.6rem', paddingLeft: '1.4rem', listStyle: 'disc', display: 'grid', gap: '.35rem' }}>
            <li>
              <strong>Download your data</strong> &mdash; export all your personal data, interview
              history, and analytics from Settings at any time
            </li>
            <li>
              <strong>Delete your account</strong> &mdash; permanently delete your account and all
              associated data (resumes, recordings, transcripts, scores) from Settings. This action
              is irreversible after the 30-day recovery window
            </li>
            <li>
              <strong>Opt out of marketing emails</strong> &mdash; unsubscribe from promotional
              emails using the link at the bottom of any email, or toggle preferences in your
              account settings. Transactional emails (password resets, billing receipts) will still
              be sent
            </li>
            <li>
              <strong>Request data correction</strong> &mdash; if any of your personal information
              is inaccurate, contact us and we will correct it promptly
            </li>
          </ul>

          {/* Cookies */}
          <h3 style={{ fontSize: '1.2rem', marginBottom: '.6rem' }}>Cookies</h3>
          <p style={{ color: 'var(--text-2)', fontSize: '.94rem', marginBottom: '1.6rem' }}>
            We use <strong>essential cookies only</strong> to keep you signed in, remember your
            preferences (such as theme selection), and ensure the platform functions correctly. We
            do not use third-party tracking cookies, and we do not serve targeted advertisements.
            No cookie consent banner is needed because we do not use optional or analytics cookies
            that track you across websites.
          </p>

          {/* Changes to This Policy */}
          <h3 style={{ fontSize: '1.2rem', marginBottom: '.6rem' }}>Changes to This Policy</h3>
          <p style={{ color: 'var(--text-2)', fontSize: '.94rem', marginBottom: '1.6rem' }}>
            We may update this Privacy Policy from time to time to reflect changes in our practices,
            technology, or legal requirements. If we make material changes, we will notify you by
            email at the address associated with your account and update the &quot;Last updated&quot;
            date at the top of this page. We encourage you to review this policy periodically.
          </p>

          {/* Contact */}
          <h3 style={{ fontSize: '1.2rem', marginBottom: '.6rem' }}>Contact Us</h3>
          <p style={{ color: 'var(--text-2)', fontSize: '.94rem', marginBottom: '.5rem' }}>
            If you have questions, concerns, or requests regarding this Privacy Policy or your
            personal data, please reach out to us:
          </p>
          <ul style={{ color: 'var(--text-2)', fontSize: '.92rem', marginBottom: '1rem', paddingLeft: '1.4rem', listStyle: 'disc', display: 'grid', gap: '.35rem' }}>
            <li>
              <strong>Privacy inquiries:</strong>{' '}
              <a href="mailto:privacy@interviewace.ai" style={{ color: 'var(--blue)' }}>
                privacy@interviewace.ai
              </a>
            </li>
            <li>
              <strong>General support:</strong>{' '}
              <a href="mailto:support@interviewace.ai" style={{ color: 'var(--blue)' }}>
                support@interviewace.ai
              </a>
            </li>
          </ul>
          <p style={{ color: 'var(--text-2)', fontSize: '.92rem' }}>
            We aim to respond to all privacy-related requests within 48 hours.
          </p>

        </div>
      </div>
    </section>

    <Footer />
    </>
  );
}

import type { Metadata } from 'next';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Terms of Service — InterviewAce AI',
  description:
    'Terms of Service for InterviewAce AI. Read our terms and conditions governing the use of our AI-powered interview preparation platform.',
};

export default function TermsOfService() {
  return (
    <>
      <section className="hero" style={{ paddingBottom: '60px' }}>
        <div className="container">
          <div className="sec-head">
            <span className="chip">Legal</span>
            <h2>Terms of Service</h2>
            <p>Effective date: June 1, 2026</p>
          </div>

          <div className="widget" style={{ maxWidth: '860px', margin: '0 auto', padding: 'clamp(1.4rem, 4vw, 2.4rem)', overflowWrap: 'break-word' }}>

            {/* 1. Acceptance */}
            <h3 style={{ fontSize: '1.18rem', marginBottom: '.6rem' }}>1. Acceptance of Terms</h3>
            <p style={{ color: 'var(--text-2)', fontSize: '.93rem', marginBottom: '1.6rem', lineHeight: 1.7 }}>
              By accessing or using InterviewAce AI (the &ldquo;Platform&rdquo;), available at{' '}
              <strong>interviewace.ai</strong>, you agree to be bound by these Terms of Service
              (&ldquo;Terms&rdquo;). If you do not agree with any part of these Terms, you must
              not use the Platform. We may update these Terms from time to time, and continued use
              of the Platform after changes are posted constitutes your acceptance of the revised
              Terms.
            </p>

            {/* 2. Eligibility */}
            <h3 style={{ fontSize: '1.18rem', marginBottom: '.6rem' }}>2. Eligibility</h3>
            <p style={{ color: 'var(--text-2)', fontSize: '.93rem', marginBottom: '.6rem', lineHeight: 1.7 }}>
              You must be at least <strong>16 years of age</strong> to create an account and use
              InterviewAce AI. If you are under 18 years old, we strongly recommend that a parent
              or guardian is aware of and consents to your use of the Platform.
            </p>
            <p style={{ color: 'var(--text-2)', fontSize: '.93rem', marginBottom: '1.6rem', lineHeight: 1.7 }}>
              InterviewAce AI is a service based in India and primarily designed for students,
              graduates, and early-career professionals preparing for the Indian job market,
              although users from other regions are welcome to use the Platform.
            </p>

            {/* 3. Account Responsibilities */}
            <h3 style={{ fontSize: '1.18rem', marginBottom: '.6rem' }}>3. Account Responsibilities</h3>
            <p style={{ color: 'var(--text-2)', fontSize: '.93rem', marginBottom: '.6rem', lineHeight: 1.7 }}>
              When you register for an account, you agree to the following:
            </p>
            <ul style={{ color: 'var(--text-2)', fontSize: '.93rem', marginBottom: '1.6rem', lineHeight: 1.85, paddingLeft: '1.3rem' }}>
              <li>You will provide accurate, current, and complete registration information.</li>
              <li>You will keep your login credentials confidential and secure at all times.</li>
              <li>You will maintain only one account per person. Duplicate or shared accounts may be suspended without notice.</li>
              <li>You are solely responsible for all activity that occurs under your account, whether or not you authorized it.</li>
            </ul>

            {/* 4. Services */}
            <h3 style={{ fontSize: '1.18rem', marginBottom: '.6rem' }}>4. Services Provided</h3>
            <p style={{ color: 'var(--text-2)', fontSize: '.93rem', marginBottom: '.6rem', lineHeight: 1.7 }}>
              InterviewAce AI offers the following services, each subject to these Terms:
            </p>

            <h4 style={{ fontSize: '.98rem', marginBottom: '.35rem', marginTop: '.8rem' }}>4.1 AI Mock Interviews</h4>
            <p style={{ color: 'var(--text-2)', fontSize: '.93rem', marginBottom: '.8rem', lineHeight: 1.7 }}>
              The Platform provides simulated interview sessions powered by artificial intelligence.
              These are practice exercises designed to help you improve your interview skills. They
              are <strong>not</strong> real job interviews and do not represent any employer,
              recruiter, or hiring process.
            </p>

            <h4 style={{ fontSize: '.98rem', marginBottom: '.35rem' }}>4.2 ATS Resume Analyzer</h4>
            <p style={{ color: 'var(--text-2)', fontSize: '.93rem', marginBottom: '.8rem', lineHeight: 1.7 }}>
              Our resume analysis tool evaluates your resume against common applicant tracking
              system (ATS) algorithms and provides an estimated compatibility score along with
              improvement suggestions. This is <strong>guidance only</strong> and does not
              guarantee that your resume will pass any specific employer&rsquo;s ATS or result in
              interview calls.
            </p>

            <h4 style={{ fontSize: '.98rem', marginBottom: '.35rem' }}>4.3 Coaching Marketplace</h4>
            <p style={{ color: 'var(--text-2)', fontSize: '.93rem', marginBottom: '.8rem', lineHeight: 1.7 }}>
              The Platform connects you with career coaches for one-on-one sessions. Coaches
              listed on InterviewAce AI are <strong>independent professionals</strong>, not
              employees or agents of InterviewAce AI. We facilitate the connection and handle
              payments, but the coaching relationship is between you and the coach.
            </p>

            <h4 style={{ fontSize: '.98rem', marginBottom: '.35rem' }}>4.4 Progress Analytics</h4>
            <p style={{ color: 'var(--text-2)', fontSize: '.93rem', marginBottom: '1.6rem', lineHeight: 1.7 }}>
              We provide dashboards and performance reports that track your interview scores,
              communication metrics, and skill development over time. These analytics are intended
              to help you identify areas for improvement and measure your growth.
            </p>

            {/* 5. Subscriptions & Payments */}
            <h3 style={{ fontSize: '1.18rem', marginBottom: '.6rem' }}>5. Subscriptions &amp; Payments</h3>

            <h4 style={{ fontSize: '.98rem', marginBottom: '.35rem', marginTop: '.8rem' }}>5.1 Plans</h4>
            <p style={{ color: 'var(--text-2)', fontSize: '.93rem', marginBottom: '.6rem', lineHeight: 1.7 }}>
              InterviewAce AI offers the following subscription tiers:
            </p>
            <ul style={{ color: 'var(--text-2)', fontSize: '.93rem', marginBottom: '.8rem', lineHeight: 1.85, paddingLeft: '1.3rem' }}>
              <li><strong>Free</strong> &mdash; Limited features at no cost. No payment information required.</li>
              <li><strong>Pro</strong> &mdash; &#8377;499 per month (or &#8377;399 per month when billed yearly).</li>
              <li><strong>Premium</strong> &mdash; &#8377;999 per month (or &#8377;799 per month when billed yearly).</li>
            </ul>

            <h4 style={{ fontSize: '.98rem', marginBottom: '.35rem' }}>5.2 Payment Processing</h4>
            <p style={{ color: 'var(--text-2)', fontSize: '.93rem', marginBottom: '.8rem', lineHeight: 1.7 }}>
              All payments are processed securely through <strong>Stripe</strong>. We accept UPI,
              debit cards, credit cards, and other payment methods supported by Stripe in your
              region. InterviewAce AI does not store your full payment details on our servers.
            </p>

            <h4 style={{ fontSize: '.98rem', marginBottom: '.35rem' }}>5.3 Cancellation</h4>
            <p style={{ color: 'var(--text-2)', fontSize: '.93rem', marginBottom: '.8rem', lineHeight: 1.7 }}>
              You may cancel your subscription at any time from your account settings. Upon
              cancellation, you will retain access to your paid plan&rsquo;s features until the
              end of the current billing period. No prorated refunds are issued for partial
              billing periods.
            </p>

            <h4 style={{ fontSize: '.98rem', marginBottom: '.35rem' }}>5.4 Refunds</h4>
            <p style={{ color: 'var(--text-2)', fontSize: '.93rem', marginBottom: '1.6rem', lineHeight: 1.7 }}>
              Refund requests are considered on a <strong>case-by-case basis</strong> within 7
              days of your first purchase only. To request a refund, contact us at{' '}
              <a href="mailto:support@interviewace.ai" style={{ color: 'var(--blue)', textDecoration: 'underline' }}>
                support@interviewace.ai
              </a>
              . Refunds are not available for coaching sessions that have already been completed.
            </p>

            {/* 6. Content & Conduct */}
            <h3 style={{ fontSize: '1.18rem', marginBottom: '.6rem' }}>6. Content &amp; Conduct</h3>
            <p style={{ color: 'var(--text-2)', fontSize: '.93rem', marginBottom: '.6rem', lineHeight: 1.7 }}>
              When using InterviewAce AI, you agree <strong>not</strong> to:
            </p>
            <ul style={{ color: 'var(--text-2)', fontSize: '.93rem', marginBottom: '1.6rem', lineHeight: 1.85, paddingLeft: '1.3rem' }}>
              <li>Upload content that is harmful, offensive, defamatory, illegal, or infringes on another person&rsquo;s rights &mdash; including submitting someone else&rsquo;s resume as your own.</li>
              <li>Attempt to reverse-engineer, decompile, or extract the underlying AI models, algorithms, or source code of the Platform.</li>
              <li>Harass, intimidate, or behave inappropriately toward coaches, other users, or InterviewAce AI staff.</li>
              <li>Use the Platform for any fraudulent purpose, including misrepresenting your identity, qualifications, or interview performance to potential employers.</li>
            </ul>

            {/* 7. Intellectual Property */}
            <h3 style={{ fontSize: '1.18rem', marginBottom: '.6rem' }}>7. Intellectual Property</h3>
            <p style={{ color: 'var(--text-2)', fontSize: '.93rem', marginBottom: '.6rem', lineHeight: 1.7 }}>
              The Platform, including its AI models, user interface design, branding, content,
              and underlying technology, is the intellectual property of InterviewAce AI and is
              protected by applicable copyright and intellectual property laws.
            </p>
            <p style={{ color: 'var(--text-2)', fontSize: '.93rem', marginBottom: '.6rem', lineHeight: 1.7 }}>
              <strong>Your content:</strong> Resumes, documents, and interview recordings that you
              upload or create on the Platform remain your property. You grant InterviewAce AI a
              limited license to process this content solely for the purpose of delivering our
              services to you.
            </p>
            <p style={{ color: 'var(--text-2)', fontSize: '.93rem', marginBottom: '1.6rem', lineHeight: 1.7 }}>
              <strong>Generated feedback:</strong> Scores, feedback reports, and AI-generated
              suggestions are licensed to you for <strong>personal, non-commercial use</strong>.
              You may not redistribute or sell these outputs.
            </p>

            {/* 8. Coaching Sessions */}
            <h3 style={{ fontSize: '1.18rem', marginBottom: '.6rem' }}>8. Coaching Sessions</h3>
            <ul style={{ color: 'var(--text-2)', fontSize: '.93rem', marginBottom: '1.6rem', lineHeight: 1.85, paddingLeft: '1.3rem' }}>
              <li>Coaches on InterviewAce AI are <strong>independent contractors</strong>, not employees or representatives of InterviewAce AI.</li>
              <li>While we vet coaches for qualifications and experience, we <strong>do not guarantee</strong> specific outcomes from coaching sessions.</li>
              <li><strong>Cancellation policy:</strong> You may cancel a scheduled coaching session up to 24 hours before the session start time for a full refund. Cancellations made less than 24 hours before the session are non-refundable.</li>
              <li><strong>Session recordings:</strong> If a coaching session is recorded through the Platform, the recording is jointly owned by you and the coach. Either party may request deletion of the recording at any time.</li>
            </ul>

            {/* 9. Disclaimers */}
            <h3 style={{ fontSize: '1.18rem', marginBottom: '.6rem' }}>9. Disclaimers</h3>
            <p style={{ color: 'var(--text-2)', fontSize: '.93rem', marginBottom: '.6rem', lineHeight: 1.7 }}>
              InterviewAce AI is provided on an &ldquo;as is&rdquo; and &ldquo;as
              available&rdquo; basis. Please note the following:
            </p>
            <ul style={{ color: 'var(--text-2)', fontSize: '.93rem', marginBottom: '1.6rem', lineHeight: 1.85, paddingLeft: '1.3rem' }}>
              <li>AI-generated feedback, scores, and suggestions are <strong>guidance only</strong> and should not be treated as professional career advice, legal advice, or a substitute for human judgment.</li>
              <li>InterviewAce AI <strong>does not guarantee job placement</strong>, interview calls, or any specific employment outcome as a result of using the Platform.</li>
              <li>ATS compatibility scores are <strong>estimates</strong> based on common ATS parsing algorithms. Actual results may vary depending on the specific ATS software used by individual employers.</li>
            </ul>

            {/* 10. Limitation of Liability */}
            <h3 style={{ fontSize: '1.18rem', marginBottom: '.6rem' }}>10. Limitation of Liability</h3>
            <p style={{ color: 'var(--text-2)', fontSize: '.93rem', marginBottom: '.6rem', lineHeight: 1.7 }}>
              To the maximum extent permitted by applicable law, InterviewAce AI, its founders,
              employees, and affiliates shall not be liable for any indirect, incidental, special,
              consequential, or punitive damages arising out of or related to your use of the
              Platform. This includes, but is not limited to, loss of data, loss of revenue, or
              failure to secure employment.
            </p>
            <p style={{ color: 'var(--text-2)', fontSize: '.93rem', marginBottom: '1.6rem', lineHeight: 1.7 }}>
              In any event, our total aggregate liability to you for all claims arising from or
              related to the Platform shall not exceed the <strong>total fees you have paid to
              InterviewAce AI in the 12 months</strong> immediately preceding the event giving
              rise to the claim.
            </p>

            {/* 11. Termination */}
            <h3 style={{ fontSize: '1.18rem', marginBottom: '.6rem' }}>11. Termination</h3>
            <p style={{ color: 'var(--text-2)', fontSize: '.93rem', marginBottom: '.6rem', lineHeight: 1.7 }}>
              We reserve the right to suspend or terminate your account at any time if you
              violate these Terms, engage in abusive behavior, or use the Platform in a manner
              that could harm other users or the integrity of the service. We will make reasonable
              efforts to notify you before or at the time of suspension, except where immediate
              action is required.
            </p>
            <p style={{ color: 'var(--text-2)', fontSize: '.93rem', marginBottom: '1.6rem', lineHeight: 1.7 }}>
              You may delete your account at any time from your account settings. Upon deletion,
              your personal data will be removed in accordance with our{' '}
              <a href="/privacy" style={{ color: 'var(--blue)', textDecoration: 'underline' }}>
                Privacy Policy
              </a>
              . Deletion of your account does not entitle you to a refund for any remaining
              subscription period.
            </p>

            {/* 12. Governing Law */}
            <h3 style={{ fontSize: '1.18rem', marginBottom: '.6rem' }}>12. Governing Law &amp; Jurisdiction</h3>
            <p style={{ color: 'var(--text-2)', fontSize: '.93rem', marginBottom: '1.6rem', lineHeight: 1.7 }}>
              These Terms shall be governed by and construed in accordance with the laws of
              India. Any disputes arising out of or in connection with these Terms or the use of
              the Platform shall be subject to the exclusive jurisdiction of the courts located in{' '}
              <strong>Bangalore, Karnataka, India</strong>.
            </p>

            {/* 13. Contact */}
            <h3 style={{ fontSize: '1.18rem', marginBottom: '.6rem' }}>13. Contact Us</h3>
            <p style={{ color: 'var(--text-2)', fontSize: '.93rem', marginBottom: '.6rem', lineHeight: 1.7 }}>
              If you have any questions or concerns about these Terms of Service, please reach
              out to us:
            </p>
            <ul style={{ color: 'var(--text-2)', fontSize: '.93rem', lineHeight: 1.85, paddingLeft: '1.3rem' }}>
              <li>
                <strong>Legal inquiries:</strong>{' '}
                <a href="mailto:legal@interviewace.ai" style={{ color: 'var(--blue)', textDecoration: 'underline' }}>
                  legal@interviewace.ai
                </a>
              </li>
              <li>
                <strong>General support:</strong>{' '}
                <a href="mailto:support@interviewace.ai" style={{ color: 'var(--blue)', textDecoration: 'underline' }}>
                  support@interviewace.ai
                </a>
              </li>
              <li>
                <strong>Website:</strong>{' '}
                <a href="https://interviewace.ai" style={{ color: 'var(--blue)', textDecoration: 'underline' }}>
                  interviewace.ai
                </a>
              </li>
            </ul>

          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

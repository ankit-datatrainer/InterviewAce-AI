import nodemailer from 'nodemailer';

// Branded transactional auth emails, sent from OUR SMTP (Gmail) so they carry
// the InterviewAce AI branding instead of Supabase's default template.

export function smtpConfigured(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function transporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

// Shared shell so every auth email looks identical and on-brand.
function shell(title: string, bodyHtml: string): string {
  return `
  <div style="margin:0;padding:32px 16px;background-color:#0B1120;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:linear-gradient(160deg,#101A33,#0D1526);border:1px solid #1E2A47;border-radius:16px;padding:40px;">
      <div style="text-align:center;font-size:24px;">✦</div>
      <div style="text-align:center;margin-top:8px;font-size:11px;letter-spacing:4px;color:#7DD3FC;font-weight:bold;">INTERVIEWACE&nbsp;AI</div>
      <h1 style="text-align:center;color:#F1F5F9;font-size:22px;font-weight:600;margin:24px 0 8px;">${title}</h1>
      ${bodyHtml}
      <p style="text-align:center;color:#475569;font-size:12px;line-height:1.7;margin:28px 0 0;">
        With clarity &amp; confidence,<br><span style="color:#94A3B8;">The InterviewAce AI Team</span>
      </p>
    </div>
    <p style="max-width:520px;margin:16px auto 0;color:#334155;font-size:11px;line-height:1.6;text-align:center;">
      You received this email because someone used this address on InterviewAce AI. If this wasn't you, you can ignore it.
    </p>
  </div>`;
}

/** Sends the branded "verify your email" message with the confirmation link. */
export async function sendBrandedVerificationEmail(email: string, confirmationUrl: string): Promise<boolean> {
  if (!smtpConfigured()) return false;
  const body = `
    <p style="text-align:center;color:#94A3B8;font-size:14px;line-height:1.7;margin:0 0 24px;">
      Welcome to InterviewAce AI — your AI-powered interview preparation platform.
      Confirm your email address to activate your account.
    </p>
    <div style="text-align:center;margin:8px 0 8px;">
      <a href="${confirmationUrl}" style="display:inline-block;background:#2563EB;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:bold;padding:14px 44px;border-radius:999px;">Verify my email</a>
    </div>
    <p style="text-align:center;color:#475569;font-size:11px;word-break:break-all;margin:16px 0 0;">
      Or paste this link into your browser:<br>
      <a href="${confirmationUrl}" style="color:#7DD3FC;text-decoration:none;">${confirmationUrl}</a>
    </p>`;
  try {
    await transporter().sendMail({
      from: `"InterviewAce AI" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Verify your email — InterviewAce AI',
      html: shell('Verify your email address', body),
    });
    return true;
  } catch (e) {
    console.error('Branded verification email failed:', e);
    return false;
  }
}

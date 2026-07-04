import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Sends the coaching-session booking confirmation email to the signed-in
// student, with the schedule and the meeting (room) link.
export async function POST(req: NextRequest) {
  try {
    const { coachName, date, timeSlot, roomId } = await req.json();
    if (!coachName || !date || !timeSlot || !roomId) {
      return NextResponse.json({ error: 'Missing booking details' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    if (!smtpUser || !smtpPass) {
      return NextResponse.json({ error: 'Email is not configured on the server' }, { status: 503 });
    }

    const origin = new URL(req.url).origin;
    const meetingLink = `${origin}/dashboard/coaching/room/${roomId}`;
    const firstName = (user.user_metadata?.full_name || user.email.split('@')[0] || 'there').split(' ')[0];
    const prettyDate = new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: `"InterviewAce AI" <${smtpUser}>`,
      to: user.email,
      subject: `Your session with ${coachName} is scheduled — InterviewAce AI`,
      html: `
      <div style="margin:0;padding:32px 16px;background-color:#0B1120;font-family:Arial,Helvetica,sans-serif;">
        <div style="max-width:520px;margin:0 auto;background:linear-gradient(160deg,#101A33,#0D1526);border:1px solid #1E2A47;border-radius:16px;padding:40px;">
          <div style="text-align:center;font-size:24px;">✦</div>
          <div style="text-align:center;margin-top:8px;font-size:11px;letter-spacing:4px;color:#7DD3FC;font-weight:bold;">INTERVIEWACE&nbsp;AI</div>
          <h1 style="text-align:center;color:#F1F5F9;font-size:22px;font-weight:600;margin:24px 0 8px;">Your session link is ready</h1>
          <p style="text-align:center;color:#94A3B8;font-size:13px;line-height:1.7;margin:0 0 24px;">
            ${firstName}, your 1-on-1 coaching session with <strong style="color:#E2E8F0;">${coachName}</strong> is confirmed.
            Save this email — just click the button at your scheduled time to join.
          </p>
          <div style="background:#0B1322;border:1px solid #1E2A47;border-radius:10px;padding:4px 20px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:12px 0;color:#64748B;font-size:12px;">When</td>
                <td align="right" style="padding:12px 0;color:#E2E8F0;font-size:13px;font-weight:bold;">${prettyDate} · ${timeSlot} IST</td>
              </tr>
              <tr>
                <td style="padding:12px 0;color:#64748B;font-size:12px;border-top:1px solid #1E2A47;">Coach</td>
                <td align="right" style="padding:12px 0;color:#E2E8F0;font-size:13px;font-weight:bold;border-top:1px solid #1E2A47;">${coachName}</td>
              </tr>
            </table>
          </div>
          <div style="text-align:center;margin:28px 0 8px;">
            <a href="${meetingLink}" style="display:inline-block;background:#2563EB;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:bold;padding:13px 40px;border-radius:999px;">Join your session</a>
          </div>
          <p style="text-align:center;color:#475569;font-size:11px;word-break:break-all;margin:12px 0 0;">
            Or paste this link: <a href="${meetingLink}" style="color:#7DD3FC;text-decoration:none;">${meetingLink}</a>
          </p>
          <p style="text-align:center;color:#475569;font-size:12px;line-height:1.7;margin:28px 0 0;">
            With clarity &amp; confidence,<br><span style="color:#94A3B8;">The InterviewAce AI Team</span>
          </p>
        </div>
      </div>`,
    });

    // Also notify the coach (best-effort): look up their email in the DB,
    // falling back to the static coach list.
    try {
      let coachEmail: string | null = null;
      const { data: dbCoach } = await supabase.from('coaches').select('email').ilike('name', coachName).maybeSingle();
      coachEmail = dbCoach?.email || null;
      if (!coachEmail) {
        const { COACHES } = await import('@/lib/coaches');
        coachEmail = COACHES.find((c) => c.name.toLowerCase() === String(coachName).toLowerCase())?.email || null;
      }
      if (coachEmail) {
        await transporter.sendMail({
          from: `"InterviewAce AI" <${smtpUser}>`,
          to: coachEmail,
          subject: `New session booked: ${prettyDate} · ${timeSlot} — InterviewAce AI`,
          html: `
          <div style="margin:0;padding:32px 16px;background-color:#0B1120;font-family:Arial,Helvetica,sans-serif;">
            <div style="max-width:520px;margin:0 auto;background:linear-gradient(160deg,#101A33,#0D1526);border:1px solid #1E2A47;border-radius:16px;padding:40px;">
              <div style="text-align:center;font-size:24px;">✦</div>
              <div style="text-align:center;margin-top:8px;font-size:11px;letter-spacing:4px;color:#7DD3FC;font-weight:bold;">INTERVIEWACE&nbsp;AI</div>
              <h1 style="text-align:center;color:#F1F5F9;font-size:22px;font-weight:600;margin:24px 0 8px;">New session booked</h1>
              <p style="text-align:center;color:#94A3B8;font-size:13px;line-height:1.7;margin:0 0 24px;">
                A student just booked a 1-on-1 session with you.
              </p>
              <div style="background:#0B1322;border:1px solid #1E2A47;border-radius:10px;padding:4px 20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="padding:12px 0;color:#64748B;font-size:12px;">Student</td>
                      <td align="right" style="padding:12px 0;color:#E2E8F0;font-size:13px;font-weight:bold;">${user.user_metadata?.full_name || user.email}</td></tr>
                  <tr><td style="padding:12px 0;color:#64748B;font-size:12px;border-top:1px solid #1E2A47;">When</td>
                      <td align="right" style="padding:12px 0;color:#E2E8F0;font-size:13px;font-weight:bold;border-top:1px solid #1E2A47;">${prettyDate} · ${timeSlot} IST</td></tr>
                </table>
              </div>
              <div style="text-align:center;margin:28px 0 8px;">
                <a href="${origin}/coach/sessions" style="display:inline-block;background:#2563EB;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:bold;padding:13px 40px;border-radius:999px;">Open Coach Portal</a>
              </div>
              <p style="text-align:center;color:#94A3B8;font-size:11px;line-height:1.7;margin:20px 0 0;">
                The meeting room opens 5 minutes before the scheduled time — join from My Sessions.
              </p>
            </div>
          </div>`,
        });
      }
    } catch (e) {
      console.warn('Coach notification email failed (non-fatal):', e);
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Booking confirmation email error:', error);
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
  }
}

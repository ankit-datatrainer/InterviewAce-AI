import { NextRequest, NextResponse } from 'next/server';
import { createClient as createBareClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getServiceClient } from '@/lib/supabase-service';
import { resolveRole } from '@/lib/roles';
import { getAppOrigin } from '@/lib/get-origin';

// Super-admin only: creates a login account for a coach, links it to their
// coach row, grants the coach role, and emails them their credentials with a
// link to the login page. The coach signs in with these and lands in the
// Coach Portal automatically (role-based routing).

function generatePassword(): string {
  // 12 chars, mixed classes, unambiguous (no l/1/O/0).
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*';
  const all = upper + lower + digits + symbols;
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
  let pwd = pick(upper) + pick(lower) + pick(digits) + pick(symbols);
  for (let i = pwd.length; i < 12; i++) pwd += pick(all);
  return pwd.split('').sort(() => Math.random() - 0.5).join('');
}

export async function POST(req: NextRequest) {
  try {
    const { coachId, name, email, password: customPassword } = await req.json();
    if (!coachId || !name || !email) {
      return NextResponse.json({ error: 'coachId, name and email are required' }, { status: 400 });
    }
    // Admin may set the coach's initial password; otherwise a strong one is generated.
    if (customPassword && String(customPassword).length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    // 1) Caller must be an admin.
    const supabase = await createServerSupabaseClient();
    const { data: { user: admin } } = await supabase.auth.getUser();
    if (!admin) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', admin.id).maybeSingle();
    if (resolveRole(admin.email, adminProfile?.role) !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // 2) Create the coach's auth user.
    const password = customPassword ? String(customPassword) : generatePassword();
    const origin = getAppOrigin(req.url);
    let newUserId: string | null = null;

    const service = getServiceClient();
    if (service) {
      // Preferred: create the user already email-confirmed so the coach can log
      // in immediately with the credentials we email them — and Supabase sends
      // NO email of its own (only our branded credentials email goes out).
      const { data: created, error: createErr } = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name, user_type: 'coach' },
      });
      if (createErr) {
        const msg = String(createErr.message || '');
        if (/already|registered|exists/i.test(msg)) {
          return NextResponse.json({ error: 'That email already has an account. Use the "Link" action instead.' }, { status: 409 });
        }
        return NextResponse.json({ error: msg || 'Could not create the account.' }, { status: 400 });
      }
      newUserId = created.user?.id ?? null;
    } else {
      // Fallback (no service key yet): anon signUp. Supabase will also send its
      // own confirmation email until the service key is configured.
      const bare = createBareClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      const { data: signUpData, error: signUpError } = await bare.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${origin}/auth/verified`, data: { full_name: name, user_type: 'coach' } },
      });
      if (signUpError) return NextResponse.json({ error: signUpError.message }, { status: 400 });
      const u = signUpData.user;
      if (!u || (u.identities && u.identities.length === 0)) {
        return NextResponse.json({ error: 'That email already has an account. Use the "Link" action instead.' }, { status: 409 });
      }
      newUserId = u.id;
    }
    if (!newUserId) return NextResponse.json({ error: 'Could not create the account.' }, { status: 500 });
    const newUser = { id: newUserId };

    // 3) Grant the coach role + link the coach row (as admin, RLS allows this).
    await supabase.from('profiles').upsert({ id: newUser.id, email, full_name: name, role: 'coach' }, { onConflict: 'id' });
    await supabase.from('coaches').update({ user_id: newUser.id, email }).eq('id', coachId);

    // 4) Email the credentials + login link.
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    let emailSent = false;
    if (smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: smtpUser, pass: smtpPass } });
        const loginLink = `${origin}/login`;
        await transporter.sendMail({
          from: `"InterviewAce AI" <${smtpUser}>`,
          to: email,
          subject: 'Your Coach Portal account — InterviewAce AI',
          html: `
          <div style="margin:0;padding:32px 16px;background-color:#0B1120;font-family:Arial,Helvetica,sans-serif;">
            <div style="max-width:520px;margin:0 auto;background:linear-gradient(160deg,#101A33,#0D1526);border:1px solid #1E2A47;border-radius:16px;padding:40px;">
              <div style="text-align:center;font-size:24px;">✦</div>
              <div style="text-align:center;margin-top:8px;font-size:11px;letter-spacing:4px;color:#7DD3FC;font-weight:bold;">INTERVIEWACE&nbsp;AI</div>
              <h1 style="text-align:center;color:#F1F5F9;font-size:22px;font-weight:600;margin:24px 0 8px;">Welcome to the Coach Portal</h1>
              <p style="text-align:center;color:#94A3B8;font-size:13px;line-height:1.7;margin:0 0 24px;">
                Hi ${name}, your coach account has been created. Use the credentials below to sign in —
                you'll land directly in your Coach Portal where you can set your availability and take sessions.
              </p>
              <div style="background:#0B1322;border:1px solid #1E2A47;border-radius:10px;padding:4px 20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="padding:12px 0;color:#64748B;font-size:12px;">Username (email)</td>
                      <td align="right" style="padding:12px 0;color:#E2E8F0;font-size:13px;font-weight:bold;">${email}</td></tr>
                  <tr><td style="padding:12px 0;color:#64748B;font-size:12px;border-top:1px solid #1E2A47;">Temporary password</td>
                      <td align="right" style="padding:12px 0;color:#E2E8F0;font-size:14px;font-weight:bold;font-family:Consolas,monospace;border-top:1px solid #1E2A47;">${password}</td></tr>
                </table>
              </div>
              <div style="text-align:center;margin:28px 0 8px;">
                <a href="${loginLink}" style="display:inline-block;background:#2563EB;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:bold;padding:13px 40px;border-radius:999px;">Log in to Coach Portal</a>
              </div>
              <p style="text-align:center;color:#475569;font-size:11px;word-break:break-all;margin:12px 0 0;">
                Or paste this link: <a href="${loginLink}" style="color:#7DD3FC;text-decoration:none;">${loginLink}</a>
              </p>
              <p style="text-align:center;color:#94A3B8;font-size:11px;line-height:1.7;margin:20px 0 0;">
                First time? If you're asked to verify your email, click the verification link we sent separately, then log in.<br>
                Please change your password from Settings after your first login.
              </p>
            </div>
          </div>`,
        });
        emailSent = true;
      } catch (e) {
        console.error('Coach credentials email failed:', e);
      }
    }

    return NextResponse.json({ ok: true, emailSent });
  } catch (error: any) {
    console.error('create-account error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

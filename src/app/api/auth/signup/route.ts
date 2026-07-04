import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase-service';
import { sendBrandedVerificationEmail, smtpConfigured } from '@/lib/auth-email';
import { getAppOrigin } from '@/lib/get-origin';

// Branded signup: when the service role key + SMTP are configured, we create the
// pending user and email OUR OWN branded verification link (no Supabase
// branding). Otherwise we tell the client to fall back to the normal Supabase
// signUp flow, so nothing breaks before the key is added.
export async function POST(req: NextRequest) {
  try {
    const { email, password, metadata } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const service = getServiceClient();
    if (!service || !smtpConfigured()) {
      // Not configured for branded email — client should use supabase.auth.signUp.
      return NextResponse.json({ fallback: true });
    }

    const origin = getAppOrigin(req.url);

    // generateLink(type: 'signup') creates the pending (unconfirmed) user and
    // returns the confirmation link WITHOUT sending Supabase's own email.
    const { data, error } = await (service.auth.admin as any).generateLink({
      type: 'signup',
      email,
      password,
      options: {
        data: metadata || {},
        redirectTo: `${origin}/auth/verified`,
      },
    });

    if (error) {
      const msg = String(error.message || '');
      if (/already|registered|exists/i.test(msg)) {
        return NextResponse.json({ error: 'An account with this email already exists. Please log in.' }, { status: 409 });
      }
      // Fall back to the normal flow on unexpected admin errors.
      return NextResponse.json({ fallback: true });
    }

    const link = data?.properties?.action_link;
    if (!link) return NextResponse.json({ fallback: true });

    const sent = await sendBrandedVerificationEmail(email, link);
    if (!sent) return NextResponse.json({ fallback: true });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Branded signup error:', error);
    // Any failure → let the client fall back to the default flow.
    return NextResponse.json({ fallback: true });
  }
}

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getServiceClient } from '@/lib/supabase-service'
import { sendBrandedVerificationEmail, smtpConfigured } from '@/lib/auth-email'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return Response.json(
        { error: 'A valid email address is required.' },
        { status: 400 }
      )
    }

    const origin = new URL(request.url).origin

    // Prefer our own branded verification email when configured.
    const service = getServiceClient()
    if (service && smtpConfigured()) {
      const { data, error } = await (service.auth.admin as any).generateLink({
        type: 'signup',
        email,
        options: { redirectTo: `${origin}/auth/verified` },
      })
      const link = data?.properties?.action_link
      if (!error && link && (await sendBrandedVerificationEmail(email, link))) {
        return Response.json({ message: 'Verification email sent successfully.' })
      }
      // else fall through to the default flow below.
    }

    const supabase = await createServerSupabaseClient()

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        // Land the verification link on our success page on the current host.
        emailRedirectTo: `${origin}/auth/verified`,
      },
    })

    if (error) {
      return Response.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return Response.json({ message: 'Verification email sent successfully.' })
  } catch {
    return Response.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    )
  }
}

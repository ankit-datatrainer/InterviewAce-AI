import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return Response.json(
        { error: 'A valid email address is required.' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
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

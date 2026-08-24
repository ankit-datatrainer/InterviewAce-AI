export const dynamic = 'force-dynamic';

import { getInterviewer } from '@/lib/interview-avatars';

const LIVEAVATAR_API = 'https://api.liveavatar.com';

function avatarIdFor(personaId: string): string | undefined {
  switch (personaId) {
    case 'maya': return process.env.LIVEAVATAR_AVATAR_ID_MAYA;
    case 'ravi': return process.env.LIVEAVATAR_AVATAR_ID_RAVI;
    case 'sofia': return process.env.LIVEAVATAR_AVATAR_ID_SOFIA;
    case 'noah': return process.env.LIVEAVATAR_AVATAR_ID_NOAH;
    default: return undefined;
  }
}

export async function POST(req: Request) {
  const apiKey = process.env.LIVEAVATAR_API_KEY;
  const defaultAvatarId = process.env.LIVEAVATAR_AVATAR_ID;

  if (!apiKey || !defaultAvatarId) {
    return Response.json(
      { error: 'LiveAvatar is not configured. Set LIVEAVATAR_API_KEY and LIVEAVATAR_AVATAR_ID.' },
      { status: 503 },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const role = typeof body?.role === 'string' && body.role.trim() ? body.role.trim() : 'the target role';
    const persona = getInterviewer(body?.interviewer);

    // LITE mode is intentional: InterviewAce owns STT, the response decision
    // engine, LLM and TTS. LiveAvatar is the synchronized video layer. This
    // ensures the logic tested by /api/interview/chat is the logic candidates
    // actually experience in the live room.
    const tokenRes = await fetch(`${LIVEAVATAR_API}/v1/sessions/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
      body: JSON.stringify({
        mode: 'LITE',
        avatar_id: avatarIdFor(persona.id) || defaultAvatarId,
        video_settings: { quality: 'high', encoding: 'H264' },
      }),
    });

    if (!tokenRes.ok) {
      const details = await tokenRes.text();
      return Response.json(
        { error: 'Failed to create LiveAvatar session token', details },
        { status: tokenRes.status },
      );
    }

    const data = await tokenRes.json();
    const token = data?.data?.session_token;
    if (!token) {
      return Response.json({ error: 'LiveAvatar response did not include a session token' }, { status: 502 });
    }

    return Response.json({
      token,
      sessionId: data?.data?.session_id ?? null,
      mode: 'LITE',
      openingText: `Hello, I'm ${persona.name}, and I'll be interviewing you for the ${role} role today. Let's get started.`,
    });
  } catch (error: unknown) {
    console.error('LiveAvatar token error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  // LITE sessions do not create per-interview LiveAvatar contexts.
  return Response.json({ ok: true });
}

export const dynamic = 'force-dynamic';

// Creates a LiveAvatar FULL-mode session driven by LiveAvatar's OWN built-in
// agent (VAD → STT → LLM → TTS). We no longer generate the interview with an
// external LLM: instead we create a LiveAvatar "Context" (the interviewer's
// system prompt + opening greeting) and bind the session to it. LiveAvatar then
// autonomously listens to the candidate and speaks Alex's responses.
//
// Docs: https://docs.liveavatar.com/docs/full-mode/overview
//       https://docs.liveavatar.com/docs/core-concepts/contexts
const LIVEAVATAR_API = 'https://api.liveavatar.com';

function buildInterviewerPrompt(opts: {
  role: string;
  difficulty: string;
  customJD?: string;
  resumeText?: string;
}): string {
  const { role, difficulty, customJD, resumeText } = opts;
  return [
    `You are Alex, a warm but professional interviewer conducting a live spoken mock interview for the role of "${role}" at a "${difficulty}" difficulty level.`,
    customJD ? `Job description to base questions on:\n${customJD}` : '',
    resumeText
      ? `The candidate's resume is below. Ground your questions in their real experience and projects:\n${resumeText.slice(0, 4000)}`
      : '',
    `Rules for the conversation:`,
    `- Speak naturally, as in a real voice interview. Keep every turn short: 1-3 sentences.`,
    `- Ask ONE question at a time, then stop and wait for the candidate to answer.`,
    `- Briefly acknowledge their answer, then ask the next relevant question.`,
    `- Progress through a realistic interview: start with a warm-up, then behavioral and role-specific questions of increasing depth.`,
    `- Do NOT give long critiques or feedback during the interview, and do not read out scores.`,
    `- Stay fully in character as Alex. Never mention that you are an AI, a model, or a context.`,
    `- If the candidate goes silent, gently prompt them or move to the next question.`,
  ]
    .filter(Boolean)
    .join('\n');
}

export async function POST(req: Request) {
  const apiKey = process.env.LIVEAVATAR_API_KEY;
  const avatarId = process.env.LIVEAVATAR_AVATAR_ID;

  if (!apiKey || !avatarId) {
    return Response.json(
      { error: 'LiveAvatar is not configured. Set LIVEAVATAR_API_KEY and LIVEAVATAR_AVATAR_ID.' },
      { status: 503 },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const role: string = body?.role || 'Software Engineer';
    const difficulty: string = body?.difficulty || 'Intermediate';
    const customJD: string = body?.customJD || '';
    const resumeText: string = body?.resumeText || '';

    // 1) Create a per-interview Context = the interviewer's system prompt + greeting.
    const prompt = buildInterviewerPrompt({ role, difficulty, customJD, resumeText });
    const openingText = `Hey, hello! This is Alex, and I'll be your interviewer today for the ${role} role. How are you doing?`;

    const ctxRes = await fetch(`${LIVEAVATAR_API}/v1/contexts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
      body: JSON.stringify({
        name: `Interview • ${role} • ${difficulty} • ${Date.now()}`,
        prompt,
        opening_text: openingText,
      }),
    });

    if (!ctxRes.ok) {
      const text = await ctxRes.text();
      return Response.json(
        { error: 'Failed to create LiveAvatar context', details: text },
        { status: ctxRes.status },
      );
    }
    const ctxData = await ctxRes.json();
    const contextId = ctxData?.data?.id;
    if (!contextId) {
      return Response.json({ error: 'LiveAvatar context response missing id' }, { status: 502 });
    }

    // 2) Mint a FULL-mode session token bound to that context. The built-in agent
    //    will handle the whole conversation once the mic is published client-side.
    const voiceId = process.env.LIVEAVATAR_VOICE_ID;
    const persona: Record<string, unknown> = { context_id: contextId, language: 'en' };
    if (voiceId) persona.voice_id = voiceId;

    const tokenRes = await fetch(`${LIVEAVATAR_API}/v1/sessions/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
      body: JSON.stringify({
        mode: 'FULL',
        avatar_id: avatarId,
        avatar_persona: persona,
        interactivity_type: 'CONVERSATIONAL',
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      // Best-effort cleanup of the orphaned context.
      fetch(`${LIVEAVATAR_API}/v1/contexts/${contextId}`, { method: 'DELETE', headers: { 'X-API-KEY': apiKey } }).catch(() => {});
      return Response.json(
        { error: 'Failed to create LiveAvatar session token', details: text },
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
      contextId,
    });
  } catch (error: any) {
    console.error('LiveAvatar token error:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// Best-effort cleanup: delete a per-interview context when the interview ends.
export async function DELETE(req: Request) {
  const apiKey = process.env.LIVEAVATAR_API_KEY;
  if (!apiKey) return Response.json({ ok: false }, { status: 503 });
  try {
    const { searchParams } = new URL(req.url);
    const contextId = searchParams.get('contextId');
    if (!contextId) return Response.json({ ok: false }, { status: 400 });
    await fetch(`${LIVEAVATAR_API}/v1/contexts/${contextId}`, {
      method: 'DELETE',
      headers: { 'X-API-KEY': apiKey },
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}

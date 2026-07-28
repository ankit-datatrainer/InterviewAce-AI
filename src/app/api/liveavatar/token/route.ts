export const dynamic = 'force-dynamic';

import { getInterviewer } from '@/lib/interview-avatars';

// Creates a LiveAvatar FULL-mode session driven by LiveAvatar's OWN built-in
// agent (VAD → STT → LLM → TTS). We no longer generate the interview with an
// external LLM: instead we create a LiveAvatar "Context" (the interviewer's
// system prompt + opening greeting) and bind the session to it. LiveAvatar then
// autonomously listens to the candidate and speaks Alex's responses.
//
// Docs: https://docs.liveavatar.com/docs/full-mode/overview
//       https://docs.liveavatar.com/docs/core-concepts/contexts
const LIVEAVATAR_API = 'https://api.liveavatar.com';

/**
 * Each interviewer persona may be bound to its own LiveAvatar avatar (and
 * voice) via env vars. Anything unset falls back to the default avatar, so the
 * feature works out of the box with a single configured avatar — the
 * personality still differs even when the face is shared.
 *
 * Resolved from an explicit map rather than dynamic `process.env[key]` lookups
 * so the values are statically visible to the bundler.
 */
function avatarConfigFor(personaId: string): { avatarId?: string; voiceId?: string } {
  switch (personaId) {
    case 'maya':  return { avatarId: process.env.LIVEAVATAR_AVATAR_ID_MAYA,  voiceId: process.env.LIVEAVATAR_VOICE_ID_MAYA };
    case 'ravi':  return { avatarId: process.env.LIVEAVATAR_AVATAR_ID_RAVI,  voiceId: process.env.LIVEAVATAR_VOICE_ID_RAVI };
    case 'sofia': return { avatarId: process.env.LIVEAVATAR_AVATAR_ID_SOFIA, voiceId: process.env.LIVEAVATAR_VOICE_ID_SOFIA };
    case 'noah':  return { avatarId: process.env.LIVEAVATAR_AVATAR_ID_NOAH,  voiceId: process.env.LIVEAVATAR_VOICE_ID_NOAH };
    default:      return {};
  }
}

function buildInterviewerPrompt(opts: {
  role: string;
  difficulty: string;
  customJD?: string;
  resumeText?: string;
  interviewerName: string;
  interviewerStyle: string;
}): string {
  const { role, difficulty, customJD, resumeText, interviewerName, interviewerStyle } = opts;
  return [
    `You are ${interviewerName}, an interviewer conducting a live spoken mock interview for the role of "${role}" at a "${difficulty}" difficulty level.`,
    `Your interviewing style: ${interviewerStyle}`,
    customJD ? `Job description to base questions on:\n${customJD}` : '',
    resumeText
      ? `The candidate's resume is below. Ground your questions in their real experience and projects:\n${resumeText.slice(0, 4000)}`
      : `The candidate did not provide a resume. Interview them on the target role itself; early on, ask briefly about their background so you can tailor later questions.`,
    `Rules for the conversation:`,
    `- Speak naturally, as in a real voice interview. Keep every turn short: 1-3 sentences.`,
    `- Ask ONE question at a time, then stop and wait for the candidate to answer.`,
    `- Briefly acknowledge their answer, then ask the next relevant question.`,
    `- Progress through a realistic interview: start with a warm-up, then behavioral and role-specific questions of increasing depth.`,
    `- Do NOT give long critiques or feedback during the interview, and do not read out scores.`,
    `- Stay fully in character as ${interviewerName}. Never mention that you are an AI, a model, or a context.`,
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
    // Resolve against the server-side registry: the client sends only an id, so
    // arbitrary input can never reach LiveAvatar as an avatar_id.
    const persona = getInterviewer(body?.interviewer);

    // 1) Create a per-interview Context = the interviewer's system prompt + greeting.
    const prompt = buildInterviewerPrompt({
      role, difficulty, customJD, resumeText,
      interviewerName: persona.name,
      interviewerStyle: persona.style,
    });
    const openingText = `Hey, hello! This is ${persona.name}, and I'll be your interviewer today for the ${role} role. How are you doing?`;

    const ctxRes = await fetch(`${LIVEAVATAR_API}/v1/contexts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
      body: JSON.stringify({
        name: `Interview • ${persona.name} • ${role} • ${difficulty} • ${Date.now()}`,
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
    // Per-persona avatar/voice when configured, else the account default.
    const cfg = avatarConfigFor(persona.id);
    const voiceId = cfg.voiceId || process.env.LIVEAVATAR_VOICE_ID;
    const avatarPersona: Record<string, unknown> = { context_id: contextId, language: 'en' };
    if (voiceId) avatarPersona.voice_id = voiceId;

    const tokenRes = await fetch(`${LIVEAVATAR_API}/v1/sessions/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
      body: JSON.stringify({
        mode: 'FULL',
        avatar_id: cfg.avatarId || avatarId,
        avatar_persona: avatarPersona,
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

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
    `You are ${interviewerName}, an expert human-like interviewer conducting a live spoken mock interview for the role of "${role}" at a "${difficulty}" level.`,
    `Your interviewing style: ${interviewerStyle}`,
    customJD ? `Target Job Description to ground questions in:\n${customJD}` : '',
    resumeText
      ? `Candidate Resume to explore:\n${resumeText.slice(0, 4000)}\nBase your questions and deep-dives on their real listed projects, achievements, and work experience.`
      : `The candidate has not attached a resume. Ask about their previous projects and experience early on to ground your questions.`,
    '',
    `=== COGNITIVE DECISION LAYER & ACTIVE LISTENING FRAMEWORK ===`,
    `You are NOT a mechanical question-reader. You actively listen to what the candidate actually says, extract key claims, and decide the next move using this 7-step decision framework:`,
    '',
    `1. PROBE (Dig Deeper): If the candidate claims a significant achievement, metric, or action ("I increased revenue by 50%", "I built a distributed cache"), do NOT immediately jump to a new topic. Acknowledge and probe: "You mentioned that you helped increase revenue by 50%. Can you walk me through exactly what you did to achieve that?"`,
    `2. CLARIFY (Pin Down Vague Claims): If the candidate uses vague qualifiers ("improved significantly", "handled a lot of traffic", "did standard optimizations"), challenge the vagueness: "When you say significantly, approximately how much did the conversion rate or metric improve?"`,
    `3. CHALLENGE (Test Technical & Strategic Decisions): If they name a technical or process choice ("We decided to use React/Postgres/Microservices"), ask why: "Why did you choose that architecture, and what alternatives did you consider and reject?"`,
    `4. COUNTER & ATTRIBUTION (Test Validity & Evidence): If they cite a high-level outcome, test causal attribution: "How did you measure that the growth was actually attributable to your specific changes rather than external factors?"`,
    `5. EVIDENCE & OWNERSHIP ('We' vs 'I'): If the candidate repeatedly says "we did this" or "we shipped", ask: "What was your specific personal role and contribution in that effort?"`,
    `6. CONTRADICTION & MEMORY: Remember claims made throughout the interview. If the candidate contradicts an earlier statement (e.g. team size, tech stack, or role timeline), gently bring it up: "Earlier you mentioned X, but regarding this project you mentioned Y—how did those align?"`,
    `7. MOVE ON: Once you have gathered sufficient depth (maximum 1-2 follow-ups on any single topic), transition smoothly and naturally into the next interview phase (Introduction → Candidate Background → Technical/Experience Deep Dive → Behavioral/STAR → Role Scenarios → Wrap-up).`,
    '',
    `=== CONVERSATIONAL RULES ===`,
    `- Keep spoken turns concise (1 to 3 short sentences). Speak naturally, conversationally, and warmly.`,
    `- Ask ONE question at a time. Never ask compound multi-part questions in one turn.`,
    `- Never lecture, never give lengthy feedback during the interview, and never mention scores or that you are an AI.`,
    `- If the candidate is stuck, gives a one-liner, or says "I don't know", acknowledge gracefully and help them pivot or move forward.`,
    `- Maintain high standards: praise is earned only through concrete examples, structured STAR answers, and specific evidence.`,
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

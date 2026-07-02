import { NextRequest, NextResponse } from 'next/server';
import { nimChat, isNimConfigured, parseJsonFromModel } from '@/lib/nim';

export async function POST(req: NextRequest) {
  try {
    const { transcript, role, difficulty } = await req.json();

    if (!isNimConfigured()) {
      return NextResponse.json({ error: 'NVIDIA_NIM_API_KEY is not configured' }, { status: 500 });
    }

    const candidateAnswers = (transcript || []).filter((m: any) => m.who === 'me');
    const totalAnswerChars = candidateAnswers.reduce((s: number, m: any) => s + (m.text?.length || 0), 0);

    const prompt = `You are a STRICT, honest technical recruiter scoring a mock interview for a candidate applying for "${role}" at a "${difficulty}" level. Do NOT be generous. Most real candidates score 50-75. Only award 85+ for genuinely excellent, detailed, structured answers with concrete examples.

Transcript:
${transcript.map((m: any) => `${m.who === 'ai' ? 'Interviewer' : 'Candidate'}: ${m.text}`).join('\n')}

Scoring rules (follow exactly):
- The candidate gave ${candidateAnswers.length} answer(s), totalling ${totalAnswerChars} characters.
- If there are fewer than 3 substantive answers, OR answers are one-liners / off-topic / empty (e.g. only greetings like "I'm good"), the overall score MUST be LOW (20-45) and the per-skill scores must mostly be 2-5. Do NOT inflate.
- Base communication, confidence, clarity, technicalKnowledge, problemSolving, and leadership ONLY on actual evidence in the candidate's answers. No evidence = low score.
- IMPORTANT: This is audio/transcript only — you CANNOT actually observe video. For the visual metrics (bodyLanguage, eyeContact, appearance, posture) do NOT invent high scores; set them roughly equal to the communication score (a neutral proxy), never higher.
- overall "score" must be consistent with the metrics (roughly the average * 10), not arbitrary.
- Feedback must be specific to what the candidate actually said (quote or reference it). If they barely answered, say so directly.

Return EXACTLY this JSON (no markdown, no text outside JSON). All metric values are out of 10, "score" is out of 100:
{
  "score": 0,
  "metrics": { "communication": 0, "confidence": 0, "clarity": 0, "bodyLanguage": 0, "eyeContact": 0, "appearance": 0, "posture": 0, "technicalKnowledge": 0, "problemSolving": 0, "leadership": 0 },
  "feedback": { "strengths": "...", "improvements": "...", "nextStep": "..." }
}`;

    const content = await nimChat(
      [
        { role: 'system', content: 'You are a strict, evidence-based interview evaluator that returns only the requested JSON. You never inflate scores and you penalise short or low-effort interviews.' },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.2, maxTokens: 900, json: true },
    );

    const result = parseJsonFromModel(content);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Interview Evaluate Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { nimChat, isNimConfigured, parseJsonFromModel } from '@/lib/nim';

export async function POST(req: NextRequest) {
  try {
    const { transcript, role, difficulty } = await req.json();

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

    let result: any = null;

    if (isNimConfigured()) {
      try {
        const content = await nimChat(
          [
            { role: 'system', content: 'You are a strict, evidence-based interview evaluator that returns only the requested JSON. You never inflate scores and you penalise short or low-effort interviews.' },
            { role: 'user', content: prompt },
          ],
          { temperature: 0.2, maxTokens: 900, json: true, timeoutMs: 22000 },
        );
        result = parseJsonFromModel(content);
      } catch (aiErr) {
        console.warn('Evaluate AI failed, using local heuristic:', aiErr);
        result = null;
      }
    }

    // Guaranteed fallback: compute an evidence-based score locally so the report
    // ALWAYS has a meaningful result even when the AI is slow/unavailable.
    if (!result || typeof result.score !== 'number' || !result.metrics) {
      result = localEvaluation(candidateAnswers, totalAnswerChars);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Interview Evaluate Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// Evidence-based heuristic scoring used when the AI evaluator is unavailable.
// Rewards more answers, longer/detailed responses, and concrete specifics
// (numbers, metrics, tech terms) — and penalises one-liners / greetings-only.
function localEvaluation(candidateAnswers: any[], totalChars: number) {
  const n = candidateAnswers.length;
  const avg = n > 0 ? totalChars / n : 0;
  const joined = candidateAnswers.map((m) => m.text || '').join(' ');
  const hasSpecifics = /\d+%|\d+\s*(years|months|users|apps|projects|people|k\b)|\$\d|increased|reduced|improved|led|built|designed|launched|managed/i.test(joined);

  // Depth score 0..10 from answer count and average length.
  let depth = 0;
  depth += Math.min(4, n);                    // up to 4 for answering 4+ questions
  if (avg > 60) depth += 2;
  if (avg > 140) depth += 2;
  if (avg > 260) depth += 1;
  if (hasSpecifics) depth += 1;
  depth = Math.max(1, Math.min(10, depth));

  // Very short / greeting-only interviews are penalised hard.
  const base = n < 2 || totalChars < 80 ? Math.min(depth, 3) : depth;

  const communication = base;
  const confidence = Math.max(1, base - (hasSpecifics ? 0 : 1));
  const clarity = base;
  const technicalKnowledge = hasSpecifics ? Math.min(10, base + 1) : Math.max(1, base - 1);
  const problemSolving = Math.max(1, base - (hasSpecifics ? 0 : 1));
  const leadership = /\b(led|managed|mentored|owned|team)\b/i.test(joined) ? Math.min(10, base + 1) : Math.max(1, base - 2);
  // Visual metrics can't be observed from transcript — use communication as a neutral proxy.
  const visual = communication;

  const metrics = {
    communication, confidence, clarity,
    bodyLanguage: visual, eyeContact: visual, appearance: visual, posture: visual,
    technicalKnowledge, problemSolving, leadership,
  };
  const avgMetric = Object.values(metrics).reduce((s, v) => s + v, 0) / Object.values(metrics).length;
  const score = Math.round(avgMetric * 10);

  const strengths = n >= 3 && hasSpecifics
    ? 'You engaged with multiple questions and backed some answers with concrete details and examples.'
    : n >= 2
      ? 'You responded to the interviewer and kept the conversation going.'
      : 'You joined the session and began the conversation.';
  const improvements = n < 3 || avg < 140
    ? 'Give longer, structured answers (aim for 60-90 seconds each) using the STAR format, and answer at least 4-5 questions fully.'
    : 'Add more measurable results (numbers, %, impact) and tie each answer back to the role.';
  const nextStep = 'Retake the interview and aim for detailed, example-driven answers with quantified outcomes.';

  return { score, metrics, feedback: { strengths, improvements, nextStep } };
}

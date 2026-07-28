import { NextRequest, NextResponse } from 'next/server';
import { nimChat, isNimConfigured, parseJsonFromModel } from '@/lib/nim';

type TranscriptMsg = { who: 'ai' | 'me'; text: string };

type Verdict = 'strong' | 'adequate' | 'weak';

interface PerQuestionFeedback {
  question: string;
  answerSummary: string;
  verdict: Verdict;
  whatWorked: string;
  whatWasMissing: string;
  betterAnswer: string;
  starCoverage?: { situation: boolean; task: boolean; action: boolean; result: boolean };
}

interface EvaluationHighlights {
  quotedStrength: string;
  quotedWeakness: string;
  fillerWords: { count: number; examples: string[] };
  vagueClaims: string[];
  missingKeywords: string[];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const role: string = body?.role || 'General';
    const difficulty: string = body?.difficulty || 'Intermediate';
    const transcript: TranscriptMsg[] = Array.isArray(body?.transcript) ? body.transcript : [];

    const candidateAnswers = transcript.filter((m) => m?.who === 'me');
    const totalAnswerChars = candidateAnswers.reduce((s, m) => s + (m?.text?.length || 0), 0);
    const pairs = pairQuestionsWithAnswers(transcript);

    const prompt = `You are a STRICT, honest technical recruiter scoring a mock interview for a candidate applying for "${role}" at a "${difficulty}" level. Do NOT be generous. Most real candidates score 50-75. Only award 85+ for genuinely excellent, detailed, structured answers with concrete examples.

Transcript:
${transcript.map((m) => `${m.who === 'ai' ? 'Interviewer' : 'Candidate'}: ${m.text}`).join('\n')}

Scoring rules (follow exactly):
- The candidate gave ${candidateAnswers.length} answer(s), totalling ${totalAnswerChars} characters.
- If there are fewer than 3 substantive answers, OR answers are one-liners / off-topic / empty (e.g. only greetings like "I'm good"), the overall score MUST be LOW (20-45) and the per-skill scores must mostly be 2-5. Do NOT inflate.
- Base communication, confidence, clarity, technicalKnowledge, problemSolving, and leadership ONLY on actual evidence in the candidate's answers. No evidence = low score.
- IMPORTANT: This is audio/transcript only — you CANNOT actually observe video. For the visual metrics (bodyLanguage, eyeContact, appearance, posture) do NOT invent high scores; set them roughly equal to the communication score (a neutral proxy), never higher.
- overall "score" must be consistent with the metrics (roughly the average * 10), not arbitrary.

EVIDENCE RULES (these are mandatory — feedback that ignores them is wrong):
- Every claim you make about the candidate MUST be grounded in their actual words. Quote a short verbatim fragment (3-12 words, in "double quotes") or closely paraphrase what they really said.
- NEVER invent achievements, employers, projects, numbers or skills the candidate did not mention. If they never said it, it did not happen.
- If the candidate said almost nothing, say that plainly and quote the thin answer rather than manufacturing praise.
- No generic filler advice ("be more confident", "use STAR"). Every improvement must point at a specific answer and what was missing from it.

PER-QUESTION RULES:
- Produce one "perQuestion" entry for every interviewer question the candidate actually answered (${pairs.length} question/answer pair(s) were detected). Skip greetings/pleasantries that were not real questions. Never return an empty array when the candidate answered at least once.
- "answerSummary": 1 sentence describing what THEY actually said.
- "verdict": "strong" only for a structured, specific, results-backed answer; "adequate" for on-topic but thin/unquantified; "weak" for vague, off-topic, one-line or non-answers.
- "whatWorked": the concrete thing in their wording that helped (or state plainly that little worked).
- "whatWasMissing": the specific detail, metric, structure or example absent from THEIR answer.
- "betterAnswer": a 2-3 sentence REWRITE of their own answer in first person, keeping their real content and role context, improved with structure and the specifics they omitted. It must read like an upgraded version of what they said, not generic advice. Only use placeholders like [X%] where they genuinely gave no number.
- "starCoverage": booleans for whether their answer covered Situation, Task, Action, Result (use for behavioural/experience questions; omit for pure factual questions).

HIGHLIGHTS RULES:
- "quotedStrength": one actual short quote from the candidate in double quotes, followed by — and why it worked.
- "quotedWeakness": one actual short quote in double quotes, followed by — and why it fell short.
- "fillerWords": count of filler words actually present (um, uh, like, you know, basically, actually, sort of, kind of, I mean) and up to 5 example fillers used.
- "vagueClaims": up to 5 statements they made that lack evidence, numbers or specifics (quote or paraphrase them).
- "missingKeywords": up to 8 terms/skills/concepts a strong "${role}" candidate would be expected to mention that never appeared in this transcript.

Return EXACTLY this JSON (no markdown, no text outside JSON). All metric values are out of 10, "score" is out of 100:
{
  "score": 0,
  "metrics": { "communication": 0, "confidence": 0, "clarity": 0, "bodyLanguage": 0, "eyeContact": 0, "appearance": 0, "posture": 0, "technicalKnowledge": 0, "problemSolving": 0, "leadership": 0 },
  "feedback": { "strengths": "...", "improvements": "...", "nextStep": "..." },
  "perQuestion": [
    {
      "question": "...",
      "answerSummary": "...",
      "verdict": "strong|adequate|weak",
      "whatWorked": "...",
      "whatWasMissing": "...",
      "betterAnswer": "...",
      "starCoverage": { "situation": false, "task": false, "action": false, "result": false }
    }
  ],
  "highlights": {
    "quotedStrength": "...",
    "quotedWeakness": "...",
    "fillerWords": { "count": 0, "examples": ["..."] },
    "vagueClaims": ["..."],
    "missingKeywords": ["..."]
  }
}`;

    let result: any = null;

    if (isNimConfigured()) {
      try {
        const content = await nimChat(
          [
            {
              role: 'system',
              content:
                'You are a strict, evidence-based interview evaluator that returns only the requested JSON. You never inflate scores, you never invent achievements the candidate did not mention, you quote the candidate\'s own words, and you penalise short or low-effort interviews.',
            },
            { role: 'user', content: prompt },
          ],
          { temperature: 0.2, maxTokens: 2600, json: true, timeoutMs: 40000 },
        );
        result = parseJsonFromModel(content);
      } catch (aiErr) {
        console.warn('Evaluate AI failed, using local heuristic:', aiErr);
        result = null;
      }
    }

    // Guaranteed fallback: compute an evidence-based score locally so the report
    // ALWAYS has a meaningful result even when the AI is slow/unavailable.
    const local = localEvaluation(candidateAnswers, totalAnswerChars, pairs, role);
    if (!result || typeof result.score !== 'number' || !result.metrics) {
      result = local;
    } else {
      // The model answered, but may have omitted or mangled the new sections —
      // repair them from the deterministic analysis so the UI is never empty.
      result.perQuestion = sanitizePerQuestion(result.perQuestion, local.perQuestion);
      result.highlights = sanitizeHighlights(result.highlights, local.highlights);
      if (!result.feedback || typeof result.feedback !== 'object') result.feedback = local.feedback;
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Interview Evaluate Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// ── Shared text helpers ───────────────────────────────────────────────────────

const FILLER_PATTERNS: { label: string; re: RegExp }[] = [
  { label: 'um', re: /\bum+\b/gi },
  { label: 'uh', re: /\buh+\b/gi },
  { label: 'like', re: /\blike\b/gi },
  { label: 'you know', re: /\byou know\b/gi },
  { label: 'basically', re: /\bbasically\b/gi },
  { label: 'actually', re: /\bactually\b/gi },
  { label: 'sort of', re: /\bsort of\b/gi },
  { label: 'kind of', re: /\bkind of\b/gi },
  { label: 'I mean', re: /\bi mean\b/gi },
];

/** Common English words we never treat as a "role keyword". */
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'your', 'their', 'have', 'been', 'about', 'into',
  'what', 'when', 'where', 'which', 'would', 'could', 'should', 'there', 'here', 'them', 'they', 'you',
]);

function countFillers(text: string): { count: number; examples: string[] } {
  const examples: string[] = [];
  let count = 0;
  for (const f of FILLER_PATTERNS) {
    const matches = text.match(f.re);
    if (matches && matches.length > 0) {
      count += matches.length;
      examples.push(`${f.label} (${matches.length}x)`);
    }
  }
  return { count, examples: examples.slice(0, 6) };
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function hasSpecifics(text: string): boolean {
  return /\d/.test(text) || /\b(increased|reduced|improved|launched|shipped|migrated|automated|led|owned|built|designed|managed|mentored)\b/i.test(text);
}

/** Sentences that assert something but carry no number/metric evidence. */
function findVagueClaims(answers: string[]): string[] {
  const claims: string[] = [];
  const claimish = /\b(i am|i'm|i was|i have|i've|we|my|i can|i always|i usually|i really|good at|strong|experienced|passionate|expert|responsible for|worked on|handled)\b/i;
  for (const a of answers) {
    for (const s of splitSentences(a)) {
      if (s.length < 25) continue;
      if (/\d/.test(s)) continue;
      if (!claimish.test(s)) continue;
      claims.push(s.length > 160 ? `${s.slice(0, 157)}...` : s);
      if (claims.length >= 5) return claims;
    }
  }
  return claims;
}

/** Role-relevant terms (from the role title + a generic interview vocabulary) never mentioned. */
function findMissingKeywords(role: string, joined: string): string[] {
  const lower = joined.toLowerCase();
  const roleTerms = (role || '')
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

  const generic = [
    'impact', 'metrics', 'stakeholders', 'trade-off', 'ownership', 'collaboration',
    'deadline', 'result', 'team', 'customer', 'process', 'challenge',
  ];

  const missing: string[] = [];
  for (const term of [...new Set([...roleTerms, ...generic])]) {
    if (!lower.includes(term)) missing.push(term);
    if (missing.length >= 8) break;
  }
  return missing;
}

function shortQuote(text: string, max = 90): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 3)}...` : clean;
}

function firstWords(text: string, n: number): string {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  return words.slice(0, n).join(' ') + (words.length > n ? '...' : '');
}

function starCoverageFor(answer: string): { situation: boolean; task: boolean; action: boolean; result: boolean } {
  return {
    situation: /\b(at|when|while|during|we were|the situation|our team|at my (last|previous)|in my (last|previous))\b/i.test(answer) && answer.length > 60,
    task: /\b(i (was )?(asked|responsible|tasked|needed|had to)|my (job|role|goal|task)|the goal|objective)\b/i.test(answer),
    action: /\b(i (built|created|designed|implemented|led|organis|organiz|wrote|set up|coordinated|analysed|analyzed|refactored|proposed|decided|reached out|automated|tested))/i.test(answer),
    result: /\d+\s*%|\bby \d|\b(result|outcome|impact|increased|reduced|saved|grew|improved|delivered|shipped|launched)\b/i.test(answer),
  };
}

/** Pairs each interviewer turn with the candidate turn(s) that followed it. */
function pairQuestionsWithAnswers(transcript: TranscriptMsg[]): { question: string; answer: string }[] {
  const pairs: { question: string; answer: string }[] = [];
  for (let i = 0; i < transcript.length; i++) {
    const msg = transcript[i];
    if (!msg || msg.who !== 'ai') continue;
    const parts: string[] = [];
    for (let j = i + 1; j < transcript.length; j++) {
      if (transcript[j].who === 'ai') break;
      if (transcript[j].text) parts.push(transcript[j].text);
    }
    const answer = parts.join(' ').trim();
    if (!answer) continue; // only questions the candidate actually answered
    pairs.push({ question: (msg.text || '').trim(), answer });
  }
  return pairs;
}

// ── Deterministic local evaluation ───────────────────────────────────────────

function localPerQuestion(pairs: { question: string; answer: string }[]): PerQuestionFeedback[] {
  return pairs.map(({ question, answer }) => {
    const specific = hasSpecifics(answer);
    const len = answer.length;
    const star = starCoverageFor(answer);
    const starCount = Object.values(star).filter(Boolean).length;

    let verdict: Verdict = 'weak';
    if (len >= 260 && specific && starCount >= 3) verdict = 'strong';
    else if (len >= 110 && (specific || starCount >= 2)) verdict = 'adequate';
    else if (len >= 200) verdict = 'adequate';

    const whatWorked =
      verdict === 'weak'
        ? `Little to build on here — you replied with roughly ${answer.split(/\s+/).length} word(s) ("${shortQuote(answer, 60)}"), which does not give the interviewer anything to assess.`
        : specific
          ? `You stayed on topic and included concrete detail — e.g. "${shortQuote(answer, 70)}".`
          : `You answered the question directly and kept a clear line of thought ("${firstWords(answer, 12)}").`;

    const missingBits: string[] = [];
    if (!specific) missingBits.push('any numbers, metrics or measurable outcome');
    if (!star.situation) missingBits.push('the context/situation you were in');
    if (!star.action) missingBits.push('the specific actions you personally took');
    if (!star.result) missingBits.push('the result and what changed because of you');
    if (len < 110) missingBits.push('depth — this needs 60-90 seconds of speech, not one line');

    const whatWasMissing = missingBits.length > 0
      ? `Your answer left out ${missingBits.slice(0, 3).join(', ')}.`
      : 'Nothing major missing — tighten the delivery and lead with the result.';

    const betterAnswer = buildBetterAnswer(question, answer, specific);

    return {
      question: question || 'Interviewer question',
      answerSummary: `You said: "${shortQuote(answer, 120)}" (${answer.split(/\s+/).filter(Boolean).length} words).`,
      verdict,
      whatWorked,
      whatWasMissing,
      betterAnswer,
      starCoverage: star,
    };
  });
}

/** Rewrites the candidate's own answer into a stronger, structured version. */
function buildBetterAnswer(question: string, answer: string, specific: boolean): string {
  const core = shortQuote(answer, 110);
  const topic = firstWords(question || 'this', 10);
  const s1 = `"${core}" is the right starting point — anchor it first: "In my last role, when ${topic.replace(/\?$/, '').toLowerCase()} came up, I owned [the specific piece of work]."`;
  const s2 = `Then spell out what you actually did, step by step, instead of describing it in general terms.`;
  const s3 = specific
    ? `Close by repeating the number you mentioned and tying it to business impact: "...which moved [metric] and is why the team kept the approach."`
    : `Close with a measurable result you never gave: "...which cut [X] by [Y%] in [timeframe]."`;
  return `${s1} ${s2} ${s3}`;
}

function localHighlights(answers: string[], role: string): EvaluationHighlights {
  const joined = answers.join(' ');
  const sorted = [...answers].sort((a, b) => b.length - a.length);
  const best = sorted[0] || '';
  const worst = sorted[sorted.length - 1] || '';

  const quotedStrength = best
    ? `"${shortQuote(best, 100)}" — this was your fullest answer${hasSpecifics(best) ? ' and it carried concrete detail the interviewer can verify.' : ', though it still needs a measurable outcome to land.'}`
    : 'No answer was substantial enough to quote as a strength.';

  const quotedWeakness = worst
    ? `"${shortQuote(worst, 100)}" — too thin to score: it gives no context, no action and no result.`
    : 'No candidate speech was captured, so there is nothing to assess.';

  return {
    quotedStrength,
    quotedWeakness,
    fillerWords: countFillers(joined),
    vagueClaims: findVagueClaims(answers),
    missingKeywords: findMissingKeywords(role, joined),
  };
}

// Evidence-based heuristic scoring used when the AI evaluator is unavailable.
// Rewards more answers, longer/detailed responses, and concrete specifics
// (numbers, metrics, tech terms) — and penalises one-liners / greetings-only.
function localEvaluation(
  candidateAnswers: TranscriptMsg[],
  totalChars: number,
  pairs: { question: string; answer: string }[],
  role: string,
) {
  const n = candidateAnswers.length;
  const avg = n > 0 ? totalChars / n : 0;
  const answers = candidateAnswers.map((m) => m.text || '').filter(Boolean);
  const joined = answers.join(' ');
  const specifics = /\d+%|\d+\s*(years|months|users|apps|projects|people|k\b)|\$\d|increased|reduced|improved|led|built|designed|launched|managed/i.test(joined);

  // Depth score 0..10 from answer count and average length.
  let depth = 0;
  depth += Math.min(4, n);                    // up to 4 for answering 4+ questions
  if (avg > 60) depth += 2;
  if (avg > 140) depth += 2;
  if (avg > 260) depth += 1;
  if (specifics) depth += 1;
  depth = Math.max(1, Math.min(10, depth));

  // Very short / greeting-only interviews are penalised hard.
  const base = n < 2 || totalChars < 80 ? Math.min(depth, 3) : depth;

  const communication = base;
  const confidence = Math.max(1, base - (specifics ? 0 : 1));
  const clarity = base;
  const technicalKnowledge = specifics ? Math.min(10, base + 1) : Math.max(1, base - 1);
  const problemSolving = Math.max(1, base - (specifics ? 0 : 1));
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

  const perQuestion = localPerQuestion(pairs);
  const highlights = localHighlights(answers, role);
  const weakCount = perQuestion.filter((p) => p.verdict === 'weak').length;

  const longest = [...answers].sort((a, b) => b.length - a.length)[0] || '';
  const strengths = longest
    ? `Your strongest moment was "${shortQuote(longest, 90)}"${specifics ? ' — it carried concrete detail the interviewer can follow up on.' : ' — on topic, but it still needs evidence behind it.'}`
    : 'You joined the session, but there is no substantive answer to credit yet.';
  const improvements = weakCount > 0
    ? `${weakCount} of your ${perQuestion.length || 1} answer(s) were too thin to score — most notably "${shortQuote(perQuestion.find((p) => p.verdict === 'weak')?.question || '', 60)}". Rebuild each of those with situation, action and a measured result.`
    : `Add measurable outcomes: ${highlights.vagueClaims.length > 0 ? `claims like "${shortQuote(highlights.vagueClaims[0], 70)}" carry no number.` : 'quantify the impact of each example you give.'}`;
  const nextStep = highlights.missingKeywords.length > 0
    ? `Retake the interview and deliberately work in the terms you never mentioned: ${highlights.missingKeywords.slice(0, 5).join(', ')}.`
    : 'Retake the interview and aim for detailed, example-driven answers with quantified outcomes.';

  return { score, metrics, feedback: { strengths, improvements, nextStep }, perQuestion, highlights };
}

// ── Repair helpers for partially-valid model output ──────────────────────────

function sanitizePerQuestion(raw: any, fallback: PerQuestionFeedback[]): PerQuestionFeedback[] {
  if (!Array.isArray(raw)) return fallback;
  const cleaned: PerQuestionFeedback[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const question = typeof item.question === 'string' ? item.question : '';
    const betterAnswer = typeof item.betterAnswer === 'string' ? item.betterAnswer : '';
    if (!question && !betterAnswer) continue;
    const v = String(item.verdict || '').toLowerCase();
    const verdict: Verdict = v === 'strong' || v === 'adequate' || v === 'weak' ? v : 'adequate';
    const star = item.starCoverage;
    cleaned.push({
      question: question || 'Interviewer question',
      answerSummary: typeof item.answerSummary === 'string' ? item.answerSummary : '',
      verdict,
      whatWorked: typeof item.whatWorked === 'string' ? item.whatWorked : '',
      whatWasMissing: typeof item.whatWasMissing === 'string' ? item.whatWasMissing : '',
      betterAnswer,
      ...(star && typeof star === 'object'
        ? {
            starCoverage: {
              situation: !!star.situation,
              task: !!star.task,
              action: !!star.action,
              result: !!star.result,
            },
          }
        : {}),
    });
  }
  return cleaned.length > 0 ? cleaned : fallback;
}

function sanitizeHighlights(raw: any, fallback: EvaluationHighlights): EvaluationHighlights {
  if (!raw || typeof raw !== 'object') return fallback;
  const strArr = (v: any, fb: string[]): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).slice(0, 8) : fb;
  const fw = raw.fillerWords;
  return {
    quotedStrength: typeof raw.quotedStrength === 'string' && raw.quotedStrength.trim() ? raw.quotedStrength : fallback.quotedStrength,
    quotedWeakness: typeof raw.quotedWeakness === 'string' && raw.quotedWeakness.trim() ? raw.quotedWeakness : fallback.quotedWeakness,
    fillerWords:
      fw && typeof fw === 'object' && typeof fw.count === 'number'
        ? { count: fw.count, examples: strArr(fw.examples, fallback.fillerWords.examples) }
        : fallback.fillerWords,
    vagueClaims: strArr(raw.vagueClaims, fallback.vagueClaims),
    missingKeywords: strArr(raw.missingKeywords, fallback.missingKeywords),
  };
}

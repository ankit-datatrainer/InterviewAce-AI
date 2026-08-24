import { NextRequest, NextResponse } from 'next/server';
import { nimChat, isNimConfigured, parseJsonFromModel } from '@/lib/nim';

type TranscriptMsg = { who: 'ai' | 'me'; text: string };

type Verdict = 'strong' | 'adequate' | 'weak';

interface PerQuestionFeedback {
  question: string;
  answerSummary: string;
  verdict: Verdict;
  score?: number;
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
  challengeMoments?: { question: string; candidateAnswer: string; followUp: string; whatWasMissing: string }[];
  contradictions?: { earlierStatement: string; laterStatement: string; explanation: string }[];
  practiceAreas?: { title: string; description: string; actionItem: string }[];
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

    const prompt = `You are a STRICT, honest executive recruiter scoring a mock interview for "${role}" at a "${difficulty}" level. Do NOT give boilerplate feedback or inflated praise. Give the candidate an exact diagnostic of how they interview.

Transcript:
${transcript.map((m) => `${m.who === 'ai' ? 'Interviewer' : 'Candidate'}: ${m.text}`).join('\n')}

Scoring rules:
- Candidate gave ${candidateAnswers.length} answer(s), totalling ${totalAnswerChars} characters.
- Short or low-effort answers (<3 substantive answers or one-liners) MUST get an overall score of 20-45.
- Base metrics strictly on evidence in candidate speech.
- Visual metrics (bodyLanguage, eyeContact, appearance, posture) should equal the communication score.

EVIDENCE & DIAGNOSTIC RULES:
- "quotedStrength": ONE verbatim quote from the candidate (in "double quotes") — followed by why it was persuasive.
- "quotedWeakness": ONE verbatim quote from the candidate (in "double quotes") — followed by what was missing or why it failed.
- "challengeMoments": List any moment where the interviewer probed, challenged a claim, or asked for details. Include:
  * "question": The original topic
  * "candidateAnswer": What the candidate said initially
  * "followUp": The interviewer's counter-question or probe
  * "whatWasMissing": What the candidate missed or how they handled the challenge
- "contradictions": If the candidate said something that conflicted with an earlier statement, list it with "earlierStatement", "laterStatement", and "explanation". (Empty array if none found).
- "practiceAreas": Exactly 3 prioritized coaching areas (e.g. 1. STAR structure, 2. Quantifying metrics, 3. Differentiating personal 'I' vs team 'we'), each with "title", "description", and "actionItem".
- "perQuestion": For every answered question, include:
  * "question": The interviewer's question
  * "answerSummary": 1 sentence summary of candidate response
  * "verdict": "strong" | "adequate" | "weak"
  * "score": 0 to 100 for this answer
  * "whatWorked": Concrete praise grounded in their actual words
  * "whatWasMissing": The specific metric, detail or structure missing
  * "betterAnswer": A 2-3 sentence first-person rewrite of their own answer, showing how they should have answered
  * "starCoverage": { "situation": boolean, "task": boolean, "action": boolean, "result": boolean }

Return EXACTLY this JSON structure (no markdown, no extra keys):
{
  "score": 0,
  "metrics": { "communication": 0, "confidence": 0, "clarity": 0, "bodyLanguage": 0, "eyeContact": 0, "appearance": 0, "posture": 0, "technicalKnowledge": 0, "problemSolving": 0, "leadership": 0 },
  "feedback": { "strengths": "...", "improvements": "...", "nextStep": "..." },
  "perQuestion": [
    {
      "question": "...",
      "answerSummary": "...",
      "verdict": "strong|adequate|weak",
      "score": 0,
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
    "missingKeywords": ["..."],
    "challengeMoments": [
      {
        "question": "...",
        "candidateAnswer": "...",
        "followUp": "...",
        "whatWasMissing": "..."
      }
    ],
    "contradictions": [],
    "practiceAreas": [
      { "title": "...", "description": "...", "actionItem": "..." },
      { "title": "...", "description": "...", "actionItem": "..." },
      { "title": "...", "description": "...", "actionItem": "..." }
    ]
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
                'You are a strict, evidence-based interview evaluator that returns only valid JSON. You never invent achievements, you quote the candidate\'s real words, and you highlight challenges and practice areas.',
            },
            { role: 'user', content: prompt },
          ],
          { temperature: 0.2, maxTokens: 3000, json: true, timeoutMs: 40000 },
        );
        result = parseJsonFromModel(content);
      } catch (aiErr) {
        console.warn('Evaluate AI failed, using local heuristic:', aiErr);
        result = null;
      }
    }

    const local = localEvaluation(candidateAnswers, totalAnswerChars, pairs, role);
    if (!result || typeof result.score !== 'number' || !result.metrics) {
      result = local;
    } else {
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

    let itemScore = 50;
    if (verdict === 'strong') itemScore = Math.min(95, 80 + Math.round(Math.min(20, (len - 260) / 15)));
    else if (verdict === 'adequate') itemScore = Math.min(78, 60 + Math.round(Math.min(18, (len - 110) / 10)));
    else itemScore = Math.max(25, 30 + Math.round(Math.min(25, len / 10)));

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
      score: itemScore,
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

function localHighlights(answers: string[], role: string, pairs: { question: string; answer: string }[] = []): EvaluationHighlights {
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

  const vagueClaims = findVagueClaims(answers);
  const missingKeywords = findMissingKeywords(role, joined);

  const challengeMoments = [];
  for (let i = 1; i < pairs.length; i++) {
    const q = pairs[i].question;
    const prevA = pairs[i - 1]?.answer || '';
    const isProbe = /\b(you mentioned|why did you|what specifically|can you walk me through|how did you measure|when you say|what alternatives|biggest challenge|your specific role)\b/i.test(q);
    if (isProbe && prevA) {
      challengeMoments.push({
        question: pairs[i - 1].question,
        candidateAnswer: shortQuote(prevA, 140),
        followUp: q,
        whatWasMissing: pairs[i - 1].answer.length < 120 ? 'Initial answer lacked specific metrics or methodology.' : 'Interviewer probed to verify technical decision or direct personal attribution.',
      });
      if (challengeMoments.length >= 3) break;
    }
  }

  const practiceAreas = [
    {
      title: 'STAR Answer Structure',
      description: 'Structure behavioral answers with clear Situation, Task, Action, and Result.',
      actionItem: 'Dedicate majority of your response to actions YOU personally took, ending with a measured outcome.',
    },
    {
      title: 'Quantifying Achievements with Metrics',
      description: vagueClaims.length > 0
        ? `Replace vague claims like "${shortQuote(vagueClaims[0], 60)}" with concrete numbers or percentages.`
        : 'State specific baseline vs final metrics for every project mentioned.',
      actionItem: 'Use exact formulas: "Accomplished [X] as measured by [Y] by doing [Z]".',
    },
    {
      title: missingKeywords.length > 0 ? 'Domain & Technical Terminology' : 'Clarifying Personal Ownership ("I" vs "We")',
      description: missingKeywords.length > 0
        ? `Incorporate expected domain keywords: ${missingKeywords.slice(0, 4).join(', ')}.`
        : 'Specify exactly what you owned versus what the broader team delivered.',
      actionItem: missingKeywords.length > 0
        ? `Demonstrate familiarity with ${missingKeywords.slice(0, 3).join(', ')} in your project walk-throughs.`
        : 'Clearly distinguish your individual technical/strategic decisions from group efforts.',
    },
  ];

  return {
    quotedStrength,
    quotedWeakness,
    fillerWords: countFillers(joined),
    vagueClaims,
    missingKeywords,
    challengeMoments,
    contradictions: [],
    practiceAreas,
  };
}

// Evidence-based heuristic scoring used when the AI evaluator is unavailable.
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

  let depth = 0;
  depth += Math.min(4, n);
  if (avg > 60) depth += 2;
  if (avg > 140) depth += 2;
  if (avg > 260) depth += 1;
  if (specifics) depth += 1;
  depth = Math.max(1, Math.min(10, depth));

  const base = n < 2 || totalChars < 80 ? Math.min(depth, 3) : depth;

  const communication = base;
  const confidence = Math.max(1, base - (specifics ? 0 : 1));
  const clarity = base;
  const technicalKnowledge = specifics ? Math.min(10, base + 1) : Math.max(1, base - 1);
  const problemSolving = Math.max(1, base - (specifics ? 0 : 1));
  const leadership = /\b(led|managed|mentored|owned|team)\b/i.test(joined) ? Math.min(10, base + 1) : Math.max(1, base - 2);
  const visual = communication;

  const metrics = {
    communication, confidence, clarity,
    bodyLanguage: visual, eyeContact: visual, appearance: visual, posture: visual,
    technicalKnowledge, problemSolving, leadership,
  };
  const avgMetric = Object.values(metrics).reduce((s, v) => s + v, 0) / Object.values(metrics).length;
  const score = Math.round(avgMetric * 10);

  const perQuestion = localPerQuestion(pairs);
  const highlights = localHighlights(answers, role, pairs);
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
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (!item || typeof item !== 'object') continue;
    const question = typeof item.question === 'string' ? item.question : '';
    const betterAnswer = typeof item.betterAnswer === 'string' ? item.betterAnswer : '';
    if (!question && !betterAnswer) continue;
    const v = String(item.verdict || '').toLowerCase();
    const verdict: Verdict = v === 'strong' || v === 'adequate' || v === 'weak' ? v : 'adequate';
    const star = item.starCoverage;
    const fbScore = fallback[i]?.score || (verdict === 'strong' ? 85 : verdict === 'adequate' ? 68 : 42);
    const score = typeof item.score === 'number' ? Math.max(0, Math.min(100, item.score)) : fbScore;

    cleaned.push({
      question: question || 'Interviewer question',
      answerSummary: typeof item.answerSummary === 'string' ? item.answerSummary : '',
      verdict,
      score,
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

  const challengeMoments = Array.isArray(raw.challengeMoments) && raw.challengeMoments.length > 0
    ? raw.challengeMoments.map((cm: any) => ({
        question: typeof cm.question === 'string' ? cm.question : 'Topic',
        candidateAnswer: typeof cm.candidateAnswer === 'string' ? cm.candidateAnswer : '',
        followUp: typeof cm.followUp === 'string' ? cm.followUp : 'Interviewer follow-up',
        whatWasMissing: typeof cm.whatWasMissing === 'string' ? cm.whatWasMissing : '',
      }))
    : fallback.challengeMoments || [];

  const contradictions = Array.isArray(raw.contradictions) && raw.contradictions.length > 0
    ? raw.contradictions.map((ct: any) => ({
        earlierStatement: typeof ct.earlierStatement === 'string' ? ct.earlierStatement : '',
        laterStatement: typeof ct.laterStatement === 'string' ? ct.laterStatement : '',
        explanation: typeof ct.explanation === 'string' ? ct.explanation : '',
      }))
    : fallback.contradictions || [];

  const practiceAreas = Array.isArray(raw.practiceAreas) && raw.practiceAreas.length > 0
    ? raw.practiceAreas.map((pa: any) => ({
        title: typeof pa.title === 'string' ? pa.title : 'Practice Area',
        description: typeof pa.description === 'string' ? pa.description : '',
        actionItem: typeof pa.actionItem === 'string' ? pa.actionItem : '',
      }))
    : fallback.practiceAreas || [];

  return {
    quotedStrength: typeof raw.quotedStrength === 'string' && raw.quotedStrength.trim() ? raw.quotedStrength : fallback.quotedStrength,
    quotedWeakness: typeof raw.quotedWeakness === 'string' && raw.quotedWeakness.trim() ? raw.quotedWeakness : fallback.quotedWeakness,
    fillerWords:
      fw && typeof fw === 'object' && typeof fw.count === 'number'
        ? { count: fw.count, examples: strArr(fw.examples, fallback.fillerWords.examples) }
        : fallback.fillerWords,
    vagueClaims: strArr(raw.vagueClaims, fallback.vagueClaims),
    missingKeywords: strArr(raw.missingKeywords, fallback.missingKeywords),
    challengeMoments,
    contradictions,
    practiceAreas,
  };
}

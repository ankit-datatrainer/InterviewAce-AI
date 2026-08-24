import { NextRequest, NextResponse } from 'next/server';
import { nimChat, isNimConfigured, parseJsonFromModel } from '@/lib/nim';
import { buildInterviewMemory, type InterviewDecision } from '@/lib/interview-decision';

type TranscriptMsg = {
  who: 'ai' | 'me';
  text: string;
  decision?: InterviewDecision;
  timestampSeconds?: number;
};

type QuestionAnswerPair = {
  question: string;
  answer: string;
  decision?: InterviewDecision;
  timestampSeconds?: number;
  transcriptIndex?: number;
};

type Verdict = 'strong' | 'adequate' | 'weak';
type RubricMetric = 'communication' | 'answerStructure' | 'roleKnowledge' | 'problemSolving' | 'evidenceQuality' | 'roleFit';
type MomentLevel = 'strong' | 'improve' | 'critical';

interface EvaluationRubric {
  id: string;
  version: string;
  role: string;
  difficulty: string;
  dimensions: { key: RubricMetric; label: string; weight: number; description: string }[];
  excludedSignals: string[];
}

interface PerQuestionFeedback {
  question: string;
  answerSummary: string;
  verdict: Verdict;
  score?: number;
  whatWorked: string;
  whatWasMissing: string;
  betterAnswer: string;
  starCoverage?: { situation: boolean; task: boolean; action: boolean; result: boolean };
  competency?: string;
  evidence?: string;
  uncertainty?: string;
  timestampSeconds?: number;
  transcriptIndex?: number;
}

interface EvaluationHighlights {
  quotedStrength: string;
  quotedWeakness: string;
  fillerWords: { count: number; examples: string[] };
  vagueClaims: string[];
  missingKeywords: string[];
  challengeMoments?: { question: string; candidateAnswer: string; followUp: string; whatWasMissing: string; timestamp?: string }[];
  contradictions?: { earlierStatement: string; laterStatement: string; explanation: string }[];
  practiceAreas?: { title: string; description: string; actionItem: string }[];
  rubric?: EvaluationRubric;
  readiness?: { label: string; explanation: string; evidenceBasis: string; limitation: string };
  uncertainty?: { level: 'low' | 'medium' | 'high'; explanation: string; missingEvidence: string[] };
  moments?: { level: MomentLevel; title: string; summary: string; evidence: string; timestampSeconds?: number; transcriptIndex: number; questionIndex: number }[];
  verificationItems?: { type: 'unsupported_claim' | 'contradiction' | 'unresolved_claim'; label: string; evidence: string; guidance: string; timestampSeconds?: number; transcriptIndex: number }[];
  topStrengths?: { title: string; evidence: string; whyItMatters: string }[];
  topImprovements?: { title: string; evidence: string; action: string }[];
  sevenDayPlan?: { day: number; focus: string; exercise: string; successMeasure: string; practiceQuestion?: string }[];
}

interface EvaluationResult {
  score: number;
  metrics: Record<string, number>;
  feedback: { strengths: string; improvements: string; nextStep: string };
  perQuestion?: unknown;
  highlights?: unknown;
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
    const rubric = buildRubric(role, difficulty);

    const prompt = `You are a STRICT, honest executive recruiter scoring a mock interview for "${role}" at a "${difficulty}" level. Do NOT give boilerplate feedback or inflated praise. Give the candidate an exact diagnostic of how they interview.

Transcript:
${transcript.map((m) => `${m.who === 'ai' ? 'Interviewer' : 'Candidate'}: ${m.text}`).join('\n')}

Scoring rules:
- Candidate gave ${candidateAnswers.length} answer(s), totalling ${totalAnswerChars} characters.
- Short or low-effort answers (<3 substantive answers or one-liners) MUST get an overall score of 20-45.
- Base metrics strictly on evidence in candidate speech.
- Use rubric ${rubric.id}, version ${rubric.version}: ${rubric.dimensions.map((item) => `${item.label} ${Math.round(item.weight * 100)}%`).join(', ')}.
- Score ONLY communication, answer structure, technical/role knowledge, problem solving, evidence quality and role fit. Every metric uses a 1-10 scale, never 0-100.
- Do NOT score personality, confidence as a personality trait, facial expression, emotion, accent, eye contact, appearance, posture or body language.
- If transcript evidence is insufficient, state uncertainty instead of inventing certainty.

EVIDENCE & DIAGNOSTIC RULES:
- "quotedStrength": ONE verbatim quote from the candidate (in "double quotes") — followed by why it was persuasive.
- "quotedWeakness": ONE verbatim quote from the candidate (in "double quotes") — followed by what was missing or why it failed.
- "challengeMoments": List any moment where the interviewer probed, challenged a claim, or asked for details. Include:
  * "question": The original topic
  * "candidateAnswer": What the candidate said initially
  * "followUp": The interviewer's counter-question or probe
  * "whatWasMissing": What the candidate missed or how they handled the challenge
- "contradictions": If statements conflict, list them as items to VERIFY, never as accusations. (Empty array if none found).
- "practiceAreas": Exactly 3 prioritized coaching areas (e.g. 1. STAR structure, 2. Quantifying metrics, 3. Differentiating personal 'I' vs team 'we'), each with "title", "description", and "actionItem".
- "perQuestion": For every answered question, include:
  * "question": The interviewer's question
  * "answerSummary": 1 sentence summary of candidate response
  * "verdict": "strong" | "adequate" | "weak"
  * "score": 0 to 100 for this answer
  * "whatWorked": Concrete praise grounded in their actual words
  * "whatWasMissing": The specific metric, detail or structure missing
  * "betterAnswer": An honest answer FRAMEWORK using placeholders such as [real metric] for missing facts. Never fabricate experience, employers, actions or outcomes.
  * "starCoverage": { "situation": boolean, "task": boolean, "action": boolean, "result": boolean }

Return EXACTLY this JSON structure (no markdown, no extra keys):
{
  "score": 0,
  "metrics": { "communication": 0, "answerStructure": 0, "roleKnowledge": 0, "problemSolving": 0, "evidenceQuality": 0, "roleFit": 0 },
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

    let result: EvaluationResult | null = null;

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
        result = parseJsonFromModel<EvaluationResult>(content);
      } catch (aiErr) {
        console.warn('Evaluate AI failed, using local heuristic:', aiErr);
        result = null;
      }
    }

    const local = localEvaluation(candidateAnswers, totalAnswerChars, pairs, role, transcript);
    if (!result || typeof result.score !== 'number' || !result.metrics) {
      result = local;
    } else {
      result.perQuestion = sanitizePerQuestion(result.perQuestion, local.perQuestion);
      result.highlights = sanitizeHighlights(result.highlights, local.highlights);
      if (!result.feedback || typeof result.feedback !== 'object') result.feedback = local.feedback;
    }

    result.metrics = sanitizeRubricMetrics(result.metrics, local.metrics);
    result.score = scoreWithRubric(result.metrics, rubric);
    result = enrichEvaluation(result, transcript, pairs, role, rubric);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Interview Evaluate Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
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
function pairQuestionsWithAnswers(transcript: TranscriptMsg[]): QuestionAnswerPair[] {
  const pairs: QuestionAnswerPair[] = [];
  for (let i = 0; i < transcript.length; i++) {
    const msg = transcript[i];
    if (!msg || msg.who !== 'ai') continue;
    const parts: string[] = [];
    let answerIndex = -1;
    for (let j = i + 1; j < transcript.length; j++) {
      if (transcript[j].who === 'ai') break;
      if (transcript[j].text) {
        if (answerIndex < 0) answerIndex = j;
        parts.push(transcript[j].text);
      }
    }
    const answer = parts.join(' ').trim();
    if (!answer) continue; // only questions the candidate actually answered
    pairs.push({
      question: (msg.text || '').trim(),
      answer,
      decision: msg.decision,
      timestampSeconds: answerIndex >= 0 ? transcript[answerIndex].timestampSeconds ?? msg.timestampSeconds : msg.timestampSeconds,
      transcriptIndex: answerIndex >= 0 ? answerIndex : i,
    });
  }
  return pairs;
}

// ── Deterministic local evaluation ───────────────────────────────────────────

function localPerQuestion(pairs: QuestionAnswerPair[]): PerQuestionFeedback[] {
  return pairs.map(({ question, answer, timestampSeconds, transcriptIndex }) => {
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
      competency: competencyForQuestion(question),
      evidence: shortQuote(answer, 150),
      uncertainty: specific && len >= 120
        ? 'Moderate confidence: the answer contains specific supporting detail.'
        : 'Low confidence: the transcript contains limited verifiable evidence for this assessment.',
      timestampSeconds,
      transcriptIndex,
    };
  });
}

/** Rewrites the candidate's own answer into a stronger, structured version. */
function buildBetterAnswer(question: string, answer: string, specific: boolean): string {
  const star = starCoverageFor(answer);
  const sections = [
    !star.situation ? 'Situation: [real context and constraint]' : 'Situation: briefly reuse your real context',
    !star.task ? 'Task: [your actual responsibility]' : 'Task: state your responsibility in one line',
    !star.action ? 'Action: [steps you personally took and why]' : 'Action: keep the real steps and decision rationale',
    !star.result ? 'Result: [verified metric or observable outcome]' : 'Result: repeat only the outcome you can verify',
  ];
  const evidenceNote = specific
    ? 'Keep the concrete detail already present and do not add facts that were not true.'
    : 'If no exact number exists, say that plainly and describe the observable outcome instead of inventing one.';
  return `${sections.join(' → ')}. ${evidenceNote}`;
}

function competencyForQuestion(question: string): string {
  if (/technical|system|architecture|code|data|tool|technology|design/i.test(question)) return 'Role knowledge';
  if (/why|how|decision|problem|challenge|alternative|trade/i.test(question)) return 'Problem solving';
  if (/result|impact|metric|achiev|number/i.test(question)) return 'Evidence quality';
  if (/conflict|team|stakeholder|lead|influence|collabor/i.test(question)) return 'Communication and role fit';
  return 'Answer structure';
}

function localHighlights(
  answers: string[],
  role: string,
  pairs: QuestionAnswerPair[] = [],
  transcript: TranscriptMsg[] = [],
): EvaluationHighlights {
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
    const isProbe = (pairs[i].decision && pairs[i].decision !== 'MOVE_ON')
      || /\b(you mentioned|why did you|what specifically|can you walk me through|how did you measure|when you say|what alternatives|biggest challenge|your specific role)\b/i.test(q);
    if (isProbe && prevA) {
      challengeMoments.push({
        question: pairs[i - 1].question,
        candidateAnswer: shortQuote(prevA, 140),
        followUp: q,
        whatWasMissing: pairs[i - 1].answer.length < 120 ? 'Initial answer lacked specific metrics or methodology.' : 'Interviewer probed to verify technical decision or direct personal attribution.',
        timestamp: typeof pairs[i].timestampSeconds === 'number'
          ? `${Math.floor(pairs[i].timestampSeconds! / 60)}:${Math.floor(pairs[i].timestampSeconds! % 60).toString().padStart(2, '0')}`
          : undefined,
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

  const contradictions: { earlierStatement: string; laterStatement: string; explanation: string }[] = [];
  const stableClaims = buildInterviewMemory(transcript).filter(
    (claim) => claim.key === 'team_size' || claim.key === 'years_experience',
  );
  for (let i = 1; i < stableClaims.length; i += 1) {
    const current = stableClaims[i];
    const earlier = stableClaims.slice(0, i).find(
      (claim) => claim.key === current.key && claim.value !== current.value,
    );
    if (!earlier) continue;
    contradictions.push({
      earlierStatement: earlier.text,
      laterStatement: current.text,
      explanation: `The stated ${current.key === 'team_size' ? 'team size' : 'years of experience'} changed and needs reconciliation.`,
    });
    if (contradictions.length >= 3) break;
  }

  return {
    quotedStrength,
    quotedWeakness,
    fillerWords: countFillers(joined),
    vagueClaims,
    missingKeywords,
    challengeMoments,
    contradictions,
    practiceAreas,
  };
}

// Evidence-based heuristic scoring used when the AI evaluator is unavailable.
function localEvaluation(
  candidateAnswers: TranscriptMsg[],
  totalChars: number,
  pairs: QuestionAnswerPair[],
  role: string,
  transcript: TranscriptMsg[],
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
  const answerStructure = Math.max(1, Math.min(10, Math.round(
    (pairs.reduce((sum, pair) => sum + Object.values(starCoverageFor(pair.answer)).filter(Boolean).length, 0) / Math.max(1, pairs.length)) * 2.2 + 1,
  )));
  const roleKnowledge = specifics ? Math.min(10, base + 1) : Math.max(1, base - 1);
  const problemSolving = Math.max(1, base - (specifics ? 0 : 1));
  const evidenceQuality = Math.max(1, Math.min(10,
    2 + answers.filter((answer) => /\d/.test(answer)).length * 2 + answers.filter((answer) => /\bi\s+(built|led|owned|designed|implemented|decided|delivered)\b/i.test(answer)).length,
  ));
  const roleFit = /\b(led|managed|mentored|owned|stakeholder|customer|team)\b/i.test(joined) ? Math.min(10, base + 1) : Math.max(1, base - 2);

  const metrics = {
    communication,
    answerStructure,
    roleKnowledge,
    problemSolving,
    evidenceQuality,
    roleFit,
    // Compatibility aliases for older records. Visual/facial signals are 0 because they are deliberately not scored.
    confidence: communication,
    clarity: answerStructure,
    technicalKnowledge: roleKnowledge,
    leadership: roleFit,
    bodyLanguage: 0,
    eyeContact: 0,
    appearance: 0,
    posture: 0,
  };
  const scoredMetrics = [communication, answerStructure, roleKnowledge, problemSolving, evidenceQuality, roleFit];
  const avgMetric = scoredMetrics.reduce((s, v) => s + v, 0) / scoredMetrics.length;
  const score = Math.round(avgMetric * 10);

  const perQuestion = localPerQuestion(pairs);
  const highlights = localHighlights(answers, role, pairs, transcript);
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function sanitizePerQuestion(raw: unknown, fallback: PerQuestionFeedback[]): PerQuestionFeedback[] {
  if (!Array.isArray(raw)) return fallback;
  const cleaned: PerQuestionFeedback[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = asRecord(raw[i]);
    if (!item) continue;
    const question = typeof item.question === 'string' ? item.question : '';
    const betterAnswer = typeof item.betterAnswer === 'string' ? item.betterAnswer : '';
    if (!question && !betterAnswer) continue;
    const v = String(item.verdict || '').toLowerCase();
    const verdict: Verdict = v === 'strong' || v === 'adequate' || v === 'weak' ? v : 'adequate';
    const star = asRecord(item.starCoverage);
    const fbScore = fallback[i]?.score || (verdict === 'strong' ? 85 : verdict === 'adequate' ? 68 : 42);
    const score = typeof item.score === 'number' ? Math.max(0, Math.min(100, item.score)) : fbScore;

    cleaned.push({
      question: question || 'Interviewer question',
      answerSummary: typeof item.answerSummary === 'string' ? item.answerSummary : '',
      verdict,
      score,
      whatWorked: typeof item.whatWorked === 'string' ? item.whatWorked : '',
      whatWasMissing: typeof item.whatWasMissing === 'string' ? item.whatWasMissing : '',
      betterAnswer: ensureHonestFramework(betterAnswer || fallback[i]?.betterAnswer || ''),
      competency: typeof item.competency === 'string' ? item.competency : fallback[i]?.competency,
      evidence: fallback[i]?.evidence,
      uncertainty: typeof item.uncertainty === 'string' ? item.uncertainty : fallback[i]?.uncertainty,
      timestampSeconds: fallback[i]?.timestampSeconds,
      transcriptIndex: fallback[i]?.transcriptIndex,
      ...(star
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

function sanitizeHighlights(raw: unknown, fallback: EvaluationHighlights): EvaluationHighlights {
  const record = asRecord(raw);
  if (!record) return fallback;
  const strArr = (v: unknown, fb: string[]): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).slice(0, 8) : fb;
  const fw = asRecord(record.fillerWords);

  const challengeMoments = Array.isArray(record.challengeMoments) && record.challengeMoments.length > 0
    ? record.challengeMoments.map((value) => {
        const cm = asRecord(value) || {};
        return {
        question: typeof cm.question === 'string' ? cm.question : 'Topic',
        candidateAnswer: typeof cm.candidateAnswer === 'string' ? cm.candidateAnswer : '',
        followUp: typeof cm.followUp === 'string' ? cm.followUp : 'Interviewer follow-up',
        whatWasMissing: typeof cm.whatWasMissing === 'string' ? cm.whatWasMissing : '',
        timestamp: typeof cm.timestamp === 'string' ? cm.timestamp : undefined,
        };
      })
    : fallback.challengeMoments || [];

  const contradictions = Array.isArray(record.contradictions) && record.contradictions.length > 0
    ? record.contradictions.map((value) => {
        const ct = asRecord(value) || {};
        return {
        earlierStatement: typeof ct.earlierStatement === 'string' ? ct.earlierStatement : '',
        laterStatement: typeof ct.laterStatement === 'string' ? ct.laterStatement : '',
        explanation: typeof ct.explanation === 'string' ? ct.explanation : '',
        };
      })
    : fallback.contradictions || [];

  const practiceAreas = Array.isArray(record.practiceAreas) && record.practiceAreas.length > 0
    ? record.practiceAreas.map((value) => {
        const pa = asRecord(value) || {};
        return {
        title: typeof pa.title === 'string' ? pa.title : 'Practice Area',
        description: typeof pa.description === 'string' ? pa.description : '',
        actionItem: typeof pa.actionItem === 'string' ? pa.actionItem : '',
        };
      })
    : fallback.practiceAreas || [];

  return {
    quotedStrength: typeof record.quotedStrength === 'string' && record.quotedStrength.trim() ? record.quotedStrength : fallback.quotedStrength,
    quotedWeakness: typeof record.quotedWeakness === 'string' && record.quotedWeakness.trim() ? record.quotedWeakness : fallback.quotedWeakness,
    fillerWords:
      fw && typeof fw === 'object' && typeof fw.count === 'number'
        ? { count: fw.count, examples: strArr(fw.examples, fallback.fillerWords.examples) }
        : fallback.fillerWords,
    vagueClaims: strArr(record.vagueClaims, fallback.vagueClaims),
    missingKeywords: strArr(record.missingKeywords, fallback.missingKeywords),
    challengeMoments,
    contradictions,
    practiceAreas,
  };
}

const RUBRIC_VERSION = '2026.08.1';

function buildRubric(role: string, difficulty: string): EvaluationRubric {
  const lower = role.toLowerCase();
  const profile = /engineer|developer|architect|data|security|software|technical|analyst/.test(lower)
    ? 'technical'
    : /product|project|program|manager|lead|operations/.test(lower)
      ? 'leadership'
      : /sales|marketing|account|customer|business development/.test(lower)
        ? 'commercial'
        : 'general';
  const profiles: Record<string, Record<RubricMetric, number>> = {
    technical: { communication: 0.14, answerStructure: 0.16, roleKnowledge: 0.24, problemSolving: 0.20, evidenceQuality: 0.16, roleFit: 0.10 },
    leadership: { communication: 0.17, answerStructure: 0.17, roleKnowledge: 0.18, problemSolving: 0.18, evidenceQuality: 0.15, roleFit: 0.15 },
    commercial: { communication: 0.20, answerStructure: 0.15, roleKnowledge: 0.18, problemSolving: 0.15, evidenceQuality: 0.19, roleFit: 0.13 },
    general: { communication: 0.18, answerStructure: 0.17, roleKnowledge: 0.18, problemSolving: 0.17, evidenceQuality: 0.17, roleFit: 0.13 },
  };
  const labels: Record<RubricMetric, string> = {
    communication: 'Communication',
    answerStructure: 'Answer structure',
    roleKnowledge: 'Role knowledge',
    problemSolving: 'Problem solving',
    evidenceQuality: 'Evidence quality',
    roleFit: 'Role fit',
  };
  const descriptions: Record<RubricMetric, string> = {
    communication: 'Direct, concise and understandable spoken answers.',
    answerStructure: 'Logical answer flow, including STAR where appropriate.',
    roleKnowledge: `Accurate and relevant knowledge expected for ${role}.`,
    problemSolving: 'Reasoning, trade-offs, decisions and learning from outcomes.',
    evidenceQuality: 'Specific, attributable and measurable support for claims.',
    roleFit: `Transcript evidence that prior work and judgment match ${role} responsibilities.`,
  };
  const selected = profiles[profile];
  return {
    id: `interview-${profile}-${difficulty.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    version: RUBRIC_VERSION,
    role,
    difficulty,
    dimensions: (Object.keys(selected) as RubricMetric[]).map((key) => ({
      key,
      label: labels[key],
      weight: selected[key],
      description: descriptions[key],
    })),
    excludedSignals: ['personality', 'facial expression', 'emotion inference', 'eye contact', 'appearance', 'posture', 'accent'],
  };
}

function sanitizeRubricMetrics(raw: unknown, fallback: Record<string, number>): Record<string, number> {
  const record = asRecord(raw) || {};
  const value = (key: RubricMetric, legacy?: string) => {
    const candidate = record[key] ?? (legacy ? record[legacy] : undefined);
    const backup = fallback[key] ?? (legacy ? fallback[legacy] : undefined) ?? 1;
    if (typeof candidate !== 'number' || !Number.isFinite(candidate)) return clampMetric(backup);
    const normalized = candidate > 10 ? candidate / 10 : candidate;
    // The local evidence pass is the calibration anchor. A model may refine a
    // dimension, but cannot turn a sparse transcript into an unsupported 10/10.
    return clampMetric(Math.max(backup - 1.5, Math.min(backup + 1.5, normalized)));
  };
  const core = {
    communication: value('communication'),
    answerStructure: value('answerStructure', 'clarity'),
    roleKnowledge: value('roleKnowledge', 'technicalKnowledge'),
    problemSolving: value('problemSolving'),
    evidenceQuality: value('evidenceQuality'),
    roleFit: value('roleFit', 'leadership'),
  };
  return {
    ...core,
    confidence: core.communication,
    clarity: core.answerStructure,
    technicalKnowledge: core.roleKnowledge,
    leadership: core.roleFit,
    bodyLanguage: 0,
    eyeContact: 0,
    appearance: 0,
    posture: 0,
  };
}

function clampMetric(value: number): number {
  return Math.round(Math.max(1, Math.min(10, value)) * 10) / 10;
}

function scoreWithRubric(metrics: Record<string, number>, rubric: EvaluationRubric): number {
  const weighted = rubric.dimensions.reduce(
    (sum, dimension) => sum + (metrics[dimension.key] || 1) * dimension.weight,
    0,
  );
  return Math.max(0, Math.min(100, Math.round(weighted * 10)));
}

function ensureHonestFramework(value: string): string {
  const framework = value.trim();
  if (!framework) {
    return 'Situation: [real context] → Task: [your actual responsibility] → Action: [steps you personally took] → Result: [verified outcome].';
  }
  if (/\[[^\]]+\]|real|actual|verified|do not know/i.test(framework)) return framework;
  return `${framework} Replace every implied fact or number with your real, verifiable detail; use [verified outcome] when information is missing.`;
}

function enrichEvaluation(
  result: EvaluationResult,
  transcript: TranscriptMsg[],
  pairs: QuestionAnswerPair[],
  role: string,
  rubric: EvaluationRubric,
): EvaluationResult {
  const perQuestion = (Array.isArray(result.perQuestion) ? result.perQuestion : []) as PerQuestionFeedback[];
  const base = asRecord(result.highlights) || {};
  const strings = (value: unknown): string[] => Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
  const vagueClaims = strings(base.vagueClaims);
  const contradictions = (Array.isArray(base.contradictions) ? base.contradictions : [])
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((item) => ({
      earlierStatement: typeof item.earlierStatement === 'string' ? item.earlierStatement : '',
      laterStatement: typeof item.laterStatement === 'string' ? item.laterStatement : '',
      explanation: typeof item.explanation === 'string' ? item.explanation : 'The statements should be reconciled before drawing a conclusion.',
    }));
  const candidateAnswers = transcript.filter((message) => message.who === 'me');
  const specificAnswers = candidateAnswers.filter((message) => hasSpecifics(message.text)).length;
  const uncertaintyLevel: 'low' | 'medium' | 'high' = candidateAnswers.length < 3
    ? 'high'
    : specificAnswers < Math.ceil(candidateAnswers.length / 2)
      ? 'medium'
      : 'low';
  const readiness = buildReadiness(result.score, perQuestion, role);
  const verificationItems = buildVerificationItems(vagueClaims, contradictions, transcript);
  const topStrengths = buildTopStrengths(perQuestion, result.metrics, rubric);
  const topImprovements = buildTopImprovements(perQuestion, result.metrics, rubric);
  const sevenDayPlan = buildSevenDayPlan(perQuestion, result.metrics, rubric, role);
  const moments = perQuestion.map((item, questionIndex) => ({
    level: (feedbackScore(item) >= 78 ? 'strong' : feedbackScore(item) < 48 ? 'critical' : 'improve') as MomentLevel,
    title: `${feedbackScore(item) >= 78 ? 'Strong' : feedbackScore(item) < 48 ? 'Critical' : 'Improve'}: ${item.competency || competencyForQuestion(item.question)}`,
    summary: feedbackScore(item) >= 78 ? item.whatWorked : item.whatWasMissing,
    evidence: item.evidence || pairs[questionIndex]?.answer || item.answerSummary,
    timestampSeconds: item.timestampSeconds ?? pairs[questionIndex]?.timestampSeconds,
    transcriptIndex: item.transcriptIndex ?? pairs[questionIndex]?.transcriptIndex ?? 0,
    questionIndex,
  })).slice(0, 8);

  return {
    ...result,
    perQuestion,
    highlights: {
      ...base,
      rubric,
      readiness,
      uncertainty: {
        level: uncertaintyLevel,
        explanation: uncertaintyLevel === 'low'
          ? 'Most answers contain enough specific transcript evidence for a useful practice assessment.'
          : 'Some assessments rely on limited or general evidence. Treat them as coaching hypotheses, not facts.',
        missingEvidence: [...new Set([
          ...strings(base.missingKeywords).slice(0, 3),
          ...(vagueClaims.length > 0 ? ['verified outcomes for broad claims'] : []),
        ])],
      },
      moments,
      verificationItems,
      topStrengths,
      topImprovements,
      sevenDayPlan,
    },
  };
}

function buildReadiness(score: number, perQuestion: PerQuestionFeedback[], role: string) {
  const weak = perQuestion.filter((item) => item.verdict === 'weak').length;
  const label = score >= 80 ? 'Ready for realistic practice' : score >= 65 ? 'Nearly ready' : 'Build core evidence first';
  const explanation = score >= 80
    ? `Your transcript shows repeatable, evidence-backed answers for ${role}; keep testing them under realistic pressure.`
    : score >= 65
      ? `You show useful foundations for ${role}, but ${weak || 'some'} answer(s) still need clearer evidence or structure.`
      : `The transcript does not yet show consistent, evidence-backed answers for ${role}. Complete the practice plan before relying on this score.`;
  return {
    label,
    explanation,
    evidenceBasis: `${perQuestion.length} answered question(s) were scored from transcript evidence with rubric ${RUBRIC_VERSION}.`,
    limitation: 'This is a practice-readiness signal, not a hiring recommendation or a validated ranking against other candidates.',
  };
}

function buildVerificationItems(
  vagueClaims: string[],
  contradictions: { earlierStatement: string; laterStatement: string; explanation: string }[],
  transcript: TranscriptMsg[],
) {
  const locate = (text: string) => {
    const needle = text.toLowerCase().replace(/\.\.\.$/, '').slice(0, 45);
    const index = transcript.findIndex((message) => message.who === 'me' && message.text.toLowerCase().includes(needle));
    return { transcriptIndex: Math.max(0, index), timestampSeconds: index >= 0 ? transcript[index].timestampSeconds : undefined };
  };
  const items: NonNullable<EvaluationHighlights['verificationItems']> = vagueClaims.slice(0, 4).map((claim) => ({
    type: 'unsupported_claim',
    label: 'Impact claim to verify',
    evidence: claim,
    guidance: 'Add the baseline, your contribution, measurement method and verified result.',
    ...locate(claim),
  }));
  for (const contradiction of contradictions.slice(0, 3)) {
    items.push({
      type: 'contradiction',
      label: 'Statement to reconcile',
      evidence: `${contradiction.earlierStatement} / ${contradiction.laterStatement}`,
      guidance: 'Clarify scope or timeframe and identify which statement is accurate. This is an item to verify, not an accusation.',
      ...locate(contradiction.laterStatement),
    });
  }
  return items;
}

function buildTopStrengths(perQuestion: PerQuestionFeedback[], metrics: Record<string, number>, rubric: EvaluationRubric) {
  const ranked = [...perQuestion].sort((a, b) => feedbackScore(b) - feedbackScore(a));
  const items = ranked.slice(0, 3).map((item) => ({
    title: item.competency || competencyForQuestion(item.question),
    evidence: `"${item.evidence || item.answerSummary}"`,
    whyItMatters: item.whatWorked,
  }));
  const strongestDimensions = [...rubric.dimensions].sort((a, b) => metrics[b.key] - metrics[a.key]);
  while (items.length < 3) {
    const dimension = strongestDimensions[items.length];
    items.push({
      title: dimension.label,
      evidence: `Rubric score ${metrics[dimension.key]}/10`,
      whyItMatters: 'This is the strongest available signal, although more transcript evidence is needed.',
    });
  }
  return items;
}

function buildTopImprovements(perQuestion: PerQuestionFeedback[], metrics: Record<string, number>, rubric: EvaluationRubric) {
  const weakAnswers = [...perQuestion].sort((a, b) => feedbackScore(a) - feedbackScore(b));
  return [...rubric.dimensions]
    .sort((a, b) => metrics[a.key] - metrics[b.key])
    .slice(0, 3)
    .map((dimension, index) => ({
      title: dimension.label,
      evidence: weakAnswers[index]?.evidence ? `"${weakAnswers[index].evidence}"` : `Only ${metrics[dimension.key]}/10 evidence was available.`,
      action: weakAnswers[index]?.whatWasMissing || `Prepare one truthful example demonstrating ${dimension.description.toLowerCase()}`,
    }));
}

function buildSevenDayPlan(perQuestion: PerQuestionFeedback[], metrics: Record<string, number>, rubric: EvaluationRubric, role: string) {
  const dimensions = [...rubric.dimensions].sort((a, b) => metrics[a.key] - metrics[b.key]);
  const weakQuestions = [...perQuestion].sort((a, b) => feedbackScore(a) - feedbackScore(b));
  const exercises = [
    'Write one truthful STAR outline using only facts you can defend.',
    'Record a 60-90 second answer and remove the first unnecessary sentence.',
    'Add a baseline, measurement method and verified result to one achievement.',
    `Review one ${role} scenario and explain two alternatives plus the trade-off.`,
    'Replace every broad "we" with the exact action you personally owned, where accurate.',
    'Answer the weakest question again without reading your previous wording.',
    'Run a five-question mini interview and compare the same rubric dimensions.',
  ];
  return Array.from({ length: 7 }, (_, index) => {
    const dimension = dimensions[index % dimensions.length];
    const weak = weakQuestions[index % Math.max(1, weakQuestions.length)];
    return {
      day: index + 1,
      focus: dimension.label,
      exercise: exercises[index],
      successMeasure: index === 6
        ? 'Complete all five answers and improve the lowest rubric dimension.'
        : 'Produce one answer with clear context, personal action and verifiable evidence.',
      ...(weak ? { practiceQuestion: weak.question } : {}),
    };
  });
}

function feedbackScore(item: PerQuestionFeedback): number {
  return item.score ?? (item.verdict === 'strong' ? 85 : item.verdict === 'adequate' ? 65 : 40);
}

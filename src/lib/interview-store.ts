import { createClient } from '@/lib/supabase';

export type AnswerVerdict = 'strong' | 'adequate' | 'weak';

export interface StarCoverage {
  situation: boolean;
  task: boolean;
  action: boolean;
  result: boolean;
}

export interface ChallengeMoment {
  question: string;
  candidateAnswer: string;
  followUp: string;
  whatWasMissing: string;
  timestamp?: string;
}

export interface ContradictionPoint {
  earlierStatement: string;
  laterStatement: string;
  explanation: string;
}

export interface PracticeArea {
  title: string;
  description: string;
  actionItem: string;
}

export interface RetakeResult {
  question: string;
  previousScore: number;
  newScore: number;
  date: string;
  feedback: string;
  improvedKeywords?: string[];
}

/** Evidence-based feedback for a single interviewer question the candidate answered. */
export interface PerQuestionFeedback {
  question: string;
  answerSummary: string;
  verdict: AnswerVerdict;
  whatWorked: string;
  whatWasMissing: string;
  /** A concrete rewrite of THEIR answer, not generic advice. */
  betterAnswer: string;
  starCoverage?: StarCoverage;
  score?: number; // 0-100 for this specific answer
  retakes?: RetakeResult[];
}

/** Concrete, quotable specifics pulled from the candidate's own words. */
export interface InterviewHighlights {
  quotedStrength: string;
  quotedWeakness: string;
  fillerWords: { count: number; examples: string[] };
  vagueClaims: string[];
  missingKeywords: string[];
  challengeMoments?: ChallengeMoment[];
  contradictions?: ContradictionPoint[];
  practiceAreas?: PracticeArea[];
}

export interface InterviewRecord {
  id: string;
  type: string; // 'HR Round', 'Technical', 'Behavioral'
  role: string; // 'Product Manager', etc.
  difficulty: string;
  date: string; // ISO string
  duration: number; // seconds
  questionsCount: number;
  score: number; // 0-100, calculated from answers
  transcript: { who: 'ai' | 'me'; text: string }[];
  metrics: {
    communication: number;
    confidence: number;
    clarity: number;
    bodyLanguage: number;
    eyeContact: number;
    appearance: number;
    posture: number;
    technicalKnowledge: number;
    problemSolving: number;
    leadership: number;
  };
  feedback: {
    strengths: string;
    improvements: string;
    nextStep: string;
  };
  /** Optional so records saved before this feature still typecheck and render. */
  perQuestion?: PerQuestionFeedback[];
  /** Optional for the same backwards-compatibility reason. */
  highlights?: InterviewHighlights;
  retakes?: RetakeResult[];
  dbId?: string; // Supabase interviews.id once synced (for cross-device)
}

const STORAGE_KEY = 'interviewace_interviews';

function readStore(): InterviewRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as InterviewRecord[];
  } catch {
    return [];
  }
}

function writeStore(records: InterviewRecord[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// ── Deterministic transcript analysis ────────────────────────────────────────
// Used to backfill per-question feedback / highlights for records that were
// saved (or reconstructed from the DB) without them, so the report is never
// empty when a transcript exists. The API's evaluator produces richer output;
// this is the guaranteed floor.

const FILLERS: { label: string; re: RegExp }[] = [
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

const GENERIC_KEYWORDS = [
  'impact', 'metrics', 'stakeholders', 'ownership', 'collaboration',
  'deadline', 'result', 'team', 'customer', 'process', 'challenge',
];

function clip(text: string, max: number): string {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, Math.max(0, max - 3))}...` : clean;
}

function answerHasSpecifics(text: string): boolean {
  return /\d/.test(text)
    || /\b(increased|reduced|improved|launched|shipped|migrated|automated|led|owned|built|designed|managed|mentored)\b/i.test(text);
}

function starFor(answer: string): StarCoverage {
  return {
    situation: answer.length > 60 && /\b(at|when|while|during|we were|our team|in my (last|previous)|at my (last|previous))\b/i.test(answer),
    task: /\b(i (was )?(asked|responsible|tasked|needed|had to)|my (job|role|goal|task)|the goal|objective)\b/i.test(answer),
    action: /\bi (built|created|designed|implemented|led|wrote|set up|coordinated|analysed|analyzed|refactored|proposed|decided|automated|tested|organised|organized)\b/i.test(answer),
    result: /\d+\s*%|\bby \d|\b(result|outcome|impact|increased|reduced|saved|grew|improved|delivered|shipped|launched)\b/i.test(answer),
  };
}

/** Pairs each interviewer turn with the candidate turn(s) that followed it. */
export function pairTranscript(transcript: InterviewRecord['transcript']): { question: string; answer: string }[] {
  const pairs: { question: string; answer: string }[] = [];
  for (let i = 0; i < transcript.length; i++) {
    if (transcript[i]?.who !== 'ai') continue;
    const parts: string[] = [];
    for (let j = i + 1; j < transcript.length; j++) {
      if (transcript[j].who === 'ai') break;
      if (transcript[j].text) parts.push(transcript[j].text);
    }
    const answer = parts.join(' ').trim();
    if (!answer) continue;
    pairs.push({ question: (transcript[i].text || '').trim(), answer });
  }
  return pairs;
}

/**
 * Derives per-question feedback and highlights straight from the transcript.
 * Never returns empty per-question output when the candidate answered at least
 * one question.
 */
export function deriveInsightsFromTranscript(
  transcript: InterviewRecord['transcript'],
  role: string,
): { perQuestion: PerQuestionFeedback[]; highlights: InterviewHighlights } {
  const pairs = pairTranscript(transcript || []);
  const answers = (transcript || []).filter((m) => m.who === 'me').map((m) => m.text || '').filter(Boolean);
  const joined = answers.join(' ');

  const perQuestion: PerQuestionFeedback[] = pairs.map(({ question, answer }) => {
    const specific = answerHasSpecifics(answer);
    const star = starFor(answer);
    const starCount = Object.values(star).filter(Boolean).length;
    const words = answer.split(/\s+/).filter(Boolean).length;

    let verdict: AnswerVerdict = 'weak';
    if (answer.length >= 260 && specific && starCount >= 3) verdict = 'strong';
    else if (answer.length >= 110 && (specific || starCount >= 2)) verdict = 'adequate';
    else if (answer.length >= 200) verdict = 'adequate';

    const missing: string[] = [];
    if (!specific) missing.push('any number, metric or measurable outcome');
    if (!star.situation) missing.push('the context you were working in');
    if (!star.action) missing.push('the specific actions you personally took');
    if (!star.result) missing.push('the result and what changed because of you');
    if (answer.length < 110) missing.push('depth — this needs 60-90 seconds of speech');

    let itemScore = 50;
    if (verdict === 'strong') itemScore = Math.min(95, 80 + Math.round(Math.min(20, (answer.length - 260) / 15)));
    else if (verdict === 'adequate') itemScore = Math.min(78, 60 + Math.round(Math.min(18, (answer.length - 110) / 10)));
    else itemScore = Math.max(25, 30 + Math.round(Math.min(25, answer.length / 10)));

    return {
      question: question || 'Interviewer question',
      answerSummary: `You said: "${clip(answer, 120)}" (${words} words).`,
      verdict,
      score: itemScore,
      whatWorked: verdict === 'weak'
        ? `Very little — "${clip(answer, 60)}" gives the interviewer nothing to assess.`
        : specific
          ? `You stayed on topic and gave concrete detail: "${clip(answer, 70)}".`
          : `You answered directly and kept a clear line of thought ("${clip(answer, 60)}").`,
      whatWasMissing: missing.length > 0
        ? `Your answer left out ${missing.slice(0, 3).join(', ')}.`
        : 'Nothing major missing — tighten the delivery and lead with the result.',
      betterAnswer: `"${clip(answer, 100)}" is the right starting point — anchor it: "In my last role, when ${clip(question || 'this came up', 60).replace(/\?$/, '').toLowerCase()}, I owned [the specific piece of work]." Then walk through what you actually did, step by step. ${specific
        ? 'Close by tying the number you mentioned back to business impact.'
        : 'Close with the measurable result you never gave: "...which cut [X] by [Y%] in [timeframe]."'}`,
      starCoverage: star,
    };
  });

  let fillerCount = 0;
  const fillerExamples: string[] = [];
  for (const f of FILLERS) {
    const hits = joined.match(f.re);
    if (hits && hits.length > 0) {
      fillerCount += hits.length;
      fillerExamples.push(`${f.label} (${hits.length}x)`);
    }
  }

  const vagueClaims: string[] = [];
  const claimish = /\b(i am|i'm|i was|i have|i've|we|my|i can|i always|i usually|good at|strong|experienced|passionate|expert|responsible for|worked on|handled)\b/i;
  for (const a of answers) {
    for (const s of a.split(/(?<=[.!?])\s+|\n+/).map((x) => x.trim()).filter(Boolean)) {
      if (s.length < 25 || /\d/.test(s) || !claimish.test(s)) continue;
      vagueClaims.push(clip(s, 160));
      if (vagueClaims.length >= 5) break;
    }
    if (vagueClaims.length >= 5) break;
  }

  const lower = joined.toLowerCase();
  const roleTerms = (role || '').toLowerCase().split(/[^a-z0-9+#.]+/).filter((w) => w.length > 3);
  const missingKeywords: string[] = [];
  for (const term of Array.from(new Set([...roleTerms, ...GENERIC_KEYWORDS]))) {
    if (!lower.includes(term)) missingKeywords.push(term);
    if (missingKeywords.length >= 8) break;
  }

  // Derive Challenge Moments (probes where interviewer questioned claims/choices)
  const challengeMoments: ChallengeMoment[] = [];
  for (let i = 1; i < pairs.length; i++) {
    const q = pairs[i].question;
    const prevA = pairs[i - 1]?.answer || '';
    const isProbe = /\b(you mentioned|why did you|what specifically|can you walk me through|how did you measure|when you say|what alternatives|biggest challenge|your specific role)\b/i.test(q);
    if (isProbe && prevA) {
      challengeMoments.push({
        question: pairs[i - 1].question,
        candidateAnswer: clip(prevA, 140),
        followUp: q,
        whatWasMissing: pairs[i - 1].answer.length < 120 ? 'Initial answer lacked specific metrics or methodology.' : 'Interviewer probed to verify technical decision or direct personal attribution.',
      });
      if (challengeMoments.length >= 3) break;
    }
  }

  // 3 Targeted Practice Areas
  const practiceAreas: PracticeArea[] = [
    {
      title: 'STAR Answer Structure',
      description: 'Format behavioral and experience stories with clear Situation, Task, Action, and Result.',
      actionItem: 'Spend 70% of answer time describing actions YOU personally took, ending with a quantified result.',
    },
    {
      title: 'Quantifying Achievements & Metrics',
      description: vagueClaims.length > 0
        ? `Replace vague claims like "${clip(vagueClaims[0], 60)}" with concrete numbers, percentages, or time savings.`
        : 'State specific baseline vs final metrics for every project mentioned.',
      actionItem: 'Use formulas like "Accomplished [X] as measured by [Y] by doing [Z]".',
    },
    {
      title: missingKeywords.length > 0 ? 'Industry & Role Terminology' : 'Clarify Personal Ownership ("I" vs "We")',
      description: missingKeywords.length > 0
        ? `Incorporate expected domain keywords: ${missingKeywords.slice(0, 4).join(', ')}.`
        : 'Specify exactly what you owned versus what the broader team delivered.',
      actionItem: missingKeywords.length > 0
        ? `Demonstrate familiarity with ${missingKeywords.slice(0, 3).join(', ')} in your project walk-throughs.`
        : 'Clearly distinguish your individual technical/strategic decisions from group efforts.',
    },
  ];

  const sorted = [...answers].sort((a, b) => b.length - a.length);
  const best = sorted[0] || '';
  const worst = sorted.length > 0 ? sorted[sorted.length - 1] : '';

  return {
    perQuestion,
    highlights: {
      quotedStrength: best
        ? `"${clip(best, 100)}" — your fullest answer${answerHasSpecifics(best) ? ', and it carried concrete detail the interviewer can follow up on.' : ', though it still needs a measurable outcome to land.'}`
        : 'No answer was substantial enough to quote as a strength.',
      quotedWeakness: worst
        ? `"${clip(worst, 100)}" — too thin to score: no context, no action, no result.`
        : 'No candidate speech was captured, so there is nothing to assess.',
      fillerWords: { count: fillerCount, examples: fillerExamples.slice(0, 6) },
      vagueClaims,
      missingKeywords,
      challengeMoments,
      practiceAreas,
    },
  };
}

/** Fills in per-question / highlights detail when the evaluator did not supply it. */
export function withDerivedInsights(record: InterviewRecord): InterviewRecord {
  const hasPerQuestion = Array.isArray(record.perQuestion) && record.perQuestion.length > 0;
  const hasHighlights = !!record.highlights;
  if (hasPerQuestion && hasHighlights) return record;
  if (!record.transcript || record.transcript.length === 0) return record;

  const derived = deriveInsightsFromTranscript(record.transcript, record.role);
  return {
    ...record,
    perQuestion: hasPerQuestion ? record.perQuestion : derived.perQuestion,
    highlights: hasHighlights ? record.highlights : derived.highlights,
  };
}

// ── DB mapping helpers (match the interviews table CHECK constraints) ──
function toDbType(t: string): 'hr' | 'technical' | 'behavioral' {
  const s = (t || '').toLowerCase();
  if (s.includes('tech')) return 'technical';
  if (s.includes('behav')) return 'behavioral';
  return 'hr';
}
function fromDbType(t: string): string {
  return t === 'technical' ? 'Technical' : t === 'behavioral' ? 'Behavioral' : 'HR Round';
}
function toDbDiff(d: string): 'fresher' | 'intermediate' | 'advanced' {
  const s = (d || '').toLowerCase();
  if (s.includes('fresh') || s.includes('begin') || s.includes('easy')) return 'fresher';
  if (s.includes('adv') || s.includes('hard') || s.includes('expert') || s.includes('senior')) return 'advanced';
  return 'intermediate';
}
function fromDbDiff(d: string): string {
  return d === 'fresher' ? 'Fresher' : d === 'advanced' ? 'Advanced' : 'Intermediate';
}

// The interview_feedback table only has text[] columns for strengths /
// improvements, so the extra highlight detail is stored as tagged extra rows
// (index 0 stays the plain summary text for backwards compatibility).
const TAG_QUOTED_STRENGTH = 'Quoted strength: ';
const TAG_QUOTED_WEAKNESS = 'Quoted weakness: ';
const TAG_FILLERS = 'Filler words: ';
const TAG_VAGUE = 'Vague claims: ';
const TAG_MISSING = 'Missing keywords: ';

function buildStrengthsRows(record: InterviewRecord): string[] {
  const rows = [record.feedback.strengths];
  const h = record.highlights;
  if (h?.quotedStrength) rows.push(TAG_QUOTED_STRENGTH + h.quotedStrength);
  return rows;
}

function buildImprovementRows(record: InterviewRecord): string[] {
  const rows = [record.feedback.improvements];
  const h = record.highlights;
  if (!h) return rows;
  if (h.quotedWeakness) rows.push(TAG_QUOTED_WEAKNESS + h.quotedWeakness);
  if (h.fillerWords) rows.push(`${TAG_FILLERS}${h.fillerWords.count} | ${(h.fillerWords.examples || []).join(', ')}`);
  if (h.vagueClaims?.length) rows.push(TAG_VAGUE + h.vagueClaims.join(' || '));
  if (h.missingKeywords?.length) rows.push(TAG_MISSING + h.missingKeywords.join(', '));
  return rows;
}

/** Rebuilds the highlights object from the tagged rows written above. */
function parseHighlightRows(strengths: unknown, improvements: unknown): InterviewHighlights | undefined {
  const all = [
    ...(Array.isArray(strengths) ? strengths : []),
    ...(Array.isArray(improvements) ? improvements : []),
  ].filter((r): r is string => typeof r === 'string');

  const find = (tag: string) => all.find((r) => r.startsWith(tag))?.slice(tag.length).trim();
  const quotedStrength = find(TAG_QUOTED_STRENGTH);
  const quotedWeakness = find(TAG_QUOTED_WEAKNESS);
  const fillerRaw = find(TAG_FILLERS);
  const vagueRaw = find(TAG_VAGUE);
  const missingRaw = find(TAG_MISSING);
  if (!quotedStrength && !quotedWeakness && !fillerRaw && !vagueRaw && !missingRaw) return undefined;

  const [countPart, examplePart] = (fillerRaw || '').split('|');
  const count = Number.parseInt((countPart || '').trim(), 10);

  return {
    quotedStrength: quotedStrength || '',
    quotedWeakness: quotedWeakness || '',
    fillerWords: {
      count: Number.isFinite(count) ? count : 0,
      examples: (examplePart || '').split(',').map((s) => s.trim()).filter(Boolean),
    },
    vagueClaims: (vagueRaw || '').split('||').map((s) => s.trim()).filter(Boolean),
    missingKeywords: (missingRaw || '').split(',').map((s) => s.trim()).filter(Boolean),
  };
}

/** The first untagged row — keeps legacy single-entry arrays working. */
function plainRow(rows: unknown, fallback: string): string {
  if (!Array.isArray(rows)) return fallback;
  const first = rows.find(
    (r): r is string =>
      typeof r === 'string'
      && r.trim().length > 0
      && ![TAG_QUOTED_STRENGTH, TAG_QUOTED_WEAKNESS, TAG_FILLERS, TAG_VAGUE, TAG_MISSING].some((t) => r.startsWith(t)),
  );
  return first || fallback;
}

// Persists a full interview (core row + feedback + Q&A) to Supabase for the
// signed-in user. Best-effort: returns the new DB id or null on any failure, so
// the localStorage flow always works even when offline / not signed in.
export async function persistInterviewToDb(record: InterviewRecord): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: inserted, error } = await supabase
      .from('interviews')
      .insert({
        user_id: user.id,
        interview_type: toDbType(record.type),
        difficulty: toDbDiff(record.difficulty),
        target_role: record.role || 'General',
        duration_seconds: record.duration,
        overall_score: Math.round(record.score),
        status: 'completed',
        completed_at: record.date,
      })
      .select('id')
      .single();
    if (error || !inserted?.id) return null;
    const interviewId = inserted.id as string;

    const m = record.metrics;
    await supabase.from('interview_feedback').insert({
      interview_id: interviewId,
      communication_score: m.communication,
      confidence_score: m.confidence,
      clarity_score: m.clarity,
      body_language_score: m.bodyLanguage,
      eye_contact_score: m.eyeContact,
      posture_score: m.posture,
      appearance_score: m.appearance,
      technical_score: m.technicalKnowledge,
      problem_solving_score: m.problemSolving,
      leadership_score: m.leadership,
      strengths: buildStrengthsRows(record),
      improvements: buildImprovementRows(record),
      summary: record.feedback.nextStep,
    });

    // Store the transcript as Q&A pairs (each AI turn + the following answer).
    const qa: { interview_id: string; question_number: number; question: string; answer: string }[] = [];
    let qn = 0;
    for (let i = 0; i < record.transcript.length; i++) {
      if (record.transcript[i].who === 'ai') {
        const answer = record.transcript[i + 1]?.who === 'me' ? record.transcript[i + 1].text : '';
        qn += 1;
        qa.push({ interview_id: interviewId, question_number: qn, question: record.transcript[i].text, answer });
      }
    }
    if (qa.length > 0) await supabase.from('interview_qa').insert(qa);

    return interviewId;
  } catch {
    return null;
  }
}

// Reconstructs the signed-in user's interviews from Supabase.
export async function fetchInterviewsFromDb(): Promise<InterviewRecord[]> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data: rows } = await supabase
      .from('interviews')
      .select('*, interview_feedback(*), interview_qa(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!rows) return [];

    return rows.map((r: any): InterviewRecord => withDerivedInsights(mapDbRow(r)));
  } catch {
    return [];
  }
}

function mapDbRow(r: any): InterviewRecord {
  const fb = Array.isArray(r.interview_feedback) ? r.interview_feedback[0] : r.interview_feedback;
  const qaRows = (r.interview_qa || []).sort((a: any, b: any) => a.question_number - b.question_number);
  const transcript: InterviewRecord['transcript'] = [];
  for (const qa of qaRows) {
    if (qa.question) transcript.push({ who: 'ai', text: qa.question });
    if (qa.answer) transcript.push({ who: 'me', text: qa.answer });
  }
  const n = (v: any, d = 5.5) => (typeof v === 'number' ? v : d);
  const highlights = parseHighlightRows(fb?.strengths, fb?.improvements);
  return {
    id: r.id,
    dbId: r.id,
    type: fromDbType(r.interview_type),
    role: r.target_role || 'General',
    difficulty: fromDbDiff(r.difficulty),
    date: r.completed_at || r.created_at,
    duration: r.duration_seconds || 0,
    questionsCount: qaRows.length,
    score: r.overall_score || 0,
    transcript,
    metrics: {
      communication: n(fb?.communication_score),
      confidence: n(fb?.confidence_score),
      clarity: n(fb?.clarity_score),
      bodyLanguage: n(fb?.body_language_score),
      eyeContact: n(fb?.eye_contact_score),
      appearance: n(fb?.appearance_score),
      posture: n(fb?.posture_score),
      technicalKnowledge: n(fb?.technical_score),
      problemSolving: n(fb?.problem_solving_score),
      leadership: n(fb?.leadership_score),
    },
    feedback: {
      strengths: plainRow(fb?.strengths, 'You completed the session.'),
      improvements: plainRow(fb?.improvements, 'Give longer, more detailed answers with concrete examples.'),
      nextStep: fb?.summary || 'Retake the interview and aim for structured answers.',
    },
    ...(highlights ? { highlights } : {}),
  };
}

// Merges DB records with any local records not yet synced, then rewrites the
// cache. Call on dashboard / history / analysis mount so records appear on every
// device they log into — not just the browser the interview was practiced on.
export async function hydrateInterviews(): Promise<InterviewRecord[]> {
  const local = readStore();
  const db = await fetchInterviewsFromDb();

  // Sync unsynced interviews to Supabase
  const unsynced = local.filter((r) => !r.dbId);
  if (unsynced.length > 0) {
    for (const record of unsynced) {
      const dbId = await persistInterviewToDb(record);
      if (dbId) {
        record.dbId = dbId;
      }
    }
    writeStore(local);
  }

  if (db.length === 0) return local;

  const dbIds = new Set(db.map((d) => d.id));
  const remainingUnsynced = local.filter((r) => !r.dbId || !dbIds.has(r.dbId));
  const merged = [...db, ...remainingUnsynced];
  writeStore(merged);
  return merged;
}

export function saveInterview(record: InterviewRecord): void {
  // Backfill per-question feedback / highlights when the caller did not supply
  // them, so every new record has an evidence-based breakdown.
  const enriched = withDerivedInsights(record);
  const records = readStore();
  records.push(enriched);
  writeStore(records);
  // Best-effort DB sync; on success, tag the cached record with its DB id.
  void persistInterviewToDb(enriched).then((dbId) => {
    if (!dbId) return;
    const recs = readStore();
    const idx = recs.findIndex((r) => r.id === enriched.id);
    if (idx >= 0) { recs[idx].dbId = dbId; writeStore(recs); }
  });
}

export function getInterviews(): InterviewRecord[] {
  return readStore();
}

export function getLatestInterview(): InterviewRecord | null {
  const records = readStore();
  if (records.length === 0) return null;
  return records[records.length - 1];
}

export function getInterviewById(id: string): InterviewRecord | null {
  const records = readStore();
  return records.find((r) => r.id === id || r.dbId === id) ?? null;
}

export function addRetakeResult(interviewId: string, questionIdx: number, retake: RetakeResult): InterviewRecord | null {
  const records = readStore();
  const idx = records.findIndex((r) => r.id === interviewId || r.dbId === interviewId);
  if (idx < 0) return null;
  const record = records[idx];
  
  if (!record.retakes) record.retakes = [];
  record.retakes.push(retake);

  if (record.perQuestion && record.perQuestion[questionIdx]) {
    if (!record.perQuestion[questionIdx].retakes) {
      record.perQuestion[questionIdx].retakes = [];
    }
    record.perQuestion[questionIdx].retakes!.push(retake);
    if (retake.newScore > (record.perQuestion[questionIdx].score || 0)) {
      record.perQuestion[questionIdx].score = retake.newScore;
      if (retake.newScore >= 80) record.perQuestion[questionIdx].verdict = 'strong';
      else if (retake.newScore >= 60) record.perQuestion[questionIdx].verdict = 'adequate';
    }
  }

  writeStore(records);
  return record;
}

export function clearInterviews(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

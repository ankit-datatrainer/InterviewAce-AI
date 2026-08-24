export const INTERVIEW_DECISIONS = [
  'PROBE', 'CLARIFY', 'CHALLENGE', 'COUNTER', 'INTERRUPT', 'MOVE_ON',
  // Compatibility with stored interviews and the existing analysis UI.
  'EVIDENCE', 'CONTRADICTION',
] as const;

export type InterviewDecision = (typeof INTERVIEW_DECISIONS)[number];
export type InterviewPhase = 'INTRODUCTION' | 'BACKGROUND' | 'RESUME_JD' | 'ROLE_DEPTH' | 'BEHAVIORAL' | 'SCENARIO' | 'CLOSING' | 'COMPLETE';
export type InterviewCompetency = 'ROLE_EXPERTISE' | 'PROBLEM_SOLVING' | 'IMPACT' | 'OWNERSHIP' | 'COMMUNICATION' | 'COLLABORATION' | 'LEADERSHIP' | 'ADAPTABILITY';
export type AdaptiveDifficulty = 'FOUNDATIONAL' | 'STANDARD' | 'ADVANCED' | 'STRETCH';
export type ClaimKind = 'metric' | 'achievement' | 'leadership' | 'technical_decision' | 'ownership' | 'vague' | 'experience';

export interface InterviewTranscriptMessage {
  who: 'ai' | 'me';
  text: string;
  decision?: InterviewDecision;
  latencyMs?: number;
  timestampSeconds?: number;
  claims?: string[];
}

export interface CandidateClaim {
  kind: ClaimKind;
  text: string;
  turn: number;
  key?: string;
  value?: string | number;
  source?: 'ANSWER' | 'RESUME';
  evidence?: string[];
  competency?: InterviewCompetency;
}

export interface InterviewContext {
  role: string;
  difficulty: string;
  interviewType?: string;
  customJD?: string;
  resumeText?: string;
  maxQuestions?: number;
  durationMinutes?: number;
  elapsedSeconds?: number;
}

export interface InterviewPlanItem {
  phase: InterviewPhase;
  competency: InterviewCompetency;
  objective: string;
  source: 'CORE' | 'RESUME' | 'JOB_DESCRIPTION';
  anchor?: string;
  minutes: number;
  priority: number;
}

export interface InterviewPlan {
  durationMinutes: number;
  resumeClaims: string[];
  jobRequirements: string[];
  items: InterviewPlanItem[];
}

export interface InterviewContradiction {
  kind: 'ANSWER_VS_ANSWER' | 'RESUME_VS_ANSWER';
  earlier: CandidateClaim;
  current: CandidateClaim;
  resolved: boolean;
}

export interface UnresolvedProbe {
  id: string;
  claim: CandidateClaim;
  competency: InterviewCompetency;
  firstTurn: number;
  attempts: number;
  reason: string;
}

export interface CompetencyCoverage {
  competency: InterviewCompetency;
  asked: number;
  evidence: number;
  confidence: number;
}

export interface InterviewState {
  claims: CandidateClaim[];
  evidence: CandidateClaim[];
  weaknesses: string[];
  contradictions: InterviewContradiction[];
  unresolvedProbes: UnresolvedProbe[];
  competencyCoverage: CompetencyCoverage[];
  adaptiveDifficulty: AdaptiveDifficulty;
  answerQuality: number;
  elapsedSeconds: number;
  remainingSeconds: number;
}

export interface DecisionResult {
  decision: InterviewDecision;
  reason: string;
  phase: InterviewPhase;
  complete: boolean;
  targetClaim?: CandidateClaim;
  contradiction?: { earlier: CandidateClaim; current: CandidateClaim };
  claims: CandidateClaim[];
  memory: CandidateClaim[];
  followUpDepth: number;
  fallbackReply: string;
  state: InterviewState;
  /** Consumed on the server only and deliberately omitted from API responses. */
  privatePlan: InterviewPlan;
  nextPlanItem?: InterviewPlanItem;
}

const COMPETENCIES: InterviewCompetency[] = ['ROLE_EXPERTISE', 'PROBLEM_SOLVING', 'IMPACT', 'OWNERSHIP', 'COMMUNICATION', 'COLLABORATION', 'LEADERSHIP', 'ADAPTABILITY'];
const FOLLOW_UP_DECISIONS = new Set<InterviewDecision>(['PROBE', 'CLARIFY', 'CHALLENGE', 'COUNTER', 'EVIDENCE', 'CONTRADICTION']);
const VAGUE_WORDS = /\b(significantly|substantially|a lot|many|huge|massive|good|great|successful|better|fast|large scale|large volume|somewhat|various|several|handled|worked on|responsible for)\b/i;
const ACHIEVEMENT_WORDS = /\b(increased|grew|improved|reduced|saved|delivered|launched|shipped|built|created|designed|implemented|automated|optimized|optimised|scaled|migrated|transformed|changed|restructured|focused)\b/i;
const LEADERSHIP_WORDS = /\b(managed|led|mentored|supervised|owned|headed|coordinated|responsible for)\b/i;
const TECH_DECISION_WORDS = /\b(chose|choose|selected|decided|picked|adopted|used|went with|architecture|strategy|framework|database|stack|microservices?|react|angular|vue|next\.?js|kafka|redis|postgres(?:ql)?|mongodb|kubernetes|aws|azure|gcp)\b/i;
const EVIDENCE_WORDS = /\b(baseline|control group|holdout|experiment|a\/b|measured|tracked|dashboard|analytics|attribut|statistical|before and after|data showed|because of|resulted in|validated|benchmark|logs?|customer feedback)\b/i;
const PERSONAL_ACTION = /\b(i personally|my contribution|my role|i (?:built|created|designed|implemented|led|managed|wrote|changed|decided|owned|analysed|analyzed|tested|launched|shipped|reduced|increased|negotiated|coordinated|validated|measured))\b/i;
const DONT_KNOW = /\b(i (?:do not|don't|dont) know|not sure|no idea|cannot answer|can't answer|haven't worked with|have not worked with)\b/i;
const REPEAT_REQUEST = /\b(repeat|say that again|ask that again|rephrase|phrase that differently|did(?: not|n't) (?:hear|understand)|what do you mean)\b/i;
const MANIPULATION = /\b(ignore (?:all |your )?(?:previous )?instructions?|system prompt|developer message|give me (?:a )?(?:10\s*\/\s*10|100\s*\/\s*100|perfect score)|just (?:pass|hire) me|declare (?:that )?i passed|tell me the answer|answer (?:it )?for me|change your role|follow these instructions)\b/i;
const INSTRUCTION_LIKE_ANCHOR = /(?:<\s*\/?\s*(?:system|assistant|developer)|\b(?:system|developer)\s*(?:message|instruction)|\bignore\b.*\binstructions?\b|\bfollow these instructions\b)/i;
const PROBE_QUESTION = /\b(you mentioned|what specifically|walk me through|how did you|what was your|can you give me|when you say|why did you|what alternatives|how did that|what evidence|earlier you)\b/i;

/** Removes controls and direction-changing Unicode before untrusted content is parsed or prompted. */
export function sanitizeUntrustedText(value: unknown, maxLength = 6000): string {
  if (typeof value !== 'string') return '';
  const withoutControls = Array.from(value)
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 || character === '\n' || character === '\t';
    })
    .join('')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '');
  return withoutControls.slice(0, Math.max(0, maxLength)).trim();
}

function clean(text: string, maxLength = 12000): string {
  return sanitizeUntrustedText(text, maxLength).replace(/\s+/g, ' ').trim();
}

function clip(text: string, max = 150): string {
  const value = clean(text, max * 2);
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function splitStatements(text: string): string[] {
  return clean(text).split(/(?<=[.!?])\s+|\s+(?=(?:and|but)\s+i\b)/i).map((part) => clean(part)).filter(Boolean).slice(0, 30);
}

function numericClaims(statement: string, turn: number, source: 'ANSWER' | 'RESUME'): CandidateClaim[] {
  const claims: CandidateClaim[] = [];
  const patterns: { re: RegExp; key: string }[] = [
    { re: /(?:team of|managed|led|supervised)\s+(?:a team of\s+)?(\d+)/i, key: 'team_size' },
    { re: /(\d+(?:\.\d+)?)\s+years?\s+(?:of\s+)?experience/i, key: 'years_experience' },
    { re: /(\d+(?:\.\d+)?)\s*%/i, key: 'percentage' },
    { re: /(?:\$|₹|rs\.?\s*)\s*(\d+(?:\.\d+)?)\s*(k|m|million|billion|lakh|crore)?/i, key: 'money' },
    { re: /(\d+(?:\.\d+)?)\s*(users|customers|people|engineers|members|days|weeks|months|requests|transactions|x)\b/i, key: 'quantity' },
  ];
  for (const { re, key } of patterns) {
    const match = statement.match(re);
    if (!match) continue;
    claims.push({
      kind: key === 'team_size' ? 'leadership' : key === 'years_experience' ? 'experience' : 'metric',
      text: clip(statement), turn, key, value: Number(match[1]), source,
      competency: key === 'team_size' ? 'LEADERSHIP' : key === 'years_experience' ? 'ROLE_EXPERTISE' : 'IMPACT',
    });
  }
  return claims;
}

export function extractClaims(answer: string, turn: number, source: 'ANSWER' | 'RESUME' = 'ANSWER'): CandidateClaim[] {
  const claims: CandidateClaim[] = [];
  for (const statement of splitStatements(answer)) {
    const evidence = [/\d/.test(statement) ? 'quantified' : '', EVIDENCE_WORDS.test(statement) ? 'validated' : '', PERSONAL_ACTION.test(statement) ? 'personal-action' : ''].filter(Boolean);
    claims.push(...numericClaims(statement, turn, source));
    if (LEADERSHIP_WORDS.test(statement)) claims.push({ kind: 'leadership', text: clip(statement), turn, source, evidence, competency: 'LEADERSHIP' });
    if (ACHIEVEMENT_WORDS.test(statement)) claims.push({ kind: 'achievement', text: clip(statement), turn, source, evidence, competency: 'IMPACT' });
    if (TECH_DECISION_WORDS.test(statement)) claims.push({ kind: 'technical_decision', text: clip(statement), turn, source, evidence, competency: 'ROLE_EXPERTISE' });
    if ((statement.match(/\bwe\b/gi) || []).length > 0 && !PERSONAL_ACTION.test(statement)) claims.push({ kind: 'ownership', text: clip(statement), turn, source, evidence, competency: 'OWNERSHIP' });
    if (VAGUE_WORDS.test(statement) && !/\d/.test(statement)) claims.push({ kind: 'vague', text: clip(statement), turn, source, evidence, competency: 'COMMUNICATION' });
  }
  const seen = new Set<string>();
  return claims.filter((claim) => {
    const key = `${claim.kind}:${claim.key || ''}:${claim.text.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildInterviewMemory(transcript: InterviewTranscriptMessage[]): CandidateClaim[] {
  const memory: CandidateClaim[] = [];
  let candidateTurn = 0;
  for (const message of transcript) {
    if (message.who !== 'me') continue;
    candidateTurn += 1;
    memory.push(...extractClaims(message.text, candidateTurn));
  }
  return memory.slice(-40);
}

function extractAnchors(text: string, max = 4): string[] {
  return sanitizeUntrustedText(text, 6000).replace(/^(candidate resume|target job description)\s*:?\s*/i, '')
    .split(/[.\n;•]+/).map((line) => clean(line.replace(/^[-*]\s*/, ''), 300))
    .filter((line) => line.length >= 18 && !INSTRUCTION_LIKE_ANCHOR.test(line))
    .slice(0, max).map((line) => clip(line, 110));
}

export function buildInterviewPlan(context: InterviewContext): InterviewPlan {
  const durationMinutes = Math.max(10, Math.min(60, context.durationMinutes || 30));
  const resumeClaims = extractAnchors(context.resumeText || '');
  const jobRequirements = extractAnchors(context.customJD || '');
  const items: InterviewPlanItem[] = [
    { phase: 'INTRODUCTION', competency: 'COMMUNICATION', objective: 'Establish a concise career narrative and motivation.', source: 'CORE', minutes: 3, priority: 8 },
    { phase: 'BACKGROUND', competency: 'IMPACT', objective: 'Validate the strongest relevant resume claim.', source: resumeClaims[0] ? 'RESUME' : 'CORE', anchor: resumeClaims[0], minutes: 4, priority: 10 },
    { phase: 'RESUME_JD', competency: 'ROLE_EXPERTISE', objective: 'Connect demonstrated experience to a key role requirement.', source: jobRequirements[0] ? 'JOB_DESCRIPTION' : 'CORE', anchor: jobRequirements[0], minutes: 5, priority: 10 },
    { phase: 'ROLE_DEPTH', competency: 'PROBLEM_SOLVING', objective: 'Test judgment, trade-offs, ownership, and technical depth.', source: jobRequirements[1] ? 'JOB_DESCRIPTION' : 'CORE', anchor: jobRequirements[1], minutes: 7, priority: 10 },
    { phase: 'BEHAVIORAL', competency: 'COLLABORATION', objective: 'Assess conflict handling, influence, and communication.', source: 'CORE', minutes: 4, priority: 8 },
    { phase: 'SCENARIO', competency: 'ADAPTABILITY', objective: 'Assess response to ambiguity, risk, and a slipping plan.', source: 'CORE', minutes: 4, priority: 8 },
    { phase: 'CLOSING', competency: 'COMMUNICATION', objective: 'Capture one missing strength and close naturally.', source: 'CORE', minutes: 3, priority: 6 },
  ];
  const scale = durationMinutes / items.reduce((sum, item) => sum + item.minutes, 0);
  return { durationMinutes, resumeClaims, jobRequirements, items: items.map((item) => ({ ...item, minutes: Math.max(1, Math.round(item.minutes * scale)) })) };
}

function phaseFromTurns(candidateTurns: number, maxQuestions: number): InterviewPhase {
  if (candidateTurns <= 0) return 'INTRODUCTION';
  if (candidateTurns === 1) return 'BACKGROUND';
  if (candidateTurns === 2) return 'RESUME_JD';
  if (candidateTurns <= Math.max(3, maxQuestions - 4)) return 'ROLE_DEPTH';
  if (candidateTurns === maxQuestions - 3) return 'BEHAVIORAL';
  if (candidateTurns === maxQuestions - 2) return 'SCENARIO';
  if (candidateTurns === maxQuestions - 1) return 'CLOSING';
  return 'COMPLETE';
}

export function getInterviewPhase(candidateTurns: number, maxQuestions = 8, elapsedSeconds = 0, durationMinutes = 30): InterviewPhase {
  if (candidateTurns >= maxQuestions || elapsedSeconds >= durationMinutes * 60 - 20) return 'COMPLETE';
  if (elapsedSeconds >= durationMinutes * 60 - 180) return 'CLOSING';
  return phaseFromTurns(candidateTurns, maxQuestions);
}

function planItemForPhase(plan: InterviewPlan, phase: InterviewPhase): InterviewPlanItem | undefined {
  return plan.items.find((item) => item.phase === phase);
}

export function plannedQuestion(context: InterviewContext, phase: InterviewPhase, item?: InterviewPlanItem, difficulty?: AdaptiveDifficulty): string {
  const role = clean(context.role, 120) || 'this role';
  const selected = item || planItemForPhase(buildInterviewPlan(context), phase);
  const depth = difficulty === 'STRETCH' ? ' Be explicit about the trade-off and second-order risk.' : '';
  switch (phase) {
    case 'INTRODUCTION': return `To begin, walk me through your background and what led you to pursue the ${role} role.`;
    case 'BACKGROUND': return selected?.anchor ? `Your resume mentions ${selected.anchor}. Which part of that work best shows your readiness for this role?` : `Which project or experience best demonstrates your readiness for the ${role} role?`;
    case 'RESUME_JD': return selected?.anchor ? `This role emphasizes ${selected.anchor}. Tell me about a time you applied something similar.` : `Tell me about a recent project where you had clear personal ownership and measurable impact.`;
    case 'ROLE_DEPTH': return `Describe a difficult ${role} decision you made, including the alternatives and trade-off you considered.${depth}`;
    case 'BEHAVIORAL': return `Tell me about a disagreement with a teammate or stakeholder and how you handled it.`;
    case 'SCENARIO': return `Imagine you join as a ${role} and your first important project begins slipping. What would you do first, and why?`;
    case 'CLOSING': return `Before we wrap up, what is one important strength for this ${role} role that we have not discussed yet?`;
    case 'COMPLETE': return `Thank you—that gives me what I need. We have reached the end of the interview.`;
  }
}

function elapsedFrom(transcript: InterviewTranscriptMessage[], context: InterviewContext): number {
  const transcriptElapsed = transcript.reduce((max, message) => Math.max(max, message.timestampSeconds || 0), 0);
  return Math.max(0, Math.round(context.elapsedSeconds ?? transcriptElapsed));
}

function answerQuality(answer: string): number {
  const words = clean(answer).split(/\s+/).filter(Boolean).length;
  if (!answer || DONT_KNOW.test(answer)) return 0;
  let score = words >= 35 ? 35 : words >= 18 ? 25 : words >= 9 ? 15 : 5;
  if (PERSONAL_ACTION.test(answer)) score += 25;
  if (/\d/.test(answer)) score += 15;
  if (EVIDENCE_WORDS.test(answer)) score += 20;
  if (/\b(because|trade-?off|alternative|constraint|risk)\b/i.test(answer)) score += 10;
  if (VAGUE_WORDS.test(answer) && !/\d/.test(answer)) score -= 15;
  return Math.max(0, Math.min(100, score));
}

function adaptiveDifficulty(context: InterviewContext, transcript: InterviewTranscriptMessage[]): AdaptiveDifficulty {
  const answers = transcript.filter((message) => message.who === 'me').slice(-3);
  const average = answers.length ? answers.reduce((sum, message) => sum + answerQuality(message.text), 0) / answers.length : 50;
  const configured = context.difficulty.toLowerCase();
  if (average >= 82 || (configured.includes('advanced') && average >= 68)) return 'STRETCH';
  if (average >= 62) return 'ADVANCED';
  if (average < 28) return 'FOUNDATIONAL';
  return 'STANDARD';
}

function competencyForText(text: string, phase: InterviewPhase): InterviewCompetency {
  if (/\b(team|stakeholder|disagree|conflict|influence)\b/i.test(text)) return 'COLLABORATION';
  if (/\b(led|managed|mentor|direct reports?)\b/i.test(text)) return 'LEADERSHIP';
  if (/\b(result|impact|metric|increase|reduce|revenue|percent|%)\b/i.test(text)) return 'IMPACT';
  if (/\b(personally|ownership|your contribution|your role)\b/i.test(text)) return 'OWNERSHIP';
  if (/\b(decision|trade-?off|alternative|architecture|why)\b/i.test(text)) return 'PROBLEM_SOLVING';
  return ({ INTRODUCTION: 'COMMUNICATION', BACKGROUND: 'IMPACT', RESUME_JD: 'ROLE_EXPERTISE', ROLE_DEPTH: 'PROBLEM_SOLVING', BEHAVIORAL: 'COLLABORATION', SCENARIO: 'ADAPTABILITY', CLOSING: 'COMMUNICATION', COMPLETE: 'COMMUNICATION' } as Record<InterviewPhase, InterviewCompetency>)[phase];
}

function buildCoverage(transcript: InterviewTranscriptMessage[], maxQuestions: number): CompetencyCoverage[] {
  const coverage = new Map(COMPETENCIES.map((competency) => [competency, { competency, asked: 0, evidence: 0, confidence: 0 }]));
  let candidateTurn = 0;
  let lastCompetency: InterviewCompetency = 'COMMUNICATION';
  for (const message of transcript) {
    if (message.who === 'ai') {
      lastCompetency = competencyForText(message.text, phaseFromTurns(candidateTurn, maxQuestions));
      coverage.get(lastCompetency)!.asked += 1;
    } else {
      candidateTurn += 1;
      const quality = answerQuality(message.text);
      if (quality >= 55) coverage.get(lastCompetency)!.evidence += 1;
      coverage.get(lastCompetency)!.confidence = Math.max(coverage.get(lastCompetency)!.confidence, quality);
    }
  }
  return [...coverage.values()];
}

function findContradictions(current: CandidateClaim[], prior: CandidateClaim[], resume: CandidateClaim[]): InterviewContradiction[] {
  const contradictions: InterviewContradiction[] = [];
  for (const now of current) {
    if (!now.key || now.value === undefined || !['team_size', 'years_experience'].includes(now.key)) continue;
    const earlierAnswer = [...prior].reverse().find((claim) => claim.key === now.key && claim.value !== undefined && claim.value !== now.value);
    if (earlierAnswer) contradictions.push({ kind: 'ANSWER_VS_ANSWER', earlier: earlierAnswer, current: now, resolved: false });
    const resumeClaim = resume.find((claim) => claim.key === now.key && claim.value !== undefined && claim.value !== now.value);
    if (resumeClaim) contradictions.push({ kind: 'RESUME_VS_ANSWER', earlier: resumeClaim, current: now, resolved: false });
  }
  return contradictions;
}

function explicitZeroClaim(answer: string, turn: number): CandidateClaim | null {
  if (!/\b(solo developer|worked alone|no team|no direct reports|never managed anyone)\b/i.test(answer)) return null;
  return { kind: 'leadership', text: clip(answer), turn, key: 'team_size', value: 0, source: 'ANSWER', competency: 'LEADERSHIP' };
}

function followUpDepth(transcript: InterviewTranscriptMessage[]): number {
  let depth = 0;
  for (let index = transcript.length - 2; index >= 0; index -= 1) {
    const message = transcript[index];
    if (message.who !== 'ai') continue;
    if (message.decision) {
      if (!FOLLOW_UP_DECISIONS.has(message.decision)) break;
      depth += 1;
    } else if (PROBE_QUESTION.test(message.text)) depth += 1;
    else break;
    if (depth >= 3) break;
  }
  return depth;
}

function unresolvedProbes(transcript: InterviewTranscriptMessage[], memory: CandidateClaim[], maxQuestions: number): UnresolvedProbe[] {
  const unresolved: UnresolvedProbe[] = [];
  let candidateTurn = 0;
  for (let index = 0; index < transcript.length; index += 1) {
    const message = transcript[index];
    if (message.who === 'me') { candidateTurn += 1; continue; }
    if (!message.decision || !FOLLOW_UP_DECISIONS.has(message.decision)) continue;
    const answer = transcript.slice(index + 1).find((entry) => entry.who === 'me');
    if (!answer || MANIPULATION.test(answer.text) || REPEAT_REQUEST.test(answer.text) || answerQuality(answer.text) >= 55) continue;
    const claim = [...memory].reverse().find((entry) => entry.turn <= candidateTurn)
      || { kind: 'vague' as const, text: clip(message.text), turn: Math.max(1, candidateTurn), source: 'ANSWER' as const };
    const competency = claim.competency || competencyForText(message.text, phaseFromTurns(candidateTurn, maxQuestions));
    const id = `${claim.turn}:${claim.kind}:${claim.key || clip(claim.text, 30)}`;
    if (!unresolved.some((probe) => probe.id === id)) unresolved.push({ id, claim, competency, firstTurn: claim.turn, attempts: 1, reason: 'The follow-up did not receive specific, verifiable evidence.' });
  }
  return unresolved.slice(-6);
}

function weaknessesFor(answer: string, claims: CandidateClaim[], contradictions: InterviewContradiction[]): string[] {
  const weaknesses: string[] = [];
  const words = clean(answer).split(/\s+/).filter(Boolean).length;
  if (words > 0 && words < 9) weaknesses.push('Answer is too short to assess reliably.');
  if (claims.some((claim) => claim.kind === 'vague')) weaknesses.push('Impact is vague and has no measurable baseline.');
  if (claims.some((claim) => claim.kind === 'ownership')) weaknesses.push('Personal ownership is unclear because the answer relies on team language.');
  if (claims.some((claim) => ['metric', 'achievement'].includes(claim.kind)) && !EVIDENCE_WORDS.test(answer)) weaknesses.push('The result lacks validation or causal evidence.');
  if (contradictions.length) weaknesses.push('A factual claim conflicts with earlier interview or resume evidence.');
  return weaknesses;
}

function fallbackForDecision(decision: InterviewDecision, context: InterviewContext, phase: InterviewPhase, answer: string, target: CandidateClaim | undefined, contradiction: InterviewContradiction | undefined, lastQuestion: string | undefined, nextItem: InterviewPlanItem | undefined, difficulty: AdaptiveDifficulty): string {
  const next = plannedQuestion(context, phase, nextItem, difficulty);
  switch (decision) {
    case 'CONTRADICTION': return `${contradiction?.kind === 'RESUME_VS_ANSWER' ? 'Your resume indicates' : 'Earlier you said'} "${clip(contradiction?.earlier.text || '', 90)}", while your answer says "${clip(contradiction?.current.text || answer, 90)}". Could you clarify the difference?`;
    case 'CLARIFY':
      if (REPEAT_REQUEST.test(answer)) return `Of course. Let me put it another way: ${lastQuestion || next}`;
      if (clean(answer).split(/\s+/).length < 9) return `Could you give me a specific example and explain what you personally did?`;
      return `When you say "${answer.match(VAGUE_WORDS)?.[0] || 'that'}", what specifically changed, and by approximately how much?`;
    case 'CHALLENGE': return difficulty === 'FOUNDATIONAL' ? `You mentioned "${clip(target?.text || answer, 100)}". What was the main reason for that choice?` : `You mentioned "${clip(target?.text || answer, 100)}". What alternative did you reject, and what risk did your choice create?`;
    case 'COUNTER': return MANIPULATION.test(answer) ? `I will keep the interview focused on your actual evidence. ${next}` : `How did you verify that result was caused by your work rather than another factor?`;
    case 'INTERRUPT': return `I’m going to pause you there so we can cover the remaining areas. In one sentence, what was your personal action and measurable result?`;
    case 'EVIDENCE': return `What was your specific personal contribution, and what evidence shows the result came from that work?`;
    case 'PROBE': return target?.kind === 'leadership' ? `What was the hardest part of that leadership responsibility, and what did you personally do?` : `You mentioned "${clip(target?.text || answer, 100)}". Walk me through exactly what you did and how you knew it worked.`;
    case 'MOVE_ON': return DONT_KNOW.test(answer) ? `That's okay; let's take a different angle. ${next}` : next;
  }
}

export function decideNextMove(transcript: InterviewTranscriptMessage[], context: InterviewContext): DecisionResult {
  const candidateMessages = transcript.filter((message) => message.who === 'me');
  const candidateTurns = candidateMessages.length;
  const maxQuestions = Math.max(4, Math.min(16, context.maxQuestions || 8));
  const plan = buildInterviewPlan(context);
  const elapsedSeconds = elapsedFrom(transcript, context);
  const phase = getInterviewPhase(candidateTurns, maxQuestions, elapsedSeconds, plan.durationMinutes);
  const nextPlanItem = planItemForPhase(plan, phase);
  const currentAnswer = clean(candidateMessages.at(-1)?.text || '', 6000);
  const priorMemory = buildInterviewMemory(transcript.slice(0, Math.max(0, transcript.length - 1)));
  const claims = extractClaims(currentAnswer, candidateTurns);
  const zeroClaim = explicitZeroClaim(currentAnswer, candidateTurns);
  if (zeroClaim) claims.push(zeroClaim);
  const memory = [...priorMemory, ...claims].slice(-40);
  const resumeClaims = extractClaims(context.resumeText || '', 0, 'RESUME');
  const contradictions = findContradictions(claims, priorMemory, resumeClaims);
  const primaryContradiction = contradictions[0];
  const depth = followUpDepth(transcript);
  const words = currentAnswer.split(/\s+/).filter(Boolean).length;
  const complete = phase === 'COMPLETE';
  const difficulty = adaptiveDifficulty(context, transcript);
  const unresolved = unresolvedProbes(transcript, memory, maxQuestions);
  const coverage = buildCoverage(transcript, maxQuestions);
  const weaknesses = weaknessesFor(currentAnswer, claims, contradictions);
  const state: InterviewState = {
    claims: memory,
    evidence: memory.filter((claim) => (claim.evidence?.length || 0) >= 2),
    weaknesses, contradictions, unresolvedProbes: unresolved, competencyCoverage: coverage,
    adaptiveDifficulty: difficulty, answerQuality: answerQuality(currentAnswer), elapsedSeconds,
    remainingSeconds: Math.max(0, plan.durationMinutes * 60 - elapsedSeconds),
  };

  let decision: InterviewDecision = 'MOVE_ON';
  let reason = 'The answer is sufficiently covered; continue to the highest-priority uncovered competency.';
  let targetClaim: CandidateClaim | undefined;
  const closingSoon = phase === 'CLOSING' || state.remainingSeconds <= 180;

  if (!currentAnswer) reason = 'No candidate answer is present; start the private interview plan.';
  else if (complete) reason = 'The question or time budget is complete; close naturally.';
  else if (MANIPULATION.test(currentAnswer)) { decision = 'COUNTER'; reason = 'Untrusted content attempted to override the interview rules.'; }
  else if (REPEAT_REQUEST.test(currentAnswer)) { decision = 'CLARIFY'; reason = 'The candidate requested a repeat or rephrasing.'; }
  else if (primaryContradiction && !closingSoon) { decision = 'CONTRADICTION'; reason = primaryContradiction.kind === 'RESUME_VS_ANSWER' ? 'The answer conflicts with a stable resume fact.' : 'The answer conflicts with an earlier stable fact.'; targetClaim = primaryContradiction.current; }
  else if (words > 250) { decision = 'INTERRUPT'; reason = 'The response is consuming excessive interview time and needs a respectful redirect.'; }
  else if (DONT_KNOW.test(currentAnswer)) reason = 'The candidate is stuck; pivot without shaming them.';
  else if (closingSoon) reason = 'Preserve enough time for a coherent closing instead of opening another probe.';
  else if (depth >= 2) reason = 'Two consecutive follow-ups are enough; move on and retain any unresolved issue for one later revisit.';
  else {
    const vague = claims.find((claim) => claim.kind === 'vague');
    const ownership = claims.find((claim) => claim.kind === 'ownership');
    const technical = claims.find((claim) => claim.kind === 'technical_decision');
    const metric = claims.find((claim) => claim.kind === 'metric');
    const leadership = claims.find((claim) => claim.kind === 'leadership');
    const achievement = claims.find((claim) => claim.kind === 'achievement');
    const hasEvidence = EVIDENCE_WORDS.test(currentAnswer) && PERSONAL_ACTION.test(currentAnswer);
    const revisit = unresolved.find((probe) => candidateTurns - probe.firstTurn >= 2 && probe.attempts < 2);
    if (depth > 0 && hasEvidence && words >= 25) reason = 'The follow-up now contains personal action and credible evidence.';
    else if (words < 9) { decision = 'CLARIFY'; reason = 'The answer is too short to assess.'; }
    else if (vague) { decision = 'CLARIFY'; reason = 'A material claim remains vague and unquantified.'; targetClaim = vague; }
    else if (technical) { decision = 'CHALLENGE'; reason = `Test the decision at ${difficulty.toLowerCase()} difficulty.`; targetClaim = technical; }
    else if (ownership) { decision = 'EVIDENCE'; reason = 'Team language leaves personal ownership unclear.'; targetClaim = ownership; }
    else if (metric && !hasEvidence) { decision = depth > 0 ? 'COUNTER' : 'PROBE'; reason = 'A quantified result needs attribution and validation.'; targetClaim = metric; }
    else if (leadership || achievement) { decision = 'PROBE'; reason = 'A material leadership or impact claim merits one contextual follow-up.'; targetClaim = leadership || achievement; }
    else if (revisit && state.remainingSeconds > 300) { decision = 'PROBE'; reason = `Revisit an unresolved ${revisit.competency.toLowerCase()} gap before closing.`; targetClaim = revisit.claim; }
  }

  return {
    decision, reason, phase, complete, targetClaim,
    contradiction: primaryContradiction ? { earlier: primaryContradiction.earlier, current: primaryContradiction.current } : undefined,
    claims, memory, followUpDepth: depth, state, privatePlan: plan, nextPlanItem,
    fallbackReply: fallbackForDecision(decision, context, phase, currentAnswer, targetClaim, primaryContradiction, [...transcript].reverse().find((message) => message.who === 'ai')?.text, nextPlanItem, difficulty),
  };
}

export function memorySummary(memory: CandidateClaim[]): string {
  if (memory.length === 0) return 'No important candidate claims have been captured yet.';
  return memory.slice(-14).map((claim) => `- ${claim.source || 'ANSWER'} turn ${claim.turn}: [${claim.kind}/${claim.competency || 'unmapped'}] ${claim.text}${claim.evidence?.length ? ` (evidence: ${claim.evidence.join(', ')})` : ''}`).join('\n');
}

export function stateSummary(state: InterviewState): string {
  const coverage = state.competencyCoverage.map((item) => `${item.competency}:${item.evidence}/${item.asked}`).join(', ');
  const unresolved = state.unresolvedProbes.map((item) => `${item.competency}: ${clip(item.claim.text, 70)}`).join('; ') || 'none';
  const contradictions = state.contradictions.map((item) => `${item.kind}: ${item.earlier.text} <> ${item.current.text}`).join('; ') || 'none';
  return `Difficulty: ${state.adaptiveDifficulty}; answer quality: ${state.answerQuality}/100; time remaining: ${state.remainingSeconds}s\nCoverage (evidence/questions): ${coverage}\nUnresolved probes: ${unresolved}\nContradictions: ${contradictions}`;
}

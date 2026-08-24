import type { InterviewDecision, InterviewTranscriptMessage } from '@/lib/interview-decision';

export const INTERVIEW_TELEMETRY_SCHEMA_VERSION = 1 as const;

export type TelemetrySessionStatus = 'started' | 'completed' | 'abandoned' | 'terminated';

export type TelemetryComponent =
  | 'turn_detection'
  | 'decision_engine'
  | 'response_model'
  | 'speech_to_text'
  | 'text_to_speech'
  | 'avatar'
  | 'total_response'
  | 'score_model'
  | 'persistence'
  | 'report_render';

export type TelemetryReasonCode =
  | 'specificity_gap'
  | 'ambiguous_answer'
  | 'rationale_check'
  | 'causal_attribution_check'
  | 'evidence_gap'
  | 'contradiction_detected'
  | 'topic_complete'
  | 'candidate_barge_in'
  | 'interruption_control'
  | 'interviewer_redirect'
  | 'long_memory_reference'
  | 'candidate_skip'
  | 'ramble_limit'
  | 'silence_timeout'
  | 'provider_fallback'
  | 'report_opened'
  | 'practice_submitted'
  | 'session_saved';

export type TelemetryEventName =
  | 'session_started'
  | 'candidate_turn'
  | 'interviewer_turn'
  | 'decision_made'
  | 'interruption'
  | 'redirect'
  | 'memory_used'
  | 'session_completed'
  | 'session_abandoned'
  | 'report_viewed'
  | 'practice_again';

export interface TelemetryModelIdentity {
  /** Product pipeline that made the decision or score. */
  id: string;
  version: string;
  /** Optional provider model when it is known at runtime. */
  providerModel?: string;
}

export interface TelemetryLatencySample {
  component: TelemetryComponent;
  durationMs: number;
  turnIndex?: number;
  measuredAt: string;
  outcome?: 'success' | 'fallback' | 'timeout' | 'error';
}

/**
 * Minimal state needed to replay the interview control flow. It deliberately
 * excludes transcript, resume, job-description, email, name, and media data.
 */
export interface TelemetryReplayState {
  status: TelemetrySessionStatus;
  turnIndex: number;
  questionCount: number;
  candidateTurnCount: number;
  followUpDepth?: number;
  memoryClaimCount?: number;
  decision?: InterviewDecision;
}

export interface InterviewTelemetryEvent {
  id: string;
  sequence: number;
  name: TelemetryEventName;
  occurredAt: string;
  elapsedMs: number;
  reasonCode?: TelemetryReasonCode;
  state: TelemetryReplayState;
}

export interface InterviewTelemetry {
  schemaVersion: typeof INTERVIEW_TELEMETRY_SCHEMA_VERSION;
  traceId: string;
  sessionId: string;
  startedAt: string;
  endedAt?: string;
  status: TelemetrySessionStatus;
  models: {
    decision: TelemetryModelIdentity;
    scoring: TelemetryModelIdentity;
  };
  latencies: TelemetryLatencySample[];
  events: InterviewTelemetryEvent[];
  privacy: {
    mode: 'metadata-only';
    containsFreeText: false;
    redactionVersion: 'metadata-only-v1';
  };
}

export interface TelemetryCompatibleInterview {
  id: string;
  date: string;
  duration: number;
  score: number;
  role?: string;
  type?: string;
  transcript?: InterviewTranscriptMessage[];
  performance?: {
    responseLatenciesMs?: number[];
    modelLatenciesMs?: number[];
    candidateInterruptions?: number;
    interviewerRedirects?: number;
  };
  retakes?: { previousScore: number; newScore: number; date?: string }[];
  telemetry?: InterviewTelemetry;
}

export interface InterviewProductMetrics {
  sessions: number;
  completedSessions: number;
  responseLatencyMs: { samples: number; median: number | null; p95: number | null };
  contextualFollowUpRate: number | null;
  repeatedQuestionRate: number | null;
  longMemoryRate: number | null;
  completionRate: number | null;
  reportViewedRate: number | null;
  practiceAgainRate: number | null;
  repeatWithin7DaysRate: number | null;
  improvement: {
    attempts: number;
    improvedAttempts: number;
    improvedAttemptRate: number | null;
    averageScoreDelta: number | null;
    averageRepeatInterviewScoreDelta: number | null;
  };
}

const DECISION_REASONS: Record<InterviewDecision, TelemetryReasonCode> = {
  PROBE: 'specificity_gap',
  CLARIFY: 'ambiguous_answer',
  CHALLENGE: 'rationale_check',
  COUNTER: 'causal_attribution_check',
  INTERRUPT: 'interruption_control',
  EVIDENCE: 'evidence_gap',
  CONTRADICTION: 'contradiction_detected',
  MOVE_ON: 'topic_complete',
};

const DEFAULT_MODELS: InterviewTelemetry['models'] = {
  decision: { id: 'selective-follow-up-engine', version: '1' },
  scoring: { id: 'evidence-based-score-engine', version: '1' },
};

const COMPONENTS: readonly TelemetryComponent[] = [
  'turn_detection', 'decision_engine', 'response_model', 'speech_to_text',
  'text_to_speech', 'avatar', 'total_response', 'score_model', 'persistence', 'report_render',
];
const EVENT_NAMES: readonly TelemetryEventName[] = [
  'session_started', 'candidate_turn', 'interviewer_turn', 'decision_made', 'interruption',
  'redirect', 'memory_used', 'session_completed', 'session_abandoned', 'report_viewed', 'practice_again',
];
const REASON_CODES: readonly TelemetryReasonCode[] = [
  'specificity_gap', 'ambiguous_answer', 'rationale_check', 'causal_attribution_check',
  'evidence_gap', 'contradiction_detected', 'topic_complete', 'candidate_barge_in',
  'interruption_control', 'interviewer_redirect', 'long_memory_reference', 'candidate_skip',
  'ramble_limit', 'silence_timeout', 'provider_fallback', 'report_opened', 'practice_submitted', 'session_saved',
];
const SESSION_STATUSES: readonly TelemetrySessionStatus[] = ['started', 'completed', 'abandoned', 'terminated'];
const DECISIONS: readonly InterviewDecision[] = [
  'PROBE', 'CLARIFY', 'CHALLENGE', 'COUNTER', 'INTERRUPT', 'MOVE_ON', 'EVIDENCE', 'CONTRADICTION',
];

function finiteNonNegative(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function validDate(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) return fallback;
  return new Date(value).toISOString();
}

function makeId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${prefix}_${uuid}`;
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

function eventId(sessionId: string, sequence: number): string {
  return `${sessionId}_evt_${sequence.toString().padStart(4, '0')}`;
}

function addMs(iso: string, elapsedMs: number): string {
  return new Date(Date.parse(iso) + finiteNonNegative(elapsedMs)).toISOString();
}

function rate(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

function percentile(values: number[], percentileValue: number): number | null {
  if (values.length === 0) return null;
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const index = Math.max(0, Math.ceil(percentileValue * sorted.length) - 1);
  return Math.round(sorted[index]);
}

function normalizeQuestion(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(please|could|would|can|you|tell|me|about)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function questionTokens(text: string): Set<string> {
  return new Set(normalizeQuestion(text).split(' ').filter((word) => word.length > 2));
}

function questionsRepeat(left: string, right: string): boolean {
  const a = normalizeQuestion(left);
  const b = normalizeQuestion(right);
  if (!a || !b) return false;
  if (a === b) return true;
  const aTokens = questionTokens(a);
  const bTokens = questionTokens(b);
  if (aTokens.size === 0 || bTokens.size === 0) return false;
  let shared = 0;
  for (const token of aTokens) if (bTokens.has(token)) shared += 1;
  return shared / Math.min(aTokens.size, bTokens.size) >= 0.85;
}

export function isInterviewTelemetry(value: unknown): value is InterviewTelemetry {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<InterviewTelemetry>;
  return candidate.schemaVersion === INTERVIEW_TELEMETRY_SCHEMA_VERSION
    && typeof candidate.traceId === 'string'
    && typeof candidate.sessionId === 'string'
    && Array.isArray(candidate.events)
    && Array.isArray(candidate.latencies);
}

function safeIdentifier(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const sanitized = value.replace(/[^a-zA-Z0-9_./:@-]/g, '').slice(0, 160);
  return sanitized || fallback;
}

/** Removes unknown keys and free-form values at every telemetry boundary. */
export function sanitizeInterviewTelemetry(value: unknown): InterviewTelemetry | null {
  if (!isInterviewTelemetry(value)) return null;
  const source = value as InterviewTelemetry;
  const startedAt = validDate(source.startedAt, new Date().toISOString());
  const traceId = safeIdentifier(source.traceId, makeId('trace'));
  const sessionId = safeIdentifier(source.sessionId, makeId('session'));
  const status = SESSION_STATUSES.includes(source.status) ? source.status : 'started';
  const model = (candidate: unknown, fallback: TelemetryModelIdentity): TelemetryModelIdentity => {
    const item = candidate && typeof candidate === 'object' ? candidate as Partial<TelemetryModelIdentity> : {};
    const providerModel = typeof item.providerModel === 'string'
      ? safeIdentifier(item.providerModel, '')
      : '';
    return {
      id: safeIdentifier(item.id, fallback.id),
      version: safeIdentifier(item.version, fallback.version),
      ...(providerModel ? { providerModel } : {}),
    };
  };
  const latencies = source.latencies.flatMap((sample): TelemetryLatencySample[] => {
    if (!sample || typeof sample !== 'object' || !COMPONENTS.includes(sample.component)) return [];
    if (!Number.isFinite(sample.durationMs) || sample.durationMs < 0) return [];
    const outcome = ['success', 'fallback', 'timeout', 'error'].includes(String(sample.outcome))
      ? sample.outcome
      : undefined;
    return [{
      component: sample.component,
      durationMs: Math.round(sample.durationMs),
      ...(typeof sample.turnIndex === 'number' && Number.isFinite(sample.turnIndex)
        ? { turnIndex: Math.max(0, Math.floor(sample.turnIndex)) }
        : {}),
      measuredAt: validDate(sample.measuredAt, startedAt),
      ...(outcome ? { outcome } : {}),
    }];
  });
  const events = source.events.flatMap((event, index): InterviewTelemetryEvent[] => {
    if (!event || typeof event !== 'object' || !EVENT_NAMES.includes(event.name)) return [];
    const state = event.state && typeof event.state === 'object' ? event.state : null;
    if (!state) return [];
    const stateStatus = SESSION_STATUSES.includes(state.status) ? state.status : status;
    const decision = state.decision && DECISIONS.includes(state.decision) ? state.decision : undefined;
    const reasonCode = event.reasonCode && REASON_CODES.includes(event.reasonCode) ? event.reasonCode : undefined;
    return [{
      id: eventId(sessionId, index),
      sequence: index,
      name: event.name,
      occurredAt: validDate(event.occurredAt, startedAt),
      elapsedMs: finiteNonNegative(event.elapsedMs),
      ...(reasonCode ? { reasonCode } : {}),
      state: {
        status: stateStatus,
        turnIndex: Math.max(0, Math.floor(finiteNonNegative(state.turnIndex))),
        questionCount: Math.max(0, Math.floor(finiteNonNegative(state.questionCount))),
        candidateTurnCount: Math.max(0, Math.floor(finiteNonNegative(state.candidateTurnCount))),
        ...(typeof state.followUpDepth === 'number'
          ? { followUpDepth: Math.max(0, Math.floor(finiteNonNegative(state.followUpDepth))) }
          : {}),
        ...(typeof state.memoryClaimCount === 'number'
          ? { memoryClaimCount: Math.max(0, Math.floor(finiteNonNegative(state.memoryClaimCount))) }
          : {}),
        ...(decision ? { decision } : {}),
      },
    }];
  });
  return {
    schemaVersion: INTERVIEW_TELEMETRY_SCHEMA_VERSION,
    traceId,
    sessionId,
    startedAt,
    ...(source.endedAt ? { endedAt: validDate(source.endedAt, startedAt) } : {}),
    status,
    models: {
      decision: model(source.models?.decision, DEFAULT_MODELS.decision),
      scoring: model(source.models?.scoring, DEFAULT_MODELS.scoring),
    },
    latencies,
    events,
    privacy: {
      mode: 'metadata-only',
      containsFreeText: false,
      redactionVersion: 'metadata-only-v1',
    },
  };
}

export function createInterviewTelemetry(options: {
  startedAt?: string;
  traceId?: string;
  sessionId?: string;
  decisionModel?: TelemetryModelIdentity;
  scoringModel?: TelemetryModelIdentity;
} = {}): InterviewTelemetry {
  const startedAt = validDate(options.startedAt, new Date().toISOString());
  const sessionId = options.sessionId || makeId('session');
  const initialState: TelemetryReplayState = {
    status: 'started',
    turnIndex: 0,
    questionCount: 0,
    candidateTurnCount: 0,
  };
  return {
    schemaVersion: INTERVIEW_TELEMETRY_SCHEMA_VERSION,
    traceId: options.traceId || makeId('trace'),
    sessionId,
    startedAt,
    status: 'started',
    models: {
      decision: options.decisionModel || DEFAULT_MODELS.decision,
      scoring: options.scoringModel || DEFAULT_MODELS.scoring,
    },
    latencies: [],
    events: [{
      id: eventId(sessionId, 0),
      sequence: 0,
      name: 'session_started',
      occurredAt: startedAt,
      elapsedMs: 0,
      state: initialState,
    }],
    privacy: {
      mode: 'metadata-only',
      containsFreeText: false,
      redactionVersion: 'metadata-only-v1',
    },
  };
}

export function appendTelemetryEvent(
  telemetry: InterviewTelemetry,
  event: Omit<InterviewTelemetryEvent, 'id' | 'sequence' | 'occurredAt'> & { occurredAt?: string },
): InterviewTelemetry {
  const sequence = telemetry.events.length;
  const occurredAt = validDate(event.occurredAt, addMs(telemetry.startedAt, event.elapsedMs));
  const status = event.state.status;
  return {
    ...telemetry,
    status,
    ...(status === 'completed' || status === 'abandoned' || status === 'terminated'
      ? { endedAt: occurredAt }
      : {}),
    events: [...telemetry.events, {
      ...event,
      id: eventId(telemetry.sessionId, sequence),
      sequence,
      occurredAt,
    }],
  };
}

export function appendTelemetryLatency(
  telemetry: InterviewTelemetry,
  sample: Omit<TelemetryLatencySample, 'measuredAt'> & { measuredAt?: string },
): InterviewTelemetry {
  if (!Number.isFinite(sample.durationMs) || sample.durationMs < 0) return telemetry;
  return {
    ...telemetry,
    latencies: [...telemetry.latencies, {
      ...sample,
      durationMs: Math.round(sample.durationMs),
      measuredAt: validDate(sample.measuredAt, new Date().toISOString()),
    }],
  };
}

/** Builds metadata-only telemetry for legacy interviews without telemetry. */
export function inferInterviewTelemetry(record: TelemetryCompatibleInterview): InterviewTelemetry {
  const existing = sanitizeInterviewTelemetry(record.telemetry);
  if (existing) return existing;

  const endedAt = validDate(record.date, new Date().toISOString());
  const durationMs = finiteNonNegative(record.duration) * 1000;
  const startedAt = new Date(Date.parse(endedAt) - durationMs).toISOString();
  const stableRecordId = String(record.id || makeId('legacy')).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
  let telemetry = createInterviewTelemetry({
    startedAt,
    traceId: `trace_${stableRecordId}`,
    sessionId: `session_${stableRecordId}`,
  });
  const transcript = Array.isArray(record.transcript) ? record.transcript : [];
  let questions = 0;
  let candidateTurns = 0;

  transcript.forEach((message, turnIndex) => {
    if (message.who === 'ai') questions += 1;
    else candidateTurns += 1;
    const elapsedMs = typeof message.timestampSeconds === 'number'
      ? Math.max(0, message.timestampSeconds * 1000)
      : transcript.length > 0 ? Math.round((durationMs * (turnIndex + 1)) / (transcript.length + 1)) : 0;
    const state: TelemetryReplayState = {
      status: 'started',
      turnIndex,
      questionCount: questions,
      candidateTurnCount: candidateTurns,
      ...(message.decision ? { decision: message.decision } : {}),
      ...(message.claims ? { memoryClaimCount: message.claims.length } : {}),
    };
    telemetry = appendTelemetryEvent(telemetry, {
      name: message.who === 'ai' ? 'interviewer_turn' : 'candidate_turn',
      elapsedMs,
      ...(message.decision ? { reasonCode: DECISION_REASONS[message.decision] } : {}),
      state,
    });
    if (message.who === 'ai' && message.decision) {
      telemetry = appendTelemetryEvent(telemetry, {
        name: 'decision_made',
        elapsedMs,
        reasonCode: DECISION_REASONS[message.decision],
        state,
      });
    }
  });

  const responseLatencies = record.performance?.responseLatenciesMs || [];
  responseLatencies.forEach((duration, turnIndex) => {
    telemetry = appendTelemetryLatency(telemetry, {
      component: 'total_response',
      durationMs: duration,
      turnIndex,
      measuredAt: endedAt,
      outcome: 'success',
    });
  });
  const modelLatencies = record.performance?.modelLatenciesMs || [];
  modelLatencies.forEach((duration, turnIndex) => {
    telemetry = appendTelemetryLatency(telemetry, {
      component: 'response_model',
      durationMs: duration,
      turnIndex,
      measuredAt: endedAt,
      outcome: 'success',
    });
  });

  const finalState: TelemetryReplayState = {
    status: 'completed',
    turnIndex: transcript.length,
    questionCount: questions,
    candidateTurnCount: candidateTurns,
  };
  for (let i = 0; i < finiteNonNegative(record.performance?.candidateInterruptions); i += 1) {
    telemetry = appendTelemetryEvent(telemetry, {
      name: 'interruption',
      elapsedMs: durationMs,
      occurredAt: endedAt,
      reasonCode: 'candidate_barge_in',
      state: finalState,
    });
  }
  for (let i = 0; i < finiteNonNegative(record.performance?.interviewerRedirects); i += 1) {
    telemetry = appendTelemetryEvent(telemetry, {
      name: 'redirect',
      elapsedMs: durationMs,
      occurredAt: endedAt,
      reasonCode: 'interviewer_redirect',
      state: finalState,
    });
  }
  telemetry = appendTelemetryEvent(telemetry, {
    name: 'session_completed',
    elapsedMs: durationMs,
    occurredAt: endedAt,
    reasonCode: 'session_saved',
    state: finalState,
  });
  return telemetry;
}

export function telemetryHasEvent(telemetry: InterviewTelemetry | undefined, name: TelemetryEventName): boolean {
  return !!telemetry?.events.some((event) => event.name === name);
}

/** Pure aggregate calculations; all rates are 0..1 and null means no denominator. */
export function calculateInterviewProductMetrics(
  interviews: readonly TelemetryCompatibleInterview[],
): InterviewProductMetrics {
  const sessions = interviews.map((record) => ({ record, telemetry: inferInterviewTelemetry(record) }));
  const completed = sessions.filter(({ telemetry }) => telemetry.status === 'completed');
  const responseLatencies = sessions.flatMap(({ record, telemetry }) => {
    const measured = telemetry.latencies
      .filter((sample) => sample.component === 'total_response')
      .map((sample) => sample.durationMs);
    return measured.length > 0 ? measured : record.performance?.responseLatenciesMs || [];
  }).filter((value) => Number.isFinite(value) && value >= 0);

  let decisionTurns = 0;
  let contextualFollowUps = 0;
  let interviewerQuestions = 0;
  let repeatedQuestions = 0;
  let longMemoryEligible = 0;
  let longMemoryUsed = 0;

  for (const { record, telemetry } of sessions) {
    const aiMessages = (record.transcript || []).filter((message) => message.who === 'ai');
    const seen: string[] = [];
    aiMessages.forEach((message) => {
      interviewerQuestions += 1;
      if (seen.some((question) => questionsRepeat(question, message.text))) repeatedQuestions += 1;
      seen.push(message.text);
      if (message.decision) {
        decisionTurns += 1;
        if (message.decision !== 'MOVE_ON') contextualFollowUps += 1;
      }
    });

    const candidateTurns = (record.transcript || []).filter((message) => message.who === 'me').length;
    if (candidateTurns >= 4) {
      longMemoryEligible += 1;
      const explicitMemory = telemetry.events.some((event) =>
        event.name === 'memory_used'
        || event.reasonCode === 'long_memory_reference'
        || (event.state.memoryClaimCount || 0) >= 4,
      );
      const laterContextualTurn = (record.transcript || []).some((message, index) =>
        index >= 7 && message.who === 'ai' && !!message.decision && message.decision !== 'MOVE_ON',
      );
      if (explicitMemory || laterContextualTurn) longMemoryUsed += 1;
    }
  }

  const reportViewed = sessions.filter(({ telemetry }) => telemetryHasEvent(telemetry, 'report_viewed')).length;
  const practiced = sessions.filter(({ record, telemetry }) =>
    (record.retakes?.length || 0) > 0 || telemetryHasEvent(telemetry, 'practice_again'),
  ).length;

  const sortedCompleted = completed
    .slice()
    .sort((a, b) => Date.parse(a.record.date) - Date.parse(b.record.date));
  let repeatEligible = 0;
  let repeatedWithin7Days = 0;
  const repeatScoreDeltas: number[] = [];
  sortedCompleted.forEach((current, index) => {
    if (index === sortedCompleted.length - 1) return;
    repeatEligible += 1;
    const next = sortedCompleted.slice(index + 1).find((candidate) => {
      const gap = Date.parse(candidate.record.date) - Date.parse(current.record.date);
      return gap >= 0 && gap <= 7 * 24 * 60 * 60 * 1000;
    });
    if (!next) return;
    repeatedWithin7Days += 1;
    repeatScoreDeltas.push(next.record.score - current.record.score);
  });

  const retakes = interviews.flatMap((record) => record.retakes || []);
  const retakeDeltas = retakes.map((attempt) => attempt.newScore - attempt.previousScore);
  const improvedAttempts = retakeDeltas.filter((delta) => delta > 0).length;
  const average = (values: number[]): number | null => values.length > 0
    ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
    : null;

  return {
    sessions: sessions.length,
    completedSessions: completed.length,
    responseLatencyMs: {
      samples: responseLatencies.length,
      median: percentile(responseLatencies, 0.5),
      p95: percentile(responseLatencies, 0.95),
    },
    contextualFollowUpRate: rate(contextualFollowUps, decisionTurns),
    repeatedQuestionRate: rate(repeatedQuestions, interviewerQuestions),
    longMemoryRate: rate(longMemoryUsed, longMemoryEligible),
    completionRate: rate(completed.length, sessions.length),
    reportViewedRate: rate(reportViewed, sessions.length),
    practiceAgainRate: rate(practiced, sessions.length),
    repeatWithin7DaysRate: rate(repeatedWithin7Days, repeatEligible),
    improvement: {
      attempts: retakes.length,
      improvedAttempts,
      improvedAttemptRate: rate(improvedAttempts, retakes.length),
      averageScoreDelta: average(retakeDeltas),
      averageRepeatInterviewScoreDelta: average(repeatScoreDeltas),
    },
  };
}

export interface InterviewRetentionPolicy {
  enabled: boolean;
  retentionDays: number;
  preserveLatest: number;
}

export const DEFAULT_INTERVIEW_RETENTION_POLICY: InterviewRetentionPolicy = {
  enabled: false,
  retentionDays: 365,
  preserveLatest: 1,
};

/** Pure retention split. Automatic deletion is opt-in through policy.enabled. */
export function partitionInterviewsByRetention<T extends Pick<TelemetryCompatibleInterview, 'date'>>(
  interviews: readonly T[],
  policy: InterviewRetentionPolicy,
  now = new Date(),
): { kept: T[]; expired: T[] } {
  if (!policy.enabled) return { kept: [...interviews], expired: [] };
  const days = Math.min(3650, Math.max(1, Math.floor(policy.retentionDays)));
  const preserveLatest = Math.min(interviews.length, Math.max(0, Math.floor(policy.preserveLatest)));
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  const latestIds = new Set(
    interviews
      .map((record, index) => ({ record, index }))
      .sort((a, b) => Date.parse(b.record.date) - Date.parse(a.record.date))
      .slice(0, preserveLatest)
      .map(({ index }) => index),
  );
  const kept: T[] = [];
  const expired: T[] = [];
  interviews.forEach((record, index) => {
    const timestamp = Date.parse(record.date);
    if (!latestIds.has(index) && Number.isFinite(timestamp) && timestamp < cutoff) expired.push(record);
    else kept.push(record);
  });
  return { kept, expired };
}

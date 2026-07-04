import { createClient } from '@/lib/supabase';

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
      strengths: [record.feedback.strengths],
      improvements: [record.feedback.improvements],
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

    return rows.map((r: any): InterviewRecord => {
      const fb = Array.isArray(r.interview_feedback) ? r.interview_feedback[0] : r.interview_feedback;
      const qaRows = (r.interview_qa || []).sort((a: any, b: any) => a.question_number - b.question_number);
      const transcript: InterviewRecord['transcript'] = [];
      for (const qa of qaRows) {
        if (qa.question) transcript.push({ who: 'ai', text: qa.question });
        if (qa.answer) transcript.push({ who: 'me', text: qa.answer });
      }
      const n = (v: any, d = 5.5) => (typeof v === 'number' ? v : d);
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
          strengths: fb?.strengths?.[0] || 'You completed the session.',
          improvements: fb?.improvements?.[0] || 'Give longer, more detailed answers with concrete examples.',
          nextStep: fb?.summary || 'Retake the interview and aim for structured answers.',
        },
      };
    });
  } catch {
    return [];
  }
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
  const records = readStore();
  records.push(record);
  writeStore(records);
  // Best-effort DB sync; on success, tag the cached record with its DB id.
  void persistInterviewToDb(record).then((dbId) => {
    if (!dbId) return;
    const recs = readStore();
    const idx = recs.findIndex((r) => r.id === record.id);
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

export function clearInterviews(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

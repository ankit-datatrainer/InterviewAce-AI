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

export function saveInterview(record: InterviewRecord): void {
  const records = readStore();
  records.push(record);
  writeStore(records);
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
  return records.find((r) => r.id === id) ?? null;
}

export function clearInterviews(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

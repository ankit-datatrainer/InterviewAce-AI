import { createClient } from '@/lib/supabase';

export interface ResumeRecord {
  id: string;
  fileName: string;
  uploadDate: string;
  targetRole: string;
  atsScore: number;
  breakdown: {
    formatting: number;
    keywords: number;
    achievements: number;
    structure: number;
    readability: number;
  };
  missingKeywords: string[];
  presentKeywords: string[];
  suggestions: { text: string; impact: string; points: number }[];
  extractedData?: {
    name: string;
    title: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    summary: string;
    experience: { id: number; company: string; role: string; date: string; desc: string }[];
    education: { id: number; school: string; degree: string; date: string }[];
    skills: string;
  };
  dbId?: string; // Supabase resumes.id once synced (for cross-device)
}

const STORAGE_KEY = 'interviewace_resumes';

function mapResume(r: any): ResumeRecord {
  const analysis = typeof r.analysis === 'string' ? JSON.parse(r.analysis) : r.analysis;
  return {
    id: r.id,
    dbId: r.id,
    fileName: r.file_name,
    uploadDate: r.created_at,
    targetRole: r.target_role,
    atsScore: r.ats_score,
    breakdown: analysis.breakdown,
    missingKeywords: analysis.missingKeywords,
    presentKeywords: analysis.presentKeywords,
    suggestions: analysis.suggestions,
    extractedData: r.extracted_data || analysis.extractedData,
  };
}

export async function persistResumeToDb(record: ResumeRecord): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: inserted, error } = await supabase
      .from('resumes')
      .insert({
        user_id: user.id,
        file_name: record.fileName,
        file_url: 'local', // Placeholder as files are parsed locally
        target_role: record.targetRole,
        ats_score: record.atsScore,
        analysis: {
          breakdown: record.breakdown,
          missingKeywords: record.missingKeywords,
          presentKeywords: record.presentKeywords,
          suggestions: record.suggestions,
          extractedData: record.extractedData,
        },
        created_at: record.uploadDate,
      })
      .select('id')
      .single();

    if (error || !inserted?.id) return null;
    return inserted.id as string;
  } catch {
    return null;
  }
}

export async function fetchResumesFromDb(): Promise<ResumeRecord[]> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: rows } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!rows) return [];
    return rows.map(mapResume);
  } catch {
    return [];
  }
}

export async function hydrateResumes(): Promise<ResumeRecord[]> {
  const local = getResumes();
  const db = await fetchResumesFromDb();

  const unsynced = local.filter((r) => !r.dbId);
  if (unsynced.length > 0) {
    for (const record of unsynced) {
      const dbId = await persistResumeToDb(record);
      if (dbId) {
        record.dbId = dbId;
      }
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(local));
    }
  }

  if (db.length === 0) return local;

  const dbIds = new Set(db.map((d) => d.id));
  const remainingUnsynced = local.filter((r) => !r.dbId || !dbIds.has(r.dbId));
  const merged = [...db, ...remainingUnsynced];

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  }
  return merged;
}

export function saveResume(record: ResumeRecord): void {
  const resumes = getResumes();
  resumes.push(record);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resumes));
  }
  // Best-effort DB sync; on success, tag the cached record with its DB id.
  void persistResumeToDb(record).then((dbId) => {
    if (!dbId) return;
    const recs = getResumes();
    const idx = recs.findIndex((r) => r.id === record.id);
    if (idx >= 0) {
      recs[idx].dbId = dbId;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recs));
    }
  });
}

export function getResumes(): ResumeRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getLatestResume(): ResumeRecord | null {
  const resumes = getResumes();
  return resumes.length > 0 ? resumes[resumes.length - 1] : null;
}

export function clearResumes(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}


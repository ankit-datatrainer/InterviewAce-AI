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
}

const STORAGE_KEY = 'interviewace_resumes';

export function saveResume(record: ResumeRecord): void {
  const resumes = getResumes();
  resumes.push(record);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resumes));
  }
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

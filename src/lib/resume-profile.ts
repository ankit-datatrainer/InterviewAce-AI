export type ResumeExperience = {
  id: number;
  company: string;
  role: string;
  date: string;
  desc: string;
};

export type ResumeEducation = {
  id: number;
  school: string;
  degree: string;
  date: string;
};

export type ResumeProject = {
  id: number;
  name: string;
  date: string;
  desc: string;
  technologies: string;
};

export type ResumeProfile = {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  summary: string;
  experience: ResumeExperience[];
  education: ResumeEducation[];
  projects: ResumeProject[];
  achievements: string[];
  skills: string;
};

export const RESUME_BUILDER_STORAGE_KEY = 'resumeBuilderData';
export const RESUME_BUILDER_SOURCE_KEY = 'resumeBuilderSource';

export const EMPTY_RESUME_PROFILE: ResumeProfile = {
  name: '',
  title: '',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  summary: '',
  experience: [],
  education: [],
  projects: [],
  achievements: [],
  skills: '',
};

function text(value: unknown, max = 4_000): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function normalizeResumeProfile(value: unknown, fallback: ResumeProfile = EMPTY_RESUME_PROFILE): ResumeProfile {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const experience = Array.isArray(record.experience)
    ? record.experience.slice(0, 30).map((item, index) => {
        const row = item && typeof item === 'object' ? item as Record<string, unknown> : {};
        return {
          id: Number(row.id) || Date.now() + index,
          company: text(row.company, 300),
          role: text(row.role, 300),
          date: text(row.date, 200),
          desc: text(row.desc),
        };
      })
    : fallback.experience;
  const education = Array.isArray(record.education)
    ? record.education.slice(0, 20).map((item, index) => {
        const row = item && typeof item === 'object' ? item as Record<string, unknown> : {};
        return {
          id: Number(row.id) || Date.now() + 100 + index,
          school: text(row.school, 300),
          degree: text(row.degree, 300),
          date: text(row.date, 200),
        };
      })
    : fallback.education;
  const projects = Array.isArray(record.projects)
    ? record.projects.slice(0, 20).map((item, index) => {
        const row = item && typeof item === 'object' ? item as Record<string, unknown> : {};
        return {
          id: Number(row.id) || Date.now() + 200 + index,
          name: text(row.name, 300),
          date: text(row.date, 200),
          desc: text(row.desc),
          technologies: text(row.technologies, 1_000),
        };
      })
    : fallback.projects;

  return {
    name: text(record.name, 200) || fallback.name,
    title: text(record.title, 300) || fallback.title,
    email: text(record.email, 300) || fallback.email,
    phone: text(record.phone, 100) || fallback.phone,
    location: text(record.location, 300) || fallback.location,
    linkedin: text(record.linkedin, 500) || fallback.linkedin,
    summary: text(record.summary) || fallback.summary,
    experience,
    education,
    projects,
    achievements: Array.isArray(record.achievements)
      ? record.achievements.map((item) => text(item, 1_000)).filter(Boolean).slice(0, 30)
      : fallback.achievements,
    skills: text(record.skills, 2_000) || fallback.skills,
  };
}

export function saveResumeBuilderProfile(profile: ResumeProfile, source = 'manual'): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(RESUME_BUILDER_STORAGE_KEY, JSON.stringify(profile));
  localStorage.setItem(RESUME_BUILDER_SOURCE_KEY, JSON.stringify({ source, updatedAt: new Date().toISOString() }));
  window.dispatchEvent(new CustomEvent('resume_builder_updated', { detail: profile }));
}

export function addKeywordToProfile(profile: ResumeProfile, keyword: string, section: 'summary' | 'skills'): ResumeProfile {
  const clean = keyword.replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, 120);
  if (!clean) return profile;
  if (section === 'skills') {
    const existing = profile.skills.split(',').map((item) => item.trim()).filter(Boolean);
    if (existing.some((item) => item.toLowerCase() === clean.toLowerCase())) return profile;
    return { ...profile, skills: [...existing, clean].join(', ') };
  }
  if (profile.summary.toLowerCase().includes(clean.toLowerCase())) return profile;
  const separator = profile.summary.trim() && !/[.!?]$/.test(profile.summary.trim()) ? '. ' : ' ';
  return {
    ...profile,
    summary: `${profile.summary.trim()}${profile.summary.trim() ? separator : ''}Experience includes ${clean}.`.trim(),
  };
}

export function resumeProfileToText(profile: ResumeProfile): string {
  const lines = [
    profile.name,
    profile.title,
    [profile.email, profile.phone, profile.location, profile.linkedin].filter(Boolean).join(' | '),
    profile.summary && `\nPROFESSIONAL SUMMARY\n${profile.summary}`,
    profile.experience.length > 0 && `\nEXPERIENCE\n${profile.experience.map((item) => `${item.role}${item.company ? ` — ${item.company}` : ''}${item.date ? ` | ${item.date}` : ''}\n${item.desc}`).join('\n\n')}`,
    profile.projects.length > 0 && `\nPROJECTS\n${profile.projects.map((item) => `${item.name}${item.date ? ` | ${item.date}` : ''}\n${item.desc}${item.technologies ? `\nTechnologies: ${item.technologies}` : ''}`).join('\n\n')}`,
    profile.education.length > 0 && `\nEDUCATION\n${profile.education.map((item) => `${item.degree}${item.school ? ` — ${item.school}` : ''}${item.date ? ` | ${item.date}` : ''}`).join('\n')}`,
    profile.achievements.length > 0 && `\nACHIEVEMENTS\n${profile.achievements.map((item) => `• ${item}`).join('\n')}`,
    profile.skills && `\nSKILLS\n${profile.skills}`,
  ];
  return lines.filter(Boolean).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

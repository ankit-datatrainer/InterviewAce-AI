import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { nimChat, isNimConfigured, parseJsonFromModel } from '@/lib/nim';

if (typeof global !== 'undefined') {
  if (!(global as any).DOMMatrix) (global as any).DOMMatrix = class DOMMatrix {};
  if (!(global as any).Path2D) (global as any).Path2D = class Path2D {};
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const targetRole = formData.get('targetRole') as string | null;

    if (!file || !targetRole) {
      return NextResponse.json({ error: 'Missing file or target role' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let text = '';

    const filename = file.name.toLowerCase();
    if (filename.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      const parser = new PDFParse({ data: buffer });
      const pdfData = await parser.getText();
      text = pdfData.text;
    }

    if (!text || text.trim() === '') {
      return NextResponse.json({ error: 'Could not extract text from the provided file' }, { status: 400 });
    }

    // Fast heuristic guard: reject documents that clearly are not resumes before
    // spending an API call. A real resume almost always contains several of these
    // signal words and a reasonable amount of text.
    const lower = text.toLowerCase();
    const resumeSignals = [
      'experience', 'education', 'skills', 'work', 'project', 'summary',
      'employment', 'university', 'college', 'bachelor', 'master', 'degree',
      'responsibilities', 'achievements', 'certification', 'internship', 'email',
      'phone', 'contact', 'linkedin', 'objective', 'career', 'professional',
    ];
    const signalHits = resumeSignals.filter((w) => lower.includes(w)).length;
    if (text.trim().length < 200 || signalHits < 3) {
      return NextResponse.json(
        { error: 'This document does not look like a resume. Please upload a valid resume.', code: 'NOT_A_RESUME' },
        { status: 400 },
      );
    }

    // Structured data (name/contact/experience/education/skills) is parsed
    // LOCALLY with regex — asking the model to echo it back is what made the
    // response huge and slow. We only ask the AI for the analysis judgement,
    // which keeps the output small so it returns fast even on the free tier.
    const extractedData = extractResumeData(text);

    // Lean prompt: scores + keywords + suggestions only. Small output = fast.
    const prompt = `You are an expert ATS and tech recruiter. Analyze this resume for the role of "${targetRole}".
Return ONLY raw JSON (no markdown, no backticks) in EXACTLY this shape:
{"atsScore":85,"breakdown":{"formatting":90,"keywords":80,"achievements":85,"structure":90,"readability":85},"missingKeywords":["k1","k2","k3","k4"],"presentKeywords":["k5","k6","k7"],"suggestions":[{"text":"Actionable tip","impact":"high","points":5},{"text":"Another tip","impact":"medium","points":3}]}
Keep each suggestion under 22 words. Give 4-6 missing keywords, 3-6 present keywords, 3-5 suggestions.

Resume Text:
${text.substring(0, 5000)}`;

    let result: any = null;

    if (isNimConfigured()) {
      try {
        const content = await nimChat(
          [
            { role: 'system', content: 'You are a strict JSON API. Respond only with the requested JSON object and nothing else.' },
            { role: 'user', content: prompt },
          ],
          // Tight timeout so results feel instant: deepseek-v4-flash normally
          // answers in ~2-4s; if it stalls we fall straight through to the
          // deterministic local analysis below rather than making the user wait.
          { temperature: 0.2, maxTokens: 900, json: true, timeoutMs: 6000 },
        );
        result = parseJsonFromModel(content);
      } catch (aiErr) {
        console.warn('ATS AI analysis failed, using local fallback:', aiErr);
        result = null;
      }
    }

    // Guaranteed fallback: if the AI is unavailable/slow/unparseable, build a
    // solid heuristic analysis locally so the user ALWAYS gets a report.
    if (!result || typeof result.atsScore !== 'number' || !result.breakdown) {
      result = localAnalysis(text, targetRole);
    }

    result.extractedData = extractedData;
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('ATS Analysis Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/* ---------------- local helpers ---------------- */

// Regex-based extraction of the structured resume fields for the builder.
function extractResumeData(text: string) {
  const email = (text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i) || [''])[0];
  const phone = (text.match(/(\+?\d[\d\s().-]{7,}\d)/) || [''])[0].trim();
  const linkedin = (text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|pub)\/[A-Za-z0-9_-]+/i) || [''])[0];
  // First non-empty line is usually the candidate's name.
  const firstLine = text.split(/\r?\n/).map((l) => l.trim()).find((l) => l.length > 0) || '';
  const name = /^[A-Za-z][A-Za-z.'-]*(?:\s+[A-Za-z][A-Za-z.'-]*){0,3}$/.test(firstLine) ? firstLine : '';

  return {
    name,
    title: '',
    email,
    phone,
    location: '',
    linkedin,
    summary: '',
    experience: [] as { id: number; company: string; role: string; date: string; desc: string }[],
    education: [] as { id: number; school: string; degree: string; date: string }[],
    skills: '',
  };
}

const KEYWORD_BANK: Record<string, string[]> = {
  'Product Manager': ['roadmap prioritization', 'stakeholder management', 'A/B testing', 'OKRs', 'user research', 'SQL', 'go-to-market', 'KPIs', 'agile', 'product strategy', 'analytics', 'wireframing'],
  'Software Engineer': ['system design', 'CI/CD', 'microservices', 'REST APIs', 'unit testing', 'Docker', 'Kubernetes', 'AWS', 'data structures', 'algorithms', 'Git', 'TypeScript'],
  'Frontend Developer': ['React', 'TypeScript', 'accessibility', 'responsive design', 'Next.js', 'state management', 'REST APIs', 'GraphQL', 'design systems', 'performance optimization', 'JavaScript', 'CSS'],
  'Data Analyst': ['SQL', 'Python', 'Tableau', 'Power BI', 'statistical analysis', 'ETL', 'data modeling', 'A/B testing', 'data visualization', 'Excel', 'dashboards', 'KPIs'],
  'Business Analyst': ['requirements gathering', 'stakeholder management', 'process mapping', 'JIRA', 'user stories', 'UAT', 'gap analysis', 'SQL', 'agile', 'scrum', 'documentation', 'Excel'],
  'Management Trainee': ['leadership', 'project management', 'business development', 'strategic planning', 'market research', 'team management', 'operations', 'CRM', 'communication', 'analytical skills', 'budgeting', 'KPIs'],
};

// Deterministic, resume-aware heuristic scoring used when the AI is unavailable.
function localAnalysis(text: string, targetRole: string) {
  const lower = text.toLowerCase();
  const bank = KEYWORD_BANK[targetRole] || KEYWORD_BANK['Product Manager'];

  const present = bank.filter((k) => lower.includes(k.toLowerCase()));
  const missing = bank.filter((k) => !lower.includes(k.toLowerCase())).slice(0, 6);

  const hasMetrics = /\d+%|\$\d|\d+\+|increased|reduced|improved|grew|saved/i.test(text);
  const hasSections = /experience/i.test(text) && /education/i.test(text) && /skills/i.test(text);
  const wordCount = text.split(/\s+/).length;

  const keywords = Math.min(95, 45 + Math.round((present.length / bank.length) * 50));
  const achievements = hasMetrics ? 82 : 58;
  const structure = hasSections ? 90 : 68;
  const readability = wordCount > 250 && wordCount < 900 ? 88 : 72;
  const formatting = 85;
  const atsScore = Math.round(formatting * 0.15 + keywords * 0.3 + achievements * 0.25 + structure * 0.15 + readability * 0.15);

  const suggestions = [
    !hasMetrics && { text: 'Add quantified metrics to your bullets (e.g. "cut costs by 18%") to prove impact.', impact: 'high', points: 6 },
    missing.length > 0 && { text: `Include keywords like "${missing[0]}" and "${missing[1] || missing[0]}" in your skills or summary.`, impact: 'medium', points: 4 },
    !hasSections && { text: 'Use standard headings (Experience, Education, Skills) so ATS software parses your resume correctly.', impact: 'medium', points: 4 },
    { text: 'Keep your summary to 2-3 concise, role-focused sentences for stronger ATS parsing.', impact: 'low', points: 2 },
    { text: 'Remove images, tables and icons — most ATS software cannot read them.', impact: 'medium', points: 3 },
  ].filter(Boolean) as { text: string; impact: string; points: number }[];

  return {
    atsScore,
    breakdown: { formatting, keywords, achievements, structure, readability },
    missingKeywords: missing,
    presentKeywords: present.slice(0, 6),
    suggestions: suggestions.slice(0, 5),
  };
}

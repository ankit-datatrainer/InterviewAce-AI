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

    if (!isNimConfigured()) {
      return NextResponse.json({ error: 'NVIDIA_NIM_API_KEY is not configured' }, { status: 500 });
    }

    const prompt = `You are an expert Applicant Tracking System (ATS) and tech recruiter.
First, verify if the following text is actually a resume. Look for work experience, education, skills, or professional summary. 
If it is clearly NOT a resume (e.g. random text, a recipe, a completely different type of document), return exactly this JSON and nothing else:
{ "error": "NOT_A_RESUME" }

If it IS a resume, analyze it for the role of "${targetRole}". Provide highly actionable and deep insights to improve it.
ALSO, extract the structured data from the resume (name, contact info, summary, experience, education, skills) to populate a resume builder. If any data is missing from the resume, leave it as an empty string.

Resume Text:
${text.substring(0, 8000)}

Return the analysis EXACTLY as a JSON object with the following structure (no markdown, no backticks, just raw JSON):
{
  "atsScore": 85,
  "breakdown": {
    "formatting": 90,
    "keywords": 80,
    "achievements": 85,
    "structure": 90,
    "readability": 85
  },
  "missingKeywords": ["keyword1", "keyword2", "keyword3"],
  "presentKeywords": ["keyword4", "keyword5", "keyword6"],
  "suggestions": [
    { "text": "Actionable suggestion 1", "impact": "high", "points": 5 },
    { "text": "Actionable suggestion 2", "impact": "medium", "points": 3 }
  ],
  "extractedData": {
    "name": "Full Name",
    "title": "Job Title or Role",
    "email": "Email Address",
    "phone": "Phone Number",
    "location": "City, State",
    "linkedin": "LinkedIn URL",
    "summary": "Professional summary paragraph",
    "experience": [
      { "id": 1, "company": "Company Name", "role": "Job Title", "date": "Jan 2020 - Present", "desc": "Description of responsibilities and achievements" }
    ],
    "education": [
      { "id": 1, "school": "University Name", "degree": "Degree Name", "date": "2016 - 2020" }
    ],
    "skills": "Comma separated list of all technical and soft skills"
  }
}`;

    const content = await nimChat(
      [
        { role: 'system', content: 'You are a strict JSON API. Respond only with the requested JSON object and nothing else.' },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.2, maxTokens: 1500, json: true },
    );

    const result: any = parseJsonFromModel(content);

    if (result.error === 'NOT_A_RESUME') {
      return NextResponse.json({ error: 'This document does not look like a resume. Please upload a valid resume.' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('ATS Analysis Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

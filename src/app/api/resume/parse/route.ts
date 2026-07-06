import { NextRequest, NextResponse } from 'next/server';
import { nimChat, isNimConfigured, parseJsonFromModel } from '@/lib/nim';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!isNimConfigured()) {
      return NextResponse.json({ error: 'AI is not configured' }, { status: 500 });
    }

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const prompt = `You are an expert resume data extractor. I will provide you with the raw text of a resume.
Extract the information into EXACTLY this JSON structure:
{
  "name": "Full Name",
  "title": "Current or Target Job Title",
  "email": "Email Address",
  "phone": "Phone Number",
  "location": "City, State",
  "linkedin": "LinkedIn URL without https://",
  "summary": "Professional summary",
  "skills": "Comma separated list of skills",
  "experience": [
    { "company": "Company Name", "role": "Job Title", "date": "Date Range (e.g., Jan 2020 - Present)", "desc": "Description of responsibilities and achievements" }
  ],
  "education": [
    { "school": "University/School", "degree": "Degree (e.g., B.S. in Computer Science)", "date": "Date Range (e.g., 2017 - 2021)" }
  ]
}

Leave fields empty string if not found. Do NOT wrap the JSON in markdown code blocks, just return the raw JSON.

Resume Text:
${text.substring(0, 10000)}
`;

    const response = await nimChat(
      [
        { role: 'system', content: 'You are a strict JSON API. Respond only with the requested JSON object and nothing else.' },
        { role: 'user', content: prompt }
      ],
      { temperature: 0.1, maxTokens: 2000, json: true, timeoutMs: 15000 }
    );

    const parsed = parseJsonFromModel(response);
    return NextResponse.json({ data: parsed });
  } catch (error: any) {
    console.error('Resume Parse Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { nimChat, isNimConfigured } from '@/lib/nim';

export async function POST(req: NextRequest) {
  try {
    const { summary, title, skills, experience } = await req.json();

    if (!isNimConfigured()) {
      return NextResponse.json({ error: 'NVIDIA_NIM_API_KEY is not configured' }, { status: 500 });
    }

    const expContext = Array.isArray(experience)
      ? experience
          .map((e: any) => `${e.role || ''} at ${e.company || ''}: ${e.desc || ''}`)
          .filter((s: string) => s.trim().length > 4)
          .join('\n')
      : '';

    const prompt = `You are an expert resume writer. Rewrite the candidate's professional summary so it is concise, impactful, and ATS-friendly.

Target job title: ${title || 'Not specified'}
Key skills: ${skills || 'Not specified'}
${expContext ? `Experience highlights:\n${expContext}\n` : ''}
Current summary: ${summary || '(none provided)'}

Write an improved professional summary of 2-3 sentences in the first person but without using the word "I". Emphasise concrete strengths and, where reasonable, quantified impact. Return ONLY the summary text with no preamble, quotes, or markdown.`;

    const enhanced = await nimChat(
      [
        { role: 'system', content: 'You are a concise professional resume writer. Output only the requested text.' },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.6, maxTokens: 220 },
    );

    // Strip surrounding quotes the model sometimes adds.
    const cleaned = enhanced.replace(/^["'\s]+|["'\s]+$/g, '');

    return NextResponse.json({ summary: cleaned });
  } catch (error: any) {
    console.error('Resume Enhance Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

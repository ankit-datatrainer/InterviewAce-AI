import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { nimChat, isNimConfigured, type ChatMessage } from '@/lib/nim';

export async function POST(req: NextRequest) {
  try {
    const { transcript, role, difficulty, customJD, resumeText } = await req.json();

    if (!isNimConfigured()) {
      return NextResponse.json({ error: 'NVIDIA_NIM_API_KEY is not configured' }, { status: 500 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    let userContext = '';
    if (user && user.user_metadata) {
      const md = user.user_metadata;
      if (md.user_type === 'student') {
        userContext = `The candidate is a student. They study ${md.course || 'their course'} at ${md.college || 'their university'}, graduating in ${md.graduation_year || 'the future'}. Tailor some questions to their academic background or projects when relevant.`;
      } else if (md.user_type === 'professional') {
        userContext = `The candidate is a working professional with ${md.experience_years || 'some'} years of experience, currently working as a ${md.job_title || 'professional'} at ${md.company_name || 'a company'}. Tailor questions to their practical industry experience.`;
      }
    }

    const systemPrompt = `You are Alex, an expert technical and behavioral interviewer conducting an interview for the role of "${role}" at a difficulty level of "${difficulty}".
${customJD ? `The job description is: ${customJD}\n` : ''}
${userContext ? `Candidate Context: ${userContext}\n` : ''}
${resumeText ? `Candidate Resume: \n${resumeText}\n\nPlease base your interview heavily on their resume experience and projects.` : ''}
Your goal is to conduct a realistic, conversational interview. You must evaluate the candidate's previous response, briefly acknowledge it, and then ask the NEXT relevant interview question.
Keep your responses conversational, concise, and professional.
Do not break character. Do not provide a long critique during the interview. Limit your response to 2-3 sentences.`;

    const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt }];

    for (const msg of transcript) {
      if (msg.who === 'ai') {
        messages.push({ role: 'assistant', content: msg.text });
      } else if (msg.who === 'me') {
        messages.push({ role: 'user', content: msg.text });
      }
    }

    // If it's the very first question (transcript is empty), trigger the AI to ask the first question.
    if (transcript.length === 0) {
      messages.push({ role: 'user', content: "Hello! I'm ready to start the interview." });
    }

    // Keep the budget tight: 2-3 sentences ≈ ~100 tokens. A smaller cap means
    // the model finishes generating faster, so Alex replies with less latency.
    const reply = await nimChat(messages, { temperature: 0.7, maxTokens: 140 });

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error('Interview Chat Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

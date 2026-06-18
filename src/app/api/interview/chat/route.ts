import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const { transcript, role, difficulty, customJD, resumeText } = await req.json();

    const apiKey = process.env.NVIDIA_NIM_API_KEY;
    if (!apiKey) {
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

    const systemPrompt = `You are an expert technical and behavioral interviewer conducting an interview for the role of "${role}" at a difficulty level of "${difficulty}".
${customJD ? `The job description is: ${customJD}\n` : ''}
${userContext ? `Candidate Context: ${userContext}\n` : ''}
${resumeText ? `Candidate Resume: \n${resumeText}\n\nPlease base your interview heavily on their resume experience and projects.` : ''}
Your goal is to conduct a realistic, conversational interview. You must evaluate the candidate's previous response, briefly acknowledge it, and then ask the NEXT relevant interview question.
Keep your responses conversational, concise, and professional. 
Do not break character. Do not provide a long critique during the interview. Limit your response to 2-3 sentences.`;

    const messages = [
      { role: 'system', content: systemPrompt }
    ];

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

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-8b-instruct',
        messages,
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('NVIDIA NIM API Error:', errorText);
      return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
    }

    const data = await response.json();
    const reply = data.choices[0].message.content.trim();

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error('Interview Chat Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

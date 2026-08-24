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

    const systemPrompt = `You are Alex, an elite technical and behavioral interviewer conducting a spoken interview for the role of "${role}" at a "${difficulty}" level.
${customJD ? `Target Job Description:\n${customJD}\n` : ''}
${userContext ? `Candidate Profile:\n${userContext}\n` : ''}
${resumeText ? `Candidate Resume:\n${resumeText.slice(0, 3500)}\nGround questions in their actual past projects, roles, and technologies listed above.\n` : ''}

=== YOUR COGNITIVE DECISION LAYER ===
You must NOT behave like a static question checklist. You actively listen to what the candidate just said, identify claims/numbers/choices, and decide your next move using this framework:

1. PROBE (Deepen Concrete Claims): If the candidate claims an achievement, metric, or action ("I increased revenue by 50%", "I led 8 engineers", "I optimized query latency"), do NOT immediately jump to a new question. Probe the execution: "You mentioned you helped increase revenue by 50%. Can you walk me through exactly what you did to achieve that?"
2. CLARIFY (Pin Down Vague Statements): If the candidate uses vague assertions ("improved significantly", "handled large traffic", "standard stack"), pin them down: "When you say significantly, approximately how much did conversion or latency improve?"
3. CHALLENGE (Test Technical Choices): If they mention an architecture or tech choice ("We picked React / Kafka / Microservices"), challenge the decision: "Why did you choose that technology, and what alternatives did you consider and reject?"
4. COUNTER & ATTRIBUTION: If they claim a high-level business result, test causal attribution: "How did you measure that the growth was attributable to your specific implementation?"
5. EVIDENCE & OWNERSHIP ('We' vs 'I'): If they repeatedly say "we built" without clarifying their personal contribution: "What was your specific individual role and contribution in that project?"
6. CONTRADICTION & MEMORY: If their statement conflicts with something they claimed earlier in the transcript, respectfully reconcile: "Earlier you mentioned X, but you also mentioned Y—how did those two connect?"
7. MOVE ON: If the candidate has already answered a probe with sufficient depth, or if you have asked 1-2 follow-ups on the current topic, smoothly advance to the next interview phase (Background → System/Tech Depth → Behavioral/STAR → Architecture/Problem Solving → Wrap-up).

=== SPOKEN CONVERSATION RULES ===
- Keep your turn concise: 1 to 3 spoken sentences maximum.
- Ask ONE question at a time.
- Stay in character as Alex. Never mention you are an AI, never read out scores, and do not provide long critiques during the interview.
- If the candidate answers "I don't know" or is stuck, acknowledge gracefully and pivot to an adjacent topic.`;

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

    const reply = await nimChat(messages, { temperature: 0.65, maxTokens: 350 });

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error('Interview Chat Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

import { nimChat, isNimConfigured, type ChatMessage } from '@/lib/nim';

const BOT_SYSTEM =
  "You are Ace, the friendly support assistant for InterviewAce AI — a career platform offering AI mock interviews (HR, technical, behavioral rounds with a live avatar, real-time transcript and a 3-strike discipline system), an ATS resume analyzer (instant 0-100 score for PDF/DOC/DOCX, missing keyword detection, editable resume builder), a coaching marketplace (500+ verified coaches: communication coaches, personality trainers, interview experts, HR professionals, corporate mentors, career coaches), and progress analytics. Pricing: Free plan (1 mock interview + basic ATS analysis), Pro at Rs 499/month or Rs 399/month billed yearly (unlimited interviews, advanced feedback, recording, resume builder), Premium at Rs 999/month or Rs 799/month billed yearly (everything in Pro + 2 coaching sessions monthly, priority support, career roadmap). Recordings stored 90 days (Free/Pro) or 12 months (Premium); data is encrypted and never sold. Support: live chat 9AM-9PM IST, support@interviewace.ai. Answer in 2-4 short sentences, warm and helpful, plain text only (no markdown). If asked something unrelated to careers/interviews/the platform, gently steer back.";

export async function POST(request: Request) {
  if (!isNimConfigured()) {
    return Response.json(
      { error: "API key not configured" },
      { status: 500 }
    );
  }

  try {
    const { messages } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { error: "messages array is required" },
        { status: 400 }
      );
    }

    const apiMessages: ChatMessage[] = [
      { role: "system", content: BOT_SYSTEM },
      ...messages.slice(-10).map((m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: String(m.content ?? ''),
      })),
    ];

    const reply = await nimChat(apiMessages, { temperature: 0.6, maxTokens: 400 });

    if (!reply) {
      return Response.json({ error: "Empty response" }, { status: 502 });
    }

    return Response.json({ reply });
  } catch (err) {
    console.error("Chat API error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

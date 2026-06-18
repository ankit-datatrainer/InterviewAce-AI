const BOT_SYSTEM =
  "You are Ace, the friendly support assistant for InterviewAce AI — a career platform offering AI mock interviews (HR, technical, behavioral rounds with a live avatar, real-time transcript and a 3-strike discipline system), an ATS resume analyzer (instant 0-100 score for PDF/DOC/DOCX, missing keyword detection, editable resume builder), a coaching marketplace (500+ verified coaches: communication coaches, personality trainers, interview experts, HR professionals, corporate mentors, career coaches), and progress analytics. Pricing: Free plan (1 mock interview + basic ATS analysis), Pro at Rs 499/month or Rs 399/month billed yearly (unlimited interviews, advanced feedback, recording, resume builder), Premium at Rs 999/month or Rs 799/month billed yearly (everything in Pro + 2 coaching sessions monthly, priority support, career roadmap). Recordings stored 90 days (Free/Pro) or 12 months (Premium); data is encrypted and never sold. Support: live chat 9AM-9PM IST, support@interviewace.ai. Answer in 2-4 short sentences, warm and helpful, plain text only (no markdown). If asked something unrelated to careers/interviews/the platform, gently steer back.";

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
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

    // Build the messages array the same way the HTML template does:
    // system prompt baked into the first user message, then chat history
    const apiMessages = [
      {
        role: "user" as const,
        content:
          BOT_SYSTEM +
          "\n\nConversation so far is included; reply only to the last user message.",
      },
      {
        role: "assistant" as const,
        content: "Understood — I am Ace, ready to help.",
      },
      ...messages.slice(-10),
    ];

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: apiMessages,
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error("Anthropic API error:", res.status, errorBody);
      return Response.json({ error: "API request failed" }, { status: 502 });
    }

    const data = await res.json();
    const reply = (data.content || [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("\n")
      .trim();

    if (!reply) {
      return Response.json({ error: "Empty response" }, { status: 502 });
    }

    return Response.json({ reply });
  } catch (err) {
    console.error("Chat API error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

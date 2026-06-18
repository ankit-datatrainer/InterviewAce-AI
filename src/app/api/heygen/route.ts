export async function POST(request: Request) {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "HEYGEN_API_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // empty body is fine
    }

    const text = (body.text as string) || "Hello, I am Aria, your AI interviewer. Let us begin the interview.";
    const avatarId = (body.avatar_id as string) || "Abigail_expressive_2024112501";
    const voiceId = (body.voice_id as string) || "007e1378fc454a9f976db570ba6164a7"; // Aria voice

    const response = await fetch("https://api.heygen.com/v2/video/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify({
        video_inputs: [
          {
            character: {
              type: "avatar",
              avatar_id: avatarId,
              avatar_style: "normal",
            },
            voice: {
              type: "text",
              input_text: text,
              voice_id: voiceId,
            },
          },
        ],
        dimension: { width: 512, height: 512 },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      return Response.json(
        { error: "HeyGen API error", details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: "Failed to generate avatar video", details: String(error) },
      { status: 500 }
    );
  }
}

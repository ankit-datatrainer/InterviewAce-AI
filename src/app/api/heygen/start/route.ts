export async function POST(request: Request) {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "HEYGEN_API_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    const { text, avatar_id, voice_id } = await request.json();

    if (!text) {
      return Response.json(
        { error: "text is required" },
        { status: 400 }
      );
    }

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
              avatar_id: avatar_id || "Abigail_expressive_2024112501",
              avatar_style: "normal",
            },
            voice: {
              type: "text",
              input_text: text,
              voice_id: voice_id || "007e1378fc454a9f976db570ba6164a7",
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

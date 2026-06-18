export async function POST(request: Request) {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "DEEPGRAM_API_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    const { text } = await request.json();

    if (!text) {
      return Response.json(
        { error: "text is required" },
        { status: 400 }
      );
    }

    // Using Deepgram's Aura Asteria (high-quality female English voice)
    const response = await fetch(
      `https://api.deepgram.com/v1/speak?model=aura-asteria-en`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${apiKey}`,
        },
        body: JSON.stringify({
          text,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      return Response.json(
        { error: "Deepgram API error", details: errorData },
        { status: response.status }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    return Response.json(
      { error: "Failed to convert text to speech", details: String(error) },
      { status: 500 }
    );
  }
}

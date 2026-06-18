export async function POST(request: Request) {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "DEEPGRAM_API_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    const audioData = await request.arrayBuffer();

    if (!audioData || audioData.byteLength === 0) {
      return Response.json(
        { error: "Audio data is required" },
        { status: 400 }
      );
    }

    const response = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&language=en",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "audio/wav",
        },
        body: audioData,
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      return Response.json(
        { error: "Deepgram API error", details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    const transcript =
      data.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";

    return Response.json({ transcript });
  } catch (error) {
    return Response.json(
      { error: "Failed to transcribe audio", details: String(error) },
      { status: 500 }
    );
  }
}

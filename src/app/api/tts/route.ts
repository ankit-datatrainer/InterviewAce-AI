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

    // ?format=pcm returns raw 24kHz linear16 PCM (used to drive the LiveAvatar
    // lip-sync via repeatAudio). Default returns MP3 for normal <audio> playback.
    const url = new URL(request.url);
    const pcm = url.searchParams.get('format') === 'pcm';

    const dgQuery = pcm
      ? 'model=aura-orion-en&encoding=linear16&sample_rate=24000&container=none'
      : 'model=aura-orion-en';

    const response = await fetch(
      `https://api.deepgram.com/v1/speak?${dgQuery}`,
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
        "Content-Type": pcm ? "audio/L16" : "audio/mpeg",
      },
    });
  } catch (error) {
    return Response.json(
      { error: "Failed to convert text to speech", details: String(error) },
      { status: 500 }
    );
  }
}

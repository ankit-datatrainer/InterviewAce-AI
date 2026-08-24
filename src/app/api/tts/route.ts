export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const startedAt = Date.now();
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "DEEPGRAM_API_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const text = typeof body?.text === "string" ? body.text.trim().slice(0, 1_500) : "";

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

    const model = process.env.DEEPGRAM_TTS_MODEL || "aura-orion-en";
    const query = new URLSearchParams({ model });

    if (pcm) {
      query.set("encoding", "linear16");
      query.set("sample_rate", "24000");
      query.set("container", "none");
    }

    let response: Response | null = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      response = await fetch(`https://api.deepgram.com/v1/speak?${query}`, {
        method: "POST",
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${apiKey}`,
        },
        body: JSON.stringify({ text }),
      });
      if (response.ok || response.status < 500) break;
      await response.body?.cancel().catch(() => undefined);
    }

    if (!response) throw new Error("Speech provider unavailable");

    if (!response.ok) {
      const errorData = await response.text();
      return Response.json(
        { error: "Deepgram API error", details: errorData },
        { status: response.status }
      );
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") ||
          (pcm ? "audio/L16" : "audio/mpeg"),
        "Cache-Control": "no-store",
        "Server-Timing": `tts;dur=${Date.now() - startedAt}`,
        "X-TTS-Model": model,
      },
    });
  } catch (error) {
    const cause =
      error instanceof Error && error.cause instanceof Error
        ? ` (${error.cause.message})`
        : "";
    return Response.json(
      {
        error: "Failed to convert text to speech",
        details: `${String(error)}${cause}`,
      },
      { status: 500 }
    );
  }
}

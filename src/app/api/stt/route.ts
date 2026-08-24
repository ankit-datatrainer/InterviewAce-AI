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
    const audioData = await request.arrayBuffer();

    if (!audioData || audioData.byteLength === 0) {
      return Response.json(
        { error: "Audio data is required" },
        { status: 400 }
      );
    }

    if (audioData.byteLength > 12 * 1024 * 1024) {
      return Response.json(
        { error: "Audio segment is too large" },
        { status: 413 }
      );
    }

    const contentType = request.headers.get("Content-Type") || "audio/webm";
    const model = process.env.DEEPGRAM_STT_MODEL || "nova-3";
    const query = new URLSearchParams({
      model,
      smart_format: "true",
      punctuate: "true",
      numerals: "true",
      language: "en-US",
    });

    let response: Response | null = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      response = await fetch(`https://api.deepgram.com/v1/listen?${query}`, {
        method: "POST",
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": contentType,
        },
        body: audioData,
      });
      if (response.ok || response.status < 500) break;
      await response.body?.cancel().catch(() => undefined);
    }

    if (!response) throw new Error("Speech recognition provider unavailable");

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

    return Response.json(
      {
        transcript,
        model,
        providerLatencyMs: Date.now() - startedAt,
        confidence: data.results?.channels?.[0]?.alternatives?.[0]?.confidence ?? null,
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "Server-Timing": `stt;dur=${Date.now() - startedAt}`,
          "X-STT-Model": model,
        },
      }
    );
  } catch (error) {
    const cause =
      error instanceof Error && error.cause instanceof Error
        ? ` (${error.cause.message})`
        : "";
    return Response.json(
      {
        error: "Failed to transcribe audio",
        details: `${String(error)}${cause}`,
      },
      { status: 500 }
    );
  }
}

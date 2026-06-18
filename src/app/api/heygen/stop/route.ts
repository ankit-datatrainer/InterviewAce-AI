export async function POST(request: Request) {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "HEYGEN_API_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    const { session_id } = await request.json();

    if (!session_id) {
      return Response.json(
        { error: "session_id is required" },
        { status: 400 }
      );
    }

    const response = await fetch("https://api.heygen.com/v2/streaming.stop", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify({ session_id }),
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
      { error: "Failed to stop streaming session", details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "HEYGEN_API_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("video_id");

    if (!videoId) {
      return Response.json(
        { error: "video_id query parameter is required" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`,
      {
        headers: {
          "X-Api-Key": apiKey,
        },
      }
    );

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
      { error: "Failed to check video status", details: String(error) },
      { status: 500 }
    );
  }
}

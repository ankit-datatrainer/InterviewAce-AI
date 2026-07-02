export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: 'HEYGEN_API_KEY is missing from environment variables' },
        { status: 500 }
      );
    }

    const res = await fetch('https://api.heygen.com/v1/streaming.create_token', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return Response.json(
        { error: 'Failed to create token from HeyGen API', details: text },
        { status: res.status }
      );
    }

    const data = await res.json();
    
    // The HeyGen v1 streaming API responds with { data: { token: "..." } }
    return Response.json({ token: data.data.token });
  } catch (error) {
    console.error('Error fetching HeyGen token:', error);
    return Response.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

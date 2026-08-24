export const dynamic = 'force-dynamic';

export async function GET() {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "DEEPGRAM_API_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    const grantResponse = await fetch('https://api.deepgram.com/v1/auth/grant', {
      method: 'POST',
      headers: { Authorization: `Token ${apiKey}` },
      cache: 'no-store',
    });

    if (!grantResponse.ok) {
      const details = await grantResponse.text();
      return Response.json(
        {
          error: 'Could not create a temporary speech token',
          details,
          serverFallback: true,
        },
        { status: grantResponse.status },
      );
    }

    const data = await grantResponse.json();
    return Response.json(
      {
        token: data.access_token,
        tokenType: 'bearer',
        expiresIn: data.expires_in,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return Response.json(
      { error: 'Could not connect to the speech service', details: String(error) },
      { status: 502 },
    );
  }
}

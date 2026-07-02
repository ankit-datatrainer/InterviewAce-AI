import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { randomUUID } from 'crypto';

// Generates a 100ms client auth token (a JWT signed HS256 with the app secret).
// Requires HMS_ACCESS_KEY and HMS_SECRET in the environment. When they are not
// set the route responds 503 with { configured: false } so the UI can show a
// graceful "video coaching not configured" state instead of a broken join.

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function signHs256(payload: Record<string, unknown>, secret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = base64url(crypto.createHmac('sha256', secret).update(data).digest());
  return `${data}.${signature}`;
}

export async function POST(req: NextRequest) {
  try {
    const accessKey = process.env.HMS_ACCESS_KEY;
    const secret = process.env.HMS_SECRET;

    if (!accessKey || !secret) {
      return NextResponse.json(
        { configured: false, error: 'Live video coaching is not configured on this server.' },
        { status: 503 },
      );
    }

    const { roomId, userId, role } = await req.json();
    if (!roomId) {
      return NextResponse.json({ error: 'roomId is required' }, { status: 400 });
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      access_key: accessKey,
      room_id: String(roomId),
      user_id: userId ? String(userId) : randomUUID(),
      role: role || process.env.HMS_DEFAULT_ROLE || 'host',
      type: 'app',
      version: 2,
      iat: now,
      nbf: now,
      exp: now + 24 * 60 * 60, // 24h
      jti: randomUUID(),
    };

    const token = signHs256(payload, secret);
    return NextResponse.json({ configured: true, token });
  } catch (error: any) {
    console.error('100ms token error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

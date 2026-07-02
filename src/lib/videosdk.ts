import crypto from 'crypto';

// Server-side VideoSDK.live helper.
// Generates short-lived auth tokens (JWT signed HS256 with the account secret)
// and creates/validates meeting rooms via the VideoSDK REST API.
// Credentials come from VIDEOSDK_API_KEY / VIDEOSDK_SECRET.

const VIDEOSDK_API = 'https://api.videosdk.live/v2';

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function isVideoSdkConfigured(): boolean {
  return !!(process.env.VIDEOSDK_API_KEY && process.env.VIDEOSDK_SECRET);
}

/**
 * Signs a VideoSDK auth token. `allow_mod` lets the holder manage the meeting
 * (end it, remove participants); both coaches and students get `allow_join`.
 */
export function generateVideoSdkToken(opts: { roomId?: string; participantId?: string; moderator?: boolean } = {}): string {
  const apikey = process.env.VIDEOSDK_API_KEY;
  const secret = process.env.VIDEOSDK_SECRET;
  if (!apikey || !secret) throw new Error('VideoSDK is not configured');

  const now = Math.floor(Date.now() / 1000);
  const payload: Record<string, unknown> = {
    apikey,
    permissions: opts.moderator ? ['allow_join', 'allow_mod'] : ['allow_join'],
    version: 2,
    iat: now,
    exp: now + 24 * 60 * 60, // 24h
  };
  if (opts.roomId) payload.roomId = opts.roomId;
  if (opts.participantId) payload.participantId = opts.participantId;

  const header = { alg: 'HS256', typ: 'JWT' };
  const data = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = base64url(crypto.createHmac('sha256', secret).update(data).digest());
  return `${data}.${signature}`;
}

/** Creates a brand new VideoSDK meeting room and returns its roomId. */
export async function createVideoSdkRoom(token: string): Promise<string> {
  const res = await fetch(`${VIDEOSDK_API}/rooms`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`VideoSDK room creation failed (${res.status}): ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  if (!data.roomId) throw new Error('VideoSDK did not return a roomId');
  return data.roomId as string;
}

/** Returns true if the given roomId is a valid/known VideoSDK room. */
export async function validateVideoSdkRoom(token: string, roomId: string): Promise<boolean> {
  const res = await fetch(`${VIDEOSDK_API}/rooms/validate/${encodeURIComponent(roomId)}`, {
    headers: { Authorization: token },
  });
  return res.ok;
}

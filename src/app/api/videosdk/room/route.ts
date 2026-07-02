import { NextRequest, NextResponse } from 'next/server';
import {
  generateVideoSdkToken,
  createVideoSdkRoom,
  validateVideoSdkRoom,
  isVideoSdkConfigured,
} from '@/lib/videosdk';

// Resolves a usable VideoSDK room + token for the client.
// - body { roomId } that is a valid existing room  -> reuse it (created: false)
// - body { roomId } that is missing/invalid/'new'  -> create a fresh room (created: true)
// The client should adopt the returned roomId (it is the canonical, shareable id).
export async function POST(req: NextRequest) {
  if (!isVideoSdkConfigured()) {
    return NextResponse.json({ configured: false, error: 'VideoSDK is not configured' }, { status: 503 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const requested: string | undefined = body?.roomId;
    const role: string | undefined = body?.role;
    const token = generateVideoSdkToken({ moderator: role === 'coach' });

    if (requested && requested !== 'new') {
      const valid = await validateVideoSdkRoom(token, requested);
      if (valid) {
        return NextResponse.json({ configured: true, roomId: requested, token, created: false });
      }
    }

    const roomId = await createVideoSdkRoom(token);
    return NextResponse.json({ configured: true, roomId, token, created: true });
  } catch (error: any) {
    console.error('VideoSDK room error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

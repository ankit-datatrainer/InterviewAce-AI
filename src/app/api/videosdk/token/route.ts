import { NextRequest, NextResponse } from 'next/server';
import { generateVideoSdkToken, isVideoSdkConfigured } from '@/lib/videosdk';

// Returns a short-lived VideoSDK auth token for the client SDK.
export async function GET(req: NextRequest) {
  if (!isVideoSdkConfigured()) {
    return NextResponse.json({ configured: false, error: 'VideoSDK is not configured' }, { status: 503 });
  }
  const role = req.nextUrl.searchParams.get('role');
  const token = generateVideoSdkToken({ moderator: role === 'coach' });
  return NextResponse.json({ configured: true, token });
}

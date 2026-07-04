'use client';

import { useParams } from 'next/navigation';
import VideoSession from '@/components/VideoSession';

// Silent-observer view of a live coaching session for the super admin.
export default function AdminMonitorRoomPage() {
  const params = useParams();
  const roomId = (params?.id as string) || '';
  return (
    <VideoSession
      paramRoomId={roomId}
      role="monitor"
      leaveHref="/admin/sessions"
      canonicalBase="/admin/room"
    />
  );
}

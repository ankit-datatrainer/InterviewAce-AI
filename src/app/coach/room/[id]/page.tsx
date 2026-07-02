'use client';

import { useParams } from 'next/navigation';
import VideoSession from '@/components/VideoSession';

export default function CoachCoachingRoom() {
  const params = useParams();
  const id = String(params?.id || '');
  return (
    <VideoSession
      paramRoomId={id}
      role="coach"
      leaveHref="/coach/sessions"
      canonicalBase="/coach/room"
    />
  );
}

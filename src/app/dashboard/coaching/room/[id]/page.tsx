'use client';

import { useParams } from 'next/navigation';
import VideoSession from '@/components/VideoSession';

export default function StudentCoachingRoom() {
  const params = useParams();
  const id = String(params?.id || '');
  return (
    <VideoSession
      paramRoomId={id}
      role="student"
      leaveHref="/dashboard"
      canonicalBase="/dashboard/coaching/room"
    />
  );
}

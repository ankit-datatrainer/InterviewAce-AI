'use server';

import { getServiceClient } from '@/lib/supabase-service';

export async function getBookedSlotsForCoach(coachId: string) {
  const serviceClient = getServiceClient();
  if (!serviceClient) return [];
  
  const { data } = await serviceClient
    .from('bookings')
    .select('session_date, time_slot')
    .eq('coach_id', coachId)
    .neq('status', 'cancelled');
    
  return data || [];
}

export async function isSlotBooked(coachId: string, date: string, timeSlot: string) {
  const serviceClient = getServiceClient();
  if (!serviceClient) return false;
  
  const { count } = await serviceClient
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('coach_id', coachId)
    .eq('session_date', date)
    .eq('time_slot', timeSlot)
    .neq('status', 'cancelled');
    
  return (count || 0) > 0;
}

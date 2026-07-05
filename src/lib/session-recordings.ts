import { createClient } from '@/lib/supabase';

/** Turns a stored recording path (bucket-relative) into a temporary download link. */
export async function getRecordingDownloadUrl(path: string): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.storage.from('session-recordings').createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

import { createClient } from '@supabase/supabase-js';

export interface ClientVideo {
  id: string;
  client_id: string;
  youtube_video_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  upload_date: string;
  duration_iso: string | null;
  published_at: string;
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function getClientVideos(client_id: string): Promise<ClientVideo[]> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('client_videos')
    .select('id, client_id, youtube_video_id, title, description, thumbnail_url, upload_date, duration_iso, published_at')
    .eq('client_id', client_id)
    .order('published_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error(JSON.stringify({ event: 'get_client_videos_error', client_id, error: error.message }));
    return [];
  }

  return data ?? [];
}

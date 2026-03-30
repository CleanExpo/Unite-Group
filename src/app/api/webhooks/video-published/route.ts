import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let body: {
    client_id: string;
    youtube_video_id: string;
    title: string;
    description?: string;
    thumbnail_url?: string;
    upload_date: string;
    duration_iso?: string;
    slug: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { slug, ...videoData } = body;

  if (!videoData.client_id || !videoData.youtube_video_id || !videoData.title || !videoData.upload_date || !slug) {
    return NextResponse.json({ error: 'Missing required fields: client_id, youtube_video_id, title, upload_date, slug' }, { status: 400 });
  }

  const { error } = await supabase
    .from('client_videos')
    .upsert(videoData, { onConflict: 'client_id,youtube_video_id' });

  if (error) {
    console.error(JSON.stringify({ event: 'video_published_webhook_error', error: error.message }));
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  revalidatePath(`/clients/${slug}`);

  console.log(JSON.stringify({ event: 'video_published_webhook_success', client_id: videoData.client_id, youtube_video_id: videoData.youtube_video_id, slug }));

  return NextResponse.json({ ok: true });
}

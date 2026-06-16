export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { rateLimit, RATE_LIMITS } from '@/lib/ratelimit';
import { timingSafeTokenMatch } from '@/lib/security/safe-compare';

export async function POST(request: NextRequest) {
  // Rate-limit FIRST (legit webhook bursts are OK, cap at 30/min/IP).
  const gate = await rateLimit(request, { key: 'video-published', ...RATE_LIMITS.videoPublished });
  if (!gate.ok) {
    return NextResponse.json(
      { error: 'rate_limited', retry_after_ms: gate.retryAfterMs },
      { status: 429 },
    );
  }

  // Internal-secret auth — same pattern as internal/sync-post-performance (PR #47).
  // Without this, anyone could spoof rows in `client_videos` for any client_id.
  const secret = request.headers.get('x-internal-secret');
  if (!timingSafeTokenMatch(secret, process.env.INTERNAL_API_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

/**
 * SYN-509: GET /api/dashboard/videos
 * Returns the current user's YouTube videos with stats for the YouTubeEmbedWidget.
 */
import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getClientYouTubeVideos } from '@/lib/dashboard/getClientYouTubeVideos';

export async function GET() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('client_id')
    .eq('id', session.user.id)
    .single();

  const clientId: string | null = profile?.client_id ?? null;

  if (!clientId) {
    return NextResponse.json({ videos: [] });
  }

  const videos = await getClientYouTubeVideos(clientId);

  return NextResponse.json({ videos });
}

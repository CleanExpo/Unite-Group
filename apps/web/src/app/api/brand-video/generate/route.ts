// Brand Video Studio — enqueue a generation job.
//
// POST /api/brand-video/generate
// Auth: Supabase session (owner-scoped). Validates input with zod, inserts a
// queued row into brand_video_jobs owned by the caller (created_by = user.id),
// and returns the job id + status. The out-of-band worker
// (apps/web/scripts/brand-video-worker.mjs) claims and runs queued jobs.
// Mirrors the getUser() guard pattern in api/contacts/route.ts.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser, createClient } from '@/lib/supabase/server';
import { sanitiseError } from '@/lib/error-reporting';
import { BRAND_VIDEO_STYLE_KEYS, DEFAULT_BRAND_VIDEO_STYLE } from '@/lib/brand-video/styles';

export const dynamic = 'force-dynamic';

const generateSchema = z.object({
  brand: z.string().trim().min(1).max(120),
  style: z
    .enum(BRAND_VIDEO_STYLE_KEYS as [string, ...string[]])
    .default(DEFAULT_BRAND_VIDEO_STYLE),
  topic: z.string().trim().min(1).max(2000),
  count: z.coerce.number().int().min(1).max(10).default(1),
});

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { brand, style, topic, count } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('brand_video_jobs')
    .insert({
      brand,
      style,
      topic,
      count,
      status: 'queued',
      created_by: user.id,
    })
    .select('id, status')
    .single();

  if (error) return NextResponse.json({ error: sanitiseError(error, 'Failed to queue brand video job', { route: '/api/brand-video/generate' }) }, { status: 500 });

  return NextResponse.json({ jobId: data.id, status: data.status }, { status: 201 });
}

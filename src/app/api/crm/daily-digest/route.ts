import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/security/require-admin';
import { readDailyCrmDigestForRoute } from '@/lib/crm/read-daily-digest';

export const dynamic = 'force-dynamic';

const digestQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

function parseQuery(request: NextRequest) {
  return digestQuerySchema.safeParse({
    limit: request.nextUrl.searchParams.get('limit') ?? undefined,
  });
}

function statusForError(error: string): 500 | 503 {
  return error === 'crm_not_configured' ? 503 : 500;
}

export async function GET(request: NextRequest) {
  const parsed = parseQuery(request);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_digest_query' }, { status: 400 });
  }

  // Intentional pre-auth config gate: without service-role config, requireAdmin
  // would fall through to session inspection and can touch Supabase auth/session
  // machinery. This route degrades closed before any CRM or session read when
  // the digest data plane is not configured.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'crm_not_configured' }, { status: 503 });
  }

  const gate = await requireAdmin(request);
  if (gate instanceof NextResponse) return gate;

  const result = await readDailyCrmDigestForRoute(parsed.data.limit);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: statusForError(result.error) });
  }

  return NextResponse.json(
    {
      success: true,
      digest: result.digest,
      leadCount: result.leadCount,
      opportunityCount: result.opportunityCount,
      filters: result.filters,
    },
    { status: 200 },
  );
}

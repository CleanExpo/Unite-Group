import { NextResponse } from 'next/server';
import { isFrontDeskEnabled } from '@/lib/frontdesk/flag';

export const runtime = 'nodejs';

/**
 * AI Front Desk chat endpoint — ships DARK.
 *
 * When `UNITE_FRONT_DESK_ENABLED !== 'true'` the route 404s and does no work
 * (acceptance criterion: flag off ⇒ route rejects). When the flag is on, the live
 * answer is served by the shared runtime once this brand's config + corpus source +
 * an embeddings/LLM key are provisioned — until then it reports 503, never a fake reply.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isFrontDeskEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as { message?: unknown } | null;
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message) {
    return NextResponse.json({ error: 'message required' }, { status: 400 });
  }

  return NextResponse.json(
    { error: 'Front desk enabled but not yet provisioned (config + corpus + keys pending)' },
    { status: 503 },
  );
}

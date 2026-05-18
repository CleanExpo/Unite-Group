// @ts-nocheck
// POST /api/clients/[slug]/brand-vote
//
// Public endpoint for the Hour-1 portal Brand Vote section. Anyone with
// the portal URL can submit ONE vote per IP per slug per 24h. Increments
// portal_content.brand_vote.votes[name] and appends an audit entry to
// portal_content.brand_vote.votes_log.
//
// Body: { candidate: string }
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { applyRateLimit, UNKNOWN_IP } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// Defense-in-depth on top of the existing one-vote-per-IP-per-24h dedupe
// stored in portal_content.brand_vote.votes_log. The dedupe protects the
// canonical state; this rate-limit blunts rapid burst attempts (someone
// hammering many candidate values to probe for accepted strings or to
// flood the votes_log array). 20 req/min/IP — legit user clicks once.
const VOTE_RATE_LIMIT = 20;
const VOTE_RATE_WINDOW_MS = 60_000;

function clientIp(request: NextRequest): string | null {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const ip = clientIp(request) ?? UNKNOWN_IP;
  const rate = applyRateLimit(ip, VOTE_RATE_LIMIT, VOTE_RATE_WINDOW_MS);
  if (!rate.ok) {
    return NextResponse.json(
      { error: 'rate_limited', resetAt: rate.resetAt },
      { status: 429 },
    );
  }

  try {
    const { slug } = await params;
    if (!slug || !/^[a-z0-9][a-z0-9-]{1,40}$/.test(slug)) {
      return NextResponse.json({ error: 'invalid slug' }, { status: 400 });
    }
    const body = await request.json().catch(() => null);
    const candidate = body?.candidate;
    if (typeof candidate !== 'string' || candidate.length < 1 || candidate.length > 40) {
      return NextResponse.json({ error: 'candidate required' }, { status: 400 });
    }

    const admin = getAdminClient();
    const { data: client, error: readErr } = await admin
      .from('nexus_clients')
      .select('id, portal_content')
      .eq('slug', slug)
      .maybeSingle();
    if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
    if (!client) return NextResponse.json({ error: 'client not found' }, { status: 404 });

    const portal = (client.portal_content ?? {}) as Record<string, any>;
    const brandVote = (portal.brand_vote ?? {}) as Record<string, any>;
    if (!brandVote.active) {
      return NextResponse.json({ error: 'voting closed' }, { status: 410 });
    }
    const candidates = (brandVote.candidates ?? []) as Array<{ name: string }>;
    if (!candidates.some(c => c.name === candidate)) {
      return NextResponse.json({ error: 'candidate not in shortlist' }, { status: 400 });
    }

    const ip = clientIp(request);
    const votesLog = Array.isArray(brandVote.votes_log) ? brandVote.votes_log : [];

    // One vote per IP per 24h
    const now = Date.now();
    const recent = votesLog.find((v: any) =>
      v.ip === ip && (now - new Date(v.voted_at).getTime()) < 24 * 60 * 60 * 1000
    );
    if (recent) {
      return NextResponse.json({
        error: 'already-voted',
        previous: recent.candidate,
      }, { status: 409 });
    }

    const votes = { ...(brandVote.votes ?? {}) };
    votes[candidate] = (votes[candidate] || 0) + 1;
    votesLog.push({
      candidate,
      ip,
      user_agent: request.headers.get('user-agent') || null,
      voted_at: new Date().toISOString(),
    });

    const updatedPortal = {
      ...portal,
      brand_vote: { ...brandVote, votes, votes_log: votesLog },
    };

    const { error: writeErr } = await admin
      .from('nexus_clients')
      .update({ portal_content: updatedPortal })
      .eq('id', client.id);
    if (writeErr) return NextResponse.json({ error: writeErr.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      candidate,
      tally: votes,
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'unexpected', detail: String(e?.message || e) }, { status: 500 });
  }
}

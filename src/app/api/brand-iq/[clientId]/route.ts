/**
 * SYN-527: GET /api/brand-iq/[clientId]
 * Returns brand profile + AI-generated next steps for BrandIQCard.
 * Generates next steps on demand (cached in DB after first generation).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';
import { generateNextSteps } from '@/lib/brandiq/generateNextSteps';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const supabase = createServerComponentClient<Database>({ cookies });

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only allow clients to fetch their own Brand IQ (or admins)
  const { clientId } = await params;
  const requestedId = clientId;
  if (requestedId !== session.user.id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Fetch brand profile from Supabase (brand_profiles table — populated by brand intelligence pipeline)
  const { data: brandProfile, error: profileError } = await supabase
    .from('brand_profiles' as any)
    .select('*')
    .eq('client_id', requestedId)
    .single();

  if (profileError || !brandProfile) {
    return NextResponse.json({ error: 'Brand profile not found' }, { status: 404 });
  }

  // Check if cached next steps exist (generated within last 30 days)
  const { data: cachedSteps } = await supabase
    .from('brand_iq_next_steps' as any)
    .select('*')
    .eq('client_id', requestedId)
    .gte('generated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .single();

  let nextSteps = cachedSteps?.steps ?? null;

  if (!nextSteps) {
    // Generate fresh next steps via Claude haiku
    try {
      const result = await generateNextSteps({
        client_id: requestedId,
        business_name: brandProfile.business_name ?? 'your business',
        industry: brandProfile.industry ?? 'general',
        brand_voice_score: brandProfile.brand_voice_score ?? 50,
        top_content_attributes: brandProfile.top_content_attributes ?? [],
        best_posting_window: brandProfile.best_posting_window ?? 'weekday mornings',
        audience_resonance_score: brandProfile.audience_resonance_score ?? 50,
        weak_signals: brandProfile.weak_signals ?? [],
      });

      nextSteps = result.next_steps;

      // Cache for 30 days
      await supabase
        .from('brand_iq_next_steps' as any)
        .upsert({
          client_id: requestedId,
          steps: nextSteps,
          generated_at: new Date().toISOString(),
        }, { onConflict: 'client_id' });

    } catch (err) {
      console.error('[BrandIQ] Next steps generation failed:', err);
      nextSteps = [];
    }
  }

  return NextResponse.json({
    profile: {
      brand_voice_score: brandProfile.brand_voice_score ?? 50,
      top_content_attributes: brandProfile.top_content_attributes ?? [],
      best_posting_window: brandProfile.best_posting_window ?? 'Not enough data yet',
      audience_resonance_score: brandProfile.audience_resonance_score ?? 50,
    },
    next_steps: nextSteps,
  });
}

import { createClient } from '@supabase/supabase-js';

export interface SafetyCheckResult {
  safe: boolean;
  reason?: string;
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function runSafetyChecks(
  client_id: string,
  _post_id: string,
  platform: string
): Promise<SafetyCheckResult> {
  const supabase = getServiceClient();

  // 1. Check calendar_mode is 'live'
  const { data: profile } = await supabase
    .from('profiles')
    .select('calendar_mode')
    .eq('id', client_id)
    .single();

  if (!profile || profile.calendar_mode !== 'live') {
    return { safe: false, reason: 'Client is not in Live Mode' };
  }

  // 2. 3-week gate: must have ≥3 weekly_digests
  const { count: digestCount } = await supabase
    .from('weekly_digests')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', client_id);

  if ((digestCount ?? 0) < 3) {
    return { safe: false, reason: `3-week gate: only ${digestCount ?? 0} digests completed` };
  }

  // 3. Check platform token exists and is not expired
  const { data: token } = await supabase
    .from('platform_tokens')
    .select('id, expires_at')
    .eq('client_id', client_id)
    .eq('platform', platform)
    .single();

  if (!token) {
    return { safe: false, reason: `No platform token for ${platform}` };
  }

  if (token.expires_at && new Date(token.expires_at) < new Date()) {
    return { safe: false, reason: `Platform token expired for ${platform}` };
  }

  // 4. Check subscription is active
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('client_id', client_id)
    .single();

  if (!subscription || subscription.status !== 'active') {
    return { safe: false, reason: 'Client subscription is not active' };
  }

  return { safe: true };
}

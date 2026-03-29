/**
 * SYN-525: Server-side helper to persist a WinEvent and flag the client profile.
 * Called from the analytics sync pipeline after detectFirstWin() returns a WinEvent.
 * Uses the Supabase service role client (server-only).
 */

import { createClient } from '@supabase/supabase-js';
import type { WinEvent } from './detectFirstWin';
import { formatWinMessage } from './detectFirstWin';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function saveFirstWinNotification(win: WinEvent): Promise<void> {
  const supabase = getServiceClient();

  // 1. Insert notification
  const { error: notifError } = await supabase
    .from('client_notifications')
    .insert({
      client_id: win.client_id,
      type: 'first_win',
      payload: {
        post_id: win.post_id,
        posted_at: win.posted_at,
        platform: win.platform,
        metric: win.metric,
        actual_value: win.actual_value,
        baseline_value: win.baseline_value,
        improvement_pct: win.improvement_pct,
        message: formatWinMessage(win),
      },
      read: false,
    });

  if (notifError) {
    console.error(JSON.stringify({ event: 'first_win_notification_insert_failed', error: notifError.message, client_id: win.client_id }));
    return;
  }

  // 2. Flag the profile so BrandIQ unlocks and trial conversion uses win-anchored copy
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      first_win_detected: true,
      first_win_detected_at: win.detected_at,
      brand_iq_unlocked: true,
    })
    .eq('id', win.client_id);

  if (profileError) {
    console.error(JSON.stringify({ event: 'first_win_profile_update_failed', error: profileError.message, client_id: win.client_id }));
  }

  console.log(JSON.stringify({ event: 'first_win_saved', client_id: win.client_id, improvement_pct: win.improvement_pct }));
}

/**
 * Convenience: run detection + save in one call from the analytics pipeline.
 * Import detectFirstWin separately, then call this if it returns a WinEvent.
 *
 * Usage in analytics sync pipeline:
 *   const win = detectFirstWin(post, baseline);
 *   if (win) await saveFirstWinNotification(win);
 */

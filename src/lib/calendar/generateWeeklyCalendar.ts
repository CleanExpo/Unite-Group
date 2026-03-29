/**
 * SYN-521: Weekly Content Calendar Auto-Generation Engine
 * Orchestrates digest reading → slot scheduling → caption generation → Supabase save.
 *
 * Cold-start gate: requires MIN_DIGESTS completed weekly digests.
 * Cost guardrail: ~$0.002 per client per week via haiku-4-5.
 */
import { createClient } from '@supabase/supabase-js';
import { readDigestSignals } from './digestReader';
import { scheduleSlots, getNextMonday } from './slotScheduler';
import { generateCaptions } from './captionGenerator';
import type { CalendarSlot, ContentCalendar, ClientContext, GenerateCalendarResult } from './types';

const MIN_DIGESTS = 3;

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function generateWeeklyCalendar(
  client_id: string,
  clientContext: ClientContext
): Promise<GenerateCalendarResult> {
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  const HAIKU_INPUT_COST_PER_1M = 0.25;
  const HAIKU_OUTPUT_COST_PER_1M = 1.25;

  try {
    // 1. Cold-start gate
    const { signals, digest_count } = await readDigestSignals(client_id, MIN_DIGESTS);
    if (!signals) {
      return { calendar: null, skipped_reason: 'cold_start', cost_usd: 0 };
    }

    // 2. Schedule 7 slots
    const weekStart = getNextMonday();
    const partialSlots = scheduleSlots(signals, weekStart);

    // 3. Generate captions for each slot
    const completedSlots: CalendarSlot[] = [];
    for (const partialSlot of partialSlots) {
      const captionResult = await generateCaptions(partialSlot, clientContext);
      totalInputTokens += captionResult.input_tokens;
      totalOutputTokens += captionResult.output_tokens;
      completedSlots.push({ ...partialSlot, captions: captionResult.captions });
    }

    const costUsd =
      (totalInputTokens / 1_000_000) * HAIKU_INPUT_COST_PER_1M +
      (totalOutputTokens / 1_000_000) * HAIKU_OUTPUT_COST_PER_1M;

    // 4. Save to Supabase
    const supabase = getServiceClient();
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    const { data: saved, error } = await supabase
      .from('content_calendars')
      .upsert({
        client_id,
        week_start: weekStartStr,
        slots: completedSlots,
        status: 'draft',
        generation_cost_usd: costUsd,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'client_id,week_start' })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to save calendar: ${error.message}`);

    // 5. Track pipeline cost (SYN-518)
    try {
      const { trackPipelineCost } = await import('@/lib/pipelines/track-cost');
      await trackPipelineCost({
        pipeline_name: 'content-calendar-generation',
        client_id,
        run_id: `calendar-${client_id}-${weekStartStr}`,
        model: 'claude-haiku-4-5-20251001',
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
        cost_usd: costUsd,
      });
    } catch {
      console.error(JSON.stringify({ event: 'calendar_cost_track_failed', client_id }));
    }

    const calendar: ContentCalendar = {
      calendar_id: saved.id,
      client_id,
      week_start: weekStartStr,
      slots: completedSlots,
      status: 'draft',
      generation_cost_usd: costUsd,
      created_at: new Date().toISOString(),
    };

    console.log(JSON.stringify({
      event: 'calendar_generated',
      client_id,
      week_start: weekStartStr,
      slot_count: completedSlots.length,
      cost_usd: costUsd,
    }));

    return { calendar, cost_usd: costUsd };
  } catch (error) {
    console.error(JSON.stringify({
      event: 'calendar_generation_failed',
      client_id,
      error: error instanceof Error ? error.message : String(error),
    }));
    return { calendar: null, skipped_reason: 'error', cost_usd: 0 };
  }
}

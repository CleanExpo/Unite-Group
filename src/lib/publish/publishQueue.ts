import { createClient } from '@supabase/supabase-js';
import { trackPipelineCost } from '@/lib/pipelines/track-cost';
import { runSafetyChecks } from './safetyChecks';
import { publishToInstagram } from './platformAdapters/instagram';
import type { InstagramPost } from './platformAdapters/instagram';
import { publishToFacebook } from './platformAdapters/facebook';
import type { FacebookPost } from './platformAdapters/facebook';
import { publishToLinkedIn } from './platformAdapters/linkedin';
import type { LinkedInPost } from './platformAdapters/linkedin';
import type { PublishResult } from './platformAdapters/instagram';

const MAX_ATTEMPTS = 12;
const RETRY_INTERVAL_HOURS = 4;

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface QueueItem {
  id: string;
  post_id: string;
  client_id: string;
  platform: string;
  scheduled_at: string;
  status: string;
  attempts: number;
}

interface PostContent {
  caption?: string;
  message?: string;
  text?: string;
  image_url?: string;
  video_url?: string;
  link?: string;
  post_type?: 'feed' | 'reel';
  author_urn?: string;
}

interface PlatformToken {
  access_token: string;
  page_id?: string;
  expires_at?: string;
}

export interface ProcessQueueResult {
  processed: number;
  succeeded: number;
  failed: number;
  held: number;
}

async function dispatchToAdapter(
  platform: string,
  token: PlatformToken,
  content: PostContent
): Promise<PublishResult> {
  if (platform === 'instagram') {
    const post: InstagramPost = {
      caption: content.caption ?? content.message ?? content.text ?? '',
      image_url: content.image_url,
      video_url: content.video_url,
      post_type: content.post_type ?? 'feed',
    };
    return publishToInstagram(token.access_token, token.page_id ?? '', post);
  }

  if (platform === 'facebook') {
    const post: FacebookPost = {
      message: content.message ?? content.caption ?? content.text ?? '',
      link: content.link,
      image_url: content.image_url,
    };
    return publishToFacebook(token.access_token, token.page_id ?? '', post);
  }

  if (platform === 'linkedin') {
    const post: LinkedInPost = {
      text: content.text ?? content.message ?? content.caption ?? '',
      author_urn: content.author_urn ?? '',
    };
    return publishToLinkedIn(token.access_token, post);
  }

  return { success: false, error: `Unsupported platform: ${platform}` };
}

export async function processPublishQueue(itemIds?: string[]): Promise<ProcessQueueResult> {
  const supabase = getServiceClient();
  const runId = crypto.randomUUID();

  const result: ProcessQueueResult = { processed: 0, succeeded: 0, failed: 0, held: 0 };

  // Fetch queue items — either the specified IDs or all due items
  let query = supabase
    .from('publish_queue')
    .select('id, post_id, client_id, platform, scheduled_at, status, attempts')
    .in('status', ['pending', 'failed'])
    .lte('scheduled_at', new Date().toISOString())
    .lt('attempts', MAX_ATTEMPTS)
    .order('scheduled_at', { ascending: true })
    .limit(50);

  if (itemIds && itemIds.length > 0) {
    query = supabase
      .from('publish_queue')
      .select('id, post_id, client_id, platform, scheduled_at, status, attempts')
      .in('id', itemIds)
      .in('status', ['pending', 'failed'])
      .lt('attempts', MAX_ATTEMPTS);
  }

  const { data: items, error: fetchError } = await query;

  if (fetchError) {
    console.error(JSON.stringify({ event: 'publish_queue_fetch_error', run_id: runId, error: fetchError.message }));
    return result;
  }

  if (!items || items.length === 0) {
    console.log(JSON.stringify({ event: 'publish_queue_empty', run_id: runId }));
    return result;
  }

  for (const item of items as QueueItem[]) {
    result.processed++;
    const attemptNumber = item.attempts + 1;

    // Mark as 'publishing' to prevent double-processing
    await supabase
      .from('publish_queue')
      .update({ status: 'publishing', updated_at: new Date().toISOString() })
      .eq('id', item.id);

    // Safety checks — must pass before any publish attempt
    const safety = await runSafetyChecks(item.client_id, item.post_id, item.platform);

    if (!safety.safe) {
      console.log(JSON.stringify({
        event: 'publish_safety_block',
        run_id: runId,
        queue_id: item.id,
        client_id: item.client_id,
        platform: item.platform,
        reason: safety.reason,
      }));

      // Log the blocked attempt
      await supabase.from('publish_attempt_log').insert({
        queue_id: item.id,
        client_id: item.client_id,
        platform: item.platform,
        attempt_number: attemptNumber,
        status: 'failure',
        error_message: `Safety check failed: ${safety.reason}`,
        response_data: { safety_reason: safety.reason },
      });

      const newAttempts = attemptNumber;
      if (newAttempts >= MAX_ATTEMPTS) {
        await supabase
          .from('publish_queue')
          .update({ status: 'held', attempts: newAttempts, last_error: safety.reason, updated_at: new Date().toISOString() })
          .eq('id', item.id);

        await supabase.from('notifications').insert({
          client_id: item.client_id,
          type: 'publish_held',
          message: `Post held after ${MAX_ATTEMPTS} attempts. Last error: ${safety.reason}`,
          metadata: { queue_id: item.id, platform: item.platform, post_id: item.post_id },
        });

        result.held++;
      } else {
        const reschedule = new Date(Date.now() + RETRY_INTERVAL_HOURS * 60 * 60 * 1000).toISOString();
        await supabase
          .from('publish_queue')
          .update({ status: 'failed', attempts: newAttempts, last_error: safety.reason, scheduled_at: reschedule, updated_at: new Date().toISOString() })
          .eq('id', item.id);

        result.failed++;
      }

      continue;
    }

    // Fetch platform token
    const { data: tokenRow } = await supabase
      .from('platform_tokens')
      .select('access_token, page_id, expires_at')
      .eq('client_id', item.client_id)
      .eq('platform', item.platform)
      .single();

    if (!tokenRow) {
      const errMsg = `Platform token not found for ${item.platform}`;
      await handleFailure(supabase, item, attemptNumber, errMsg, result);
      continue;
    }

    // Fetch post content
    const { data: postContent } = await supabase
      .from('calendar_post_content')
      .select('*')
      .eq('id', item.post_id)
      .single();

    if (!postContent) {
      const errMsg = `Post content not found for post_id ${item.post_id}`;
      await handleFailure(supabase, item, attemptNumber, errMsg, result);
      continue;
    }

    // Dispatch to platform adapter
    let publishResult: PublishResult;
    try {
      publishResult = await dispatchToAdapter(item.platform, tokenRow as PlatformToken, postContent as PostContent);
    } catch (err) {
      publishResult = { success: false, error: err instanceof Error ? err.message : 'Dispatch exception' };
    }

    // Log attempt
    await supabase.from('publish_attempt_log').insert({
      queue_id: item.id,
      client_id: item.client_id,
      platform: item.platform,
      attempt_number: attemptNumber,
      status: publishResult.success ? 'success' : 'failure',
      error_message: publishResult.error ?? null,
      response_data: { platform_post_id: publishResult.platform_post_id ?? null },
    });

    if (publishResult.success) {
      await supabase
        .from('publish_queue')
        .update({
          status: 'published',
          attempts: attemptNumber,
          published_at: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      console.log(JSON.stringify({
        event: 'publish_success',
        run_id: runId,
        queue_id: item.id,
        client_id: item.client_id,
        platform: item.platform,
        platform_post_id: publishResult.platform_post_id,
        attempt_number: attemptNumber,
      }));

      result.succeeded++;
    } else {
      await handleFailure(supabase, item, attemptNumber, publishResult.error ?? 'Unknown publish error', result);
    }
  }

  // Track cost for processing this batch (nominal cost — no AI tokens used)
  await trackPipelineCost({
    pipeline_name: 'publish_queue',
    client_id: null,
    run_id: runId,
    model: 'claude-sonnet-4-6',
    input_tokens: 0,
    output_tokens: 0,
    cost_usd: 0,
  });

  console.log(JSON.stringify({ event: 'publish_queue_batch_complete', run_id: runId, ...result }));

  return result;
}

async function handleFailure(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  item: QueueItem,
  attemptNumber: number,
  errMsg: string,
  result: ProcessQueueResult
): Promise<void> {
  // Log the failure attempt
  await supabase.from('publish_attempt_log').insert({
    queue_id: item.id,
    client_id: item.client_id,
    platform: item.platform,
    attempt_number: attemptNumber,
    status: 'failure',
    error_message: errMsg,
    response_data: null,
  });

  console.error(JSON.stringify({
    event: 'publish_failure',
    queue_id: item.id,
    client_id: item.client_id,
    platform: item.platform,
    attempt_number: attemptNumber,
    error: errMsg,
  }));

  if (attemptNumber >= MAX_ATTEMPTS) {
    await supabase
      .from('publish_queue')
      .update({ status: 'held', attempts: attemptNumber, last_error: errMsg, updated_at: new Date().toISOString() })
      .eq('id', item.id);

    await supabase.from('notifications').insert({
      client_id: item.client_id,
      type: 'publish_held',
      message: `Post held after ${MAX_ATTEMPTS} attempts. Last error: ${errMsg}`,
      metadata: { queue_id: item.id, platform: item.platform, post_id: item.post_id },
    });

    result.held++;
  } else {
    const reschedule = new Date(Date.now() + RETRY_INTERVAL_HOURS * 60 * 60 * 1000).toISOString();
    await supabase
      .from('publish_queue')
      .update({ status: 'failed', attempts: attemptNumber, last_error: errMsg, scheduled_at: reschedule, updated_at: new Date().toISOString() })
      .eq('id', item.id);

    result.failed++;
  }
}

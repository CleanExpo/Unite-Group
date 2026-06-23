// src/lib/command-centre/lanes/content-distribute.ts
// Gated: promotes generated_content rows → social_posts and marks task as distributed.

import { createServiceClient } from '@/lib/supabase/service'
import { getTaskById, mergeTaskMetadata, appendTaskEvent } from '@/lib/command-centre/tasks'
import type { SupabaseForContent } from './content-build'

// ── Dependency injection interface ────────────────────────────────────────────

export interface ContentDistributeDeps {
  getTaskById: typeof getTaskById
  mergeTaskMetadata: typeof mergeTaskMetadata
  appendTaskEvent: typeof appendTaskEvent
  supabase: SupabaseForContent
}

type ContentDistributeResult =
  | { status: 'distributed'; postsCreated: number }
  | { status: 'not_built' }

// ── Main orchestrator ─────────────────────────────────────────────────────────

export async function runContentDistribute(
  input: { founderId: string; taskId: string; scheduledAt?: string | null },
  deps?: Partial<ContentDistributeDeps>,
): Promise<ContentDistributeResult> {
  const { founderId, taskId, scheduledAt } = input

  const resolvedGetTaskById = deps?.getTaskById ?? getTaskById
  const resolvedMergeTaskMetadata = deps?.mergeTaskMetadata ?? mergeTaskMetadata
  const resolvedAppendTaskEvent = deps?.appendTaskEvent ?? appendTaskEvent
  const resolvedSupabase = (deps?.supabase ?? createServiceClient()) as SupabaseForContent

  // 1. Load task
  const task = await resolvedGetTaskById({ founderId, taskId })
  if (!task) throw new Error(`Task not found: ${taskId}`)

  // 2. Check for generated content ids
  const contentMeta = (task.metadata?.content ?? {}) as Record<string, unknown>
  const generatedContentIds = (contentMeta.generatedContentIds as string[] | undefined) ?? []
  if (generatedContentIds.length === 0) {
    return { status: 'not_built' }
  }

  // 3. Promote each generated_content row to a social_post
  let postsCreated = 0

  for (const contentId of generatedContentIds) {
    // Load the generated_content row
    const { data: content, error: fetchError } = await resolvedSupabase
      .from('generated_content')
      .select('*')
      .eq('id', contentId)
      .eq('founder_id', founderId)
      .single()

    if (fetchError || !content) continue // skip not-found rows gracefully

    const row = content as Record<string, unknown>

    // Build full post content with hashtags (mirrors promote route)
    let fullContent = row.body as string
    const hashtags = row.hashtags as string[] | null
    if (hashtags && hashtags.length > 0) {
      fullContent += '\n\n' + hashtags.map((h: string) => (h.startsWith('#') ? h : `#${h}`)).join(' ')
    }

    // Insert social post
    const { data: post, error: postError } = await resolvedSupabase
      .from('social_posts')
      .insert({
        founder_id: founderId,
        business_key: row.business_key,
        title: row.title,
        content: fullContent,
        media_urls: (row.media_urls as string[]) ?? [],
        platforms: [row.platform ?? 'facebook'],
        status: scheduledAt ? 'scheduled' : 'draft',
        scheduled_at: scheduledAt ?? null,
      })
      .select('id, status')
      .single()

    if (postError || !post) continue

    const postRow = post as { id: string; status: string }

    // Update generated_content → approved + social_post_id link
    await resolvedSupabase
      .from('generated_content')
      .update({ social_post_id: postRow.id, status: 'approved' })
      .eq('id', contentId)
      .eq('founder_id', founderId)

    postsCreated++
  }

  // 4. Merge task metadata — preserve existing content fields, update status
  await resolvedMergeTaskMetadata({
    founderId,
    taskId,
    patch: {
      content: {
        ...contentMeta,
        status: 'distributed',
        distributedAt: new Date().toISOString(),
      },
    },
  })

  // 5. Audit event
  await resolvedAppendTaskEvent({
    founderId,
    taskId,
    type: 'comment',
    actor: 'content-lane',
    payload: { action: 'distribute_complete', postsCreated },
  })

  return { status: 'distributed', postsCreated }
}

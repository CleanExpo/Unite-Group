// src/lib/command-centre/lanes/content-build.ts
// Orchestrates the content build step: brand load → AI generation → persist to cc_tasks.metadata.content

import { createServiceClient } from '@/lib/supabase/service'
import { getTaskById, mergeTaskMetadata, appendTaskEvent } from '@/lib/command-centre/tasks'
import { generateContent as _generateContent } from '@/lib/content/generator'
import { mapBrand } from '@/lib/content/brand-mapper'
import type { ContentType } from '@/lib/content/types'

// ── Supabase client shape used by this orchestrator ───────────────────────────

export interface SupabaseForContent {
  from(table: string): {
    select(col: string): {
      eq(col: string, val: unknown): {
        eq(col: string, val: unknown): {
          single(): Promise<{ data: unknown; error: { message: string } | null }>
        }
        single(): Promise<{ data: unknown; error: { message: string } | null }>
      }
    }
    insert(row: unknown): {
      select(col: string): {
        single(): Promise<{ data: unknown; error: { message: string } | null }>
      }
    }
    update(val: unknown): {
      eq(col: string, val: unknown): {
        eq(col: string, val: unknown): Promise<{ data: unknown; error: { message: string } | null }>
        single(): Promise<{ data: unknown; error: { message: string } | null }>
      }
    }
  }
}

// ── Dependency injection interface ────────────────────────────────────────────

export interface ContentBuildDeps {
  getTaskById: typeof getTaskById
  mergeTaskMetadata: typeof mergeTaskMetadata
  appendTaskEvent: typeof appendTaskEvent
  generateContent: typeof _generateContent
  supabase: SupabaseForContent
}

type ContentBuildResult =
  | { status: 'built'; count: number; ids: string[] }
  | { status: 'not_connected'; reason: string }

// ── Main orchestrator ─────────────────────────────────────────────────────────

export async function runContentBuild(
  input: { founderId: string; taskId: string },
  deps?: Partial<ContentBuildDeps>,
): Promise<ContentBuildResult> {
  const { founderId, taskId } = input

  const resolvedGetTaskById = deps?.getTaskById ?? getTaskById
  const resolvedMergeTaskMetadata = deps?.mergeTaskMetadata ?? mergeTaskMetadata
  const resolvedAppendTaskEvent = deps?.appendTaskEvent ?? appendTaskEvent
  const resolvedGenerateContent = deps?.generateContent ?? _generateContent
  const resolvedSupabase = (deps?.supabase ?? createServiceClient()) as SupabaseForContent

  // 1. Load task
  const task = await resolvedGetTaskById({ founderId, taskId })
  if (!task) throw new Error(`Task not found: ${taskId}`)

  // 2. Derive routing params from task metadata
  const routing = (task.metadata?.routing ?? {}) as Record<string, unknown>
  const businessKey = (routing.businessKey as string | undefined) ?? null
  const contentType: ContentType = (routing.contentType as ContentType | undefined) ?? 'social_post'
  const topic = task.objective

  // 3. Load brand identity (founder-scoped; optionally also business_key-scoped)
  let brandData: unknown
  if (businessKey) {
    const { data, error } = await resolvedSupabase
      .from('brand_identities')
      .select('*')
      .eq('founder_id', founderId)
      .eq('business_key', businessKey)
      .single()
    if (error || !data) {
      return { status: 'not_connected', reason: 'No brand identity found. Connect a brand in Settings.' }
    }
    brandData = data
  } else {
    const { data, error } = await resolvedSupabase
      .from('brand_identities')
      .select('*')
      .eq('founder_id', founderId)
      .single()
    if (error || !data) {
      return { status: 'not_connected', reason: 'No brand identity found. Connect a brand in Settings.' }
    }
    brandData = data
  }

  const brandIdentity = mapBrand(brandData as Record<string, unknown>)

  // 4. Generate content (throws on AI failure — surfaces to caller)
  const results = await resolvedGenerateContent(
    { businessKey: brandIdentity.businessKey, contentType, topic, count: 3 },
    brandIdentity,
  )

  // 5. Insert each result into generated_content
  const generatedContentIds: string[] = []
  for (const result of results) {
    const { data: row, error: insertError } = await resolvedSupabase
      .from('generated_content')
      .insert({
        founder_id: founderId,
        business_key: brandIdentity.businessKey,
        content_type: contentType,
        platform: result.platform,
        title: result.title,
        body: result.body,
        media_prompt: result.mediaPrompt,
        hashtags: result.hashtags,
        cta: result.cta,
        character_used: result.characterUsed,
        ai_model: 'claude-sonnet-4-5-20250929',
        generation_source: 'manual_request',
        status: 'generated',
      })
      .select('id')
      .single()

    if (!insertError && row) {
      generatedContentIds.push((row as { id: string }).id)
    }
  }

  const count = generatedContentIds.length

  // 6. Persist to task metadata
  await resolvedMergeTaskMetadata({
    founderId,
    taskId,
    patch: {
      content: {
        generatedContentIds,
        status: 'built',
        count,
        builtAt: new Date().toISOString(),
      },
    },
  })

  // 7. Append audit event
  await resolvedAppendTaskEvent({
    founderId,
    taskId,
    type: 'comment',
    actor: 'content-lane',
    payload: { action: 'build_complete', count },
  })

  return { status: 'built', count, ids: generatedContentIds }
}

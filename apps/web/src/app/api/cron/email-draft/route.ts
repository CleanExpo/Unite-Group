// src/app/api/cron/email-draft/route.ts
// GET /api/cron/email-draft
// Slice 2 (UNI-2153) — per-account auto-DRAFTING for the Margot email
// copywriter agent. Runs ~30 min after email-triage so triage results exist.
//
// DOUBLE GATE, dark by default:
//   1. global: MARGOT_DRAFTS_ENABLED === 'true' (prod env flip — the FOUNDER's
//      action, not ours). Otherwise this returns { dormant: true } immediately,
//      before any account loop or LLM call.
//   2. per-account: email_account_voice.agent_enabled must be true.
// For each gated account it pre-writes reply drafts for threads triage flagged
// FLAG_REVIEW (needs a personal reply), stores them `awaiting_approval`, and
// NEVER sends — the approval gate is the only send path. Idempotent: skips a
// thread that already has a draft. Per-account try/catch so one bad account
// doesn't kill the run. Mirrors the email-triage cron's auth + account loop.

import { NextResponse } from 'next/server'

import { assertCronAuth } from '@/lib/cron-auth'
import { createServiceClient } from '@/lib/supabase/service'
import { getConnectedGoogleAccounts, fetchFullThread } from '@/lib/integrations/google'
import { getAccountVoice, getAccountAgentEnabled } from '@/lib/margot/account-voice'
import { generateFounderDraft } from '@/lib/margot/draft-reply'
import { createAnthropicComplete } from '@/lib/margot/providers'
import { createMargotDraftStore } from '@/lib/margot/draft-store'
import type { IncomingEmail } from '@/lib/margot/draft-reply-prompt'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// The triage action that means "a personal reply is needed". The triage enum is
// KEEP | ARCHIVE | CREATE_TASK | FLAG_REVIEW (lib/ai/capabilities/email-triage.ts)
// — there is no REPLY/RESPOND value; FLAG_REVIEW is the founder-attention signal,
// whereas CREATE_TASK becomes a Linear ticket. Draft ONLY for FLAG_REVIEW.
const REPLY_NEEDED_ACTION = 'FLAG_REVIEW'

// Per-account cap per run — bounds the LLM spend and runtime on any one account.
const MAX_DRAFTS_PER_ACCOUNT = 20

export async function GET(request: Request) {
  const startTime = Date.now()

  // Refuse to run without a configured secret — otherwise `Bearer undefined`
  // would match the header and bypass auth on a cron that spends on the LLM and
  // writes drafts. (Guards the unset/empty CRON_SECRET case explicitly.)
  const denied = assertCronAuth(request)
  if (denied) return denied

  // GATE 1 (global): dark unless the founder has flipped the prod env flag.
  // Return BEFORE the account loop — no Gmail read, no LLM call, no draft.
  if (process.env.MARGOT_DRAFTS_ENABLED !== 'true') {
    return NextResponse.json({
      dormant: true,
      message: 'MARGOT_DRAFTS_ENABLED is not true — email auto-drafting is dormant',
    })
  }

  const founderId = process.env.FOUNDER_USER_ID
  if (!founderId) {
    return NextResponse.json({ error: 'FOUNDER_USER_ID not configured' }, { status: 500 })
  }

  const supabase = createServiceClient()
  const accounts = await getConnectedGoogleAccounts(founderId)
  const complete = createAnthropicComplete()
  const store = createMargotDraftStore()

  let totalDrafted = 0
  let totalSkipped = 0
  let accountErrors = 0
  const accountSummaries: string[] = []

  for (const account of accounts) {
    try {
      // GATE 2 (per-account): only accounts the founder has turned on.
      const enabled = await getAccountAgentEnabled(founderId, account.email)
      if (!enabled) {
        accountSummaries.push(`${account.email}: agent off`)
        continue
      }

      // Threads triage flagged as needing a personal reply.
      const { data: flagged, error: flaggedErr } = await supabase
        .from('email_triage_results')
        .select('thread_id, subject, from_email')
        .eq('founder_id', founderId)
        .eq('account_email', account.email)
        .eq('action', REPLY_NEEDED_ACTION)
      if (flaggedErr) {
        throw new Error(`email_triage_results select failed: ${flaggedErr.message}`)
      }

      const flaggedThreads = flagged ?? []
      if (flaggedThreads.length === 0) {
        accountSummaries.push(`${account.email}: 0 drafted, 0 skipped`)
        continue
      }

      // Idempotency: skip any thread that already has a draft for this account.
      const { data: existing, error: existingErr } = await supabase
        .from('margot_email_draft')
        .select('thread_id')
        .eq('founder_id', founderId)
        .eq('account_email', account.email)
      if (existingErr) {
        throw new Error(`margot_email_draft select failed: ${existingErr.message}`)
      }
      const alreadyDrafted = new Set(
        (existing ?? []).map((r: { thread_id: string | null }) => r.thread_id),
      )

      const pending = flaggedThreads.filter(
        (t: { thread_id: string }) => !alreadyDrafted.has(t.thread_id),
      )
      const skipped = flaggedThreads.length - pending.length
      const toDraft = pending.slice(0, MAX_DRAFTS_PER_ACCOUNT)

      const voice = await getAccountVoice(founderId, account.email)

      let drafted = 0
      for (const t of toDraft) {
        // Full thread → the message to reply to (most recent in the thread).
        const thread = await fetchFullThread(founderId, account.email, t.thread_id)
        const last = thread.messages[thread.messages.length - 1]
        if (!last) continue

        const incoming: IncomingEmail = {
          from: last.from,
          subject: thread.subject,
          body: last.bodyText ?? last.bodyHtml ?? '',
          businessName: account.businessKey,
        }

        const body = await generateFounderDraft(incoming, voice, complete)

        // Store awaiting_approval. NEVER send — no send path is imported here.
        await store.createDraft({
          founderId,
          businessKey: account.businessKey,
          accountEmail: account.email,
          sourceMessageId: last.id,
          threadId: t.thread_id,
          toAddress: last.from,
          subject: thread.subject,
          body,
          voiceMeta: { voiceName: voice.name, source: 'email-draft-cron' },
        })
        drafted++
      }

      totalDrafted += drafted
      totalSkipped += skipped
      accountSummaries.push(`${account.email}: ${drafted} drafted, ${skipped} skipped`)
    } catch (err) {
      accountErrors++
      console.error(`[Email Draft CRON] Failed for ${account.email}:`, err)
      accountSummaries.push(
        `${account.email}: ERROR — ${err instanceof Error ? err.message : 'unknown'}`,
      )
    }
  }

  const durationMs = Date.now() - startTime

  return NextResponse.json({
    success: accountErrors === 0,
    accounts: accounts.length,
    accountErrors,
    totalDrafted,
    totalSkipped,
    durationMs,
    accountSummaries,
  })
}

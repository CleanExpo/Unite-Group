/**
 * Real provider adapters for the tested Margot orchestration (WS2 P2, dormant
 * edges). The LLM completion (Anthropic) and the transmit (gmail `sendReply`)
 * that the pure orchestration injects. Inert until the routes are enabled.
 */

import Anthropic from '@anthropic-ai/sdk';

import { ANTHROPIC_MODELS } from '@/lib/anthropic/models';
import { sendReply } from '@/lib/integrations/gmail';

import type { LlmComplete } from './draft-reply';
import type { Draft } from './approval-gate';
import type { StoredDraft } from './draft-store';

/** Anthropic-backed founder-voice completion. */
export function createAnthropicComplete(): LlmComplete {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return async (system, user) => {
    const res = await client.messages.create({
      model: ANTHROPIC_MODELS.SONNET,
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: user }],
    });
    return res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim();
  };
}

/**
 * Transmit an approved draft via gmail `sendReply`, from the draft's mailbox.
 * Called ONLY through the approval gate (send-on-approval.ts).
 */
export async function sendStoredDraft(
  stored: StoredDraft,
  draft: Draft
): Promise<void> {
  if (!stored.accountEmail || !stored.threadId || !stored.toAddress) {
    throw new Error(
      'sendStoredDraft: draft is missing accountEmail / threadId / toAddress'
    );
  }
  await sendReply(stored.founderId, stored.accountEmail, stored.threadId, {
    to: stored.toAddress,
    subject: stored.subject ?? '',
    body: draft.body,
    inReplyToMessageId: stored.sourceMessageId ?? undefined,
  });
}

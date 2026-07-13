/**
 * Founder-voice draft generator (WS2 P2). Composes the founder-voice prompt with
 * an INJECTED LLM call, so the orchestration is unit-tested and the provider
 * (Anthropic, via ANTHROPIC_API_KEY) is the caller's edge. Produces a draft body
 * only — never sends; the draft still goes through the approval gate.
 */

import {
  buildFounderReplySystemPrompt,
  buildFounderReplyUserMessage,
  type FounderVoice,
  type IncomingEmail,
} from './draft-reply-prompt';

/** Injected LLM completion: (system, user) → assistant text. */
export type LlmComplete = (system: string, user: string) => Promise<string>;

export async function generateFounderDraft(
  email: IncomingEmail,
  voice: FounderVoice,
  complete: LlmComplete
): Promise<string> {
  const system = buildFounderReplySystemPrompt(voice);
  const user = buildFounderReplyUserMessage(email);
  const body = (await complete(system, user)).trim();
  if (!body) {
    throw new Error('generateFounderDraft: model returned an empty draft');
  }
  return body;
}

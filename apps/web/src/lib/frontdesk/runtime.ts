import Anthropic from '@anthropic-ai/sdk';
import { chunkCorpus } from '../aiw/corpus';
import { retrieveContext } from './retrieve';
import { buildSystemPrompt } from './prompt';
import type { FrontDeskConfig } from './config';

/** Chat model for the front desk. Sonnet 5 — capable + cost-appropriate for reception. */
const MODEL = 'claude-sonnet-5';
const MAX_TOKENS = 1024;

/**
 * Build the (deterministic) Anthropic request for a visitor message, grounded in the
 * brand's corpus. Pure — no network, no key — so the assembly logic is unit-testable.
 */
export function prepareFrontDeskRequest(config: FrontDeskConfig, corpusText: string, userMessage: string) {
  const context = retrieveContext(userMessage, chunkCorpus(corpusText));
  return {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: buildSystemPrompt(config, context),
    messages: [{ role: 'user' as const, content: userMessage }],
  };
}

/**
 * Answer a visitor message. Reuses the app's existing `@anthropic-ai/sdk` (no new
 * provider dependency). The client reads `ANTHROPIC_API_KEY` at call time, so importing
 * this module does not require the key.
 */
export async function answerFrontDesk(
  config: FrontDeskConfig,
  corpusText: string,
  userMessage: string,
): Promise<string> {
  const request = prepareFrontDeskRequest(config, corpusText, userMessage);
  const client = new Anthropic();
  const response = await client.messages.create(request);
  return response.content.map((block) => (block.type === 'text' ? block.text : '')).join('');
}

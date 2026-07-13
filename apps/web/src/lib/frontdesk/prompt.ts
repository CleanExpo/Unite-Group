import type { FrontDeskConfig } from './config';
import type { CorpusChunk } from '../aiw/corpus';

/**
 * Assemble the agent's system prompt from its config + retrieved grounding context.
 * Enforces the AU compliance rule that the agent must disclose it is an AI (when
 * `compliance.aiDisclosure`), and constrains answers to the provided context so the
 * agent does not fabricate about the business.
 */
export function buildSystemPrompt(config: FrontDeskConfig, context: CorpusChunk[]): string {
  const lines: string[] = [
    `You are ${config.brand.assistantName}, an assistant for ${config.compliance.businessIdentity}.`,
  ];

  if (config.compliance.aiDisclosure) {
    lines.push('At the start of the conversation, disclose that you are an AI assistant, and offer a human handoff if asked.');
  }

  lines.push(
    'Answer only using the CONTEXT below. If the answer is not in it, say so plainly and offer to take the visitor\'s name and contact details.',
    '',
    'CONTEXT:',
    context.length > 0 ? context.map((c) => `- ${c.text}`).join('\n') : '(no matching context found)',
  );

  return lines.join('\n');
}

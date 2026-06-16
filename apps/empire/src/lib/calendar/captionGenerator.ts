/**
 * SYN-521: Caption Generator
 * Calls Claude haiku to generate 3 caption variations for a calendar slot.
 * ~$0.002 per client per week (500 input + 800 output tokens × 7 posts).
 */
import type { ClientContext, ContentType, Platform } from './types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

interface AnthropicResponse {
  content: Array<{ type: string; text: string }>;
  usage: { input_tokens: number; output_tokens: number };
}

async function callClaude(prompt: string): Promise<AnthropicResponse> {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
  return res.json() as Promise<AnthropicResponse>;
}

export interface CaptionResult {
  captions: [string, string, string];
  input_tokens: number;
  output_tokens: number;
}

export async function generateCaptions(
  slot: { content_type: ContentType; platform: Platform; hashtag_set: string[]; topic_hint: string },
  clientContext: ClientContext
): Promise<CaptionResult> {
  const hashtagStr = slot.hashtag_set.slice(0, 8).join(' ');
  const prompt = `You are a social media copywriter for "${clientContext.business_name}", an Australian ${clientContext.industry} business with a ${clientContext.brand_voice} brand voice.

Write 3 variations of a ${slot.content_type} post caption for ${slot.platform}. Topic: ${slot.topic_hint}.

Requirements:
- Each caption: 1-3 sentences, AU English, engaging and specific
- Variation 1: Direct and informative
- Variation 2: Question-led or curiosity hook
- Variation 3: Story-led or relatable

Hashtags to include: ${hashtagStr || '(none specified)'}

Respond with valid JSON only:
{"captions": ["caption 1 here", "caption 2 here", "caption 3 here"]}`;

  try {
    const response = await callClaude(prompt);
    const raw = response.content[0]?.type === 'text' ? response.content[0].text : '{}';
    const parsed = JSON.parse(raw) as { captions: string[] };
    const caps = parsed.captions ?? [];
    return {
      captions: [caps[0] ?? fallback(slot, 0), caps[1] ?? fallback(slot, 1), caps[2] ?? fallback(slot, 2)],
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    };
  } catch {
    return {
      captions: [fallback(slot, 0), fallback(slot, 1), fallback(slot, 2)],
      input_tokens: 0,
      output_tokens: 0,
    };
  }
}

function fallback(slot: { content_type: string; platform: string }, idx: number): string {
  const fallbacks = [
    `Sharing our latest ${slot.content_type} insights — follow for more.`,
    `What do you think about our approach to ${slot.content_type}? Let us know below.`,
    `Every week we bring you the best ${slot.content_type} content. This is one of our favourites.`,
  ];
  return fallbacks[idx];
}

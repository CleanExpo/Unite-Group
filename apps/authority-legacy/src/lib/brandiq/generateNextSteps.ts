/**
 * SYN-527: Brand IQ Next Steps Generator
 * Calls Claude haiku to generate 3 specific, actionable next steps based on client brand profile.
 * Tracks cost via trackPipelineCost() (SYN-518 integration point).
 */

// Uses Anthropic Messages API via fetch (install @anthropic-ai/sdk for typed client if preferred)
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

interface AnthropicResponse {
  content: Array<{ type: string; text: string }>;
  usage: { input_tokens: number; output_tokens: number };
}

async function callClaude(model: string, maxTokens: number, messages: Array<{ role: string; content: string }>): Promise<AnthropicResponse> {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages }),
  });
  if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
  return res.json() as Promise<AnthropicResponse>;
}

export interface BrandProfile {
  client_id: string;
  business_name: string;
  industry: string;
  brand_voice_score: number; // 0-100
  top_content_attributes: string[]; // e.g. ["educational", "short-form", "morning posts"]
  best_posting_window: string; // e.g. "Tuesday-Thursday 7am-9am AEST"
  audience_resonance_score: number; // 0-100
  weak_signals: string[]; // e.g. ["low video engagement", "inconsistent posting frequency"]
}

export interface NextStep {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimated_impact: string; // e.g. "Could improve reach by 20-30%"
}

export interface GenerateNextStepsResult {
  next_steps: NextStep[];
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
}

// Claude model pricing (haiku-4-5)
const HAIKU_INPUT_COST_PER_1M = 0.25;
const HAIKU_OUTPUT_COST_PER_1M = 1.25;

export async function generateNextSteps(profile: BrandProfile): Promise<GenerateNextStepsResult> {
  const prompt = `You are a social media strategist for an Australian business called "${profile.business_name}" in the ${profile.industry} industry.

Based on their brand performance data:
- Brand Voice Consistency: ${profile.brand_voice_score}/100
- Top performing content attributes: ${profile.top_content_attributes.join(', ')}
- Best posting window: ${profile.best_posting_window}
- Audience Resonance Score: ${profile.audience_resonance_score}/100
- Areas needing improvement: ${profile.weak_signals.join(', ')}

Generate exactly 3 specific, actionable next steps to improve their Brand IQ score. Be concrete and AU-market specific.

Respond with valid JSON only in this format:
{
  "next_steps": [
    {
      "title": "Short action title (max 8 words)",
      "description": "Specific action they can take this week (1-2 sentences)",
      "priority": "high|medium|low",
      "estimated_impact": "Brief impact statement"
    }
  ]
}`;

  const message = await callClaude(
    'claude-haiku-4-5-20251001',
    400,
    [{ role: 'user', content: prompt }]
  );

  const inputTokens = message.usage.input_tokens;
  const outputTokens = message.usage.output_tokens;
  const costUsd =
    (inputTokens / 1_000_000) * HAIKU_INPUT_COST_PER_1M +
    (outputTokens / 1_000_000) * HAIKU_OUTPUT_COST_PER_1M;

  // Track pipeline cost (SYN-518)
  try {
    const { trackPipelineCost } = await import('@/lib/pipelines/track-cost');
    await trackPipelineCost({
      pipeline_name: 'brand-iq-next-steps',
      client_id: profile.client_id,
      run_id: `brandiq-${profile.client_id}-${Date.now()}`,
      model: 'claude-haiku-4-5-20251001',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: costUsd,
    });
  } catch {
    // Non-fatal: cost tracking failure doesn't block next steps generation
    console.error(JSON.stringify({ event: 'brandiq_cost_track_failed', client_id: profile.client_id }));
  }

  const rawContent = message.content[0].type === 'text' ? message.content[0].text : '{}';

  let parsed: { next_steps: NextStep[] };
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    // Fallback if model returns malformed JSON
    parsed = {
      next_steps: [
        {
          title: 'Post consistently in your best window',
          description: `Schedule 3 posts per week during ${profile.best_posting_window} to maximise audience reach.`,
          priority: 'high',
          estimated_impact: 'Could improve reach by 20-35%',
        },
        {
          title: 'Double down on your top content type',
          description: `Your audience responds best to ${profile.top_content_attributes[0] ?? 'educational'} content. Create 2 more pieces this week.`,
          priority: 'medium',
          estimated_impact: 'Could improve engagement rate by 15-25%',
        },
        {
          title: 'Address your weakest signal',
          description: `Focus on improving ${profile.weak_signals[0] ?? 'posting consistency'} — this is holding back your Brand IQ score.`,
          priority: 'low',
          estimated_impact: 'Incremental Brand IQ improvement',
        },
      ],
    };
  }

  return {
    next_steps: parsed.next_steps ?? [],
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost_usd: costUsd,
  };
}

import { trackPipelineCost } from '@/lib/pipelines/track-cost';

export async function generateEeatAction(
  client_id: string,
  breakdown: Record<string, number>,
  current_score: number
): Promise<string> {
  // Find lowest-scoring component
  const lowestComponent = Object.entries(breakdown).sort(([, a], [, b]) => a - b)[0];

  if (!lowestComponent) {
    return 'Complete your Google Business Profile to boost your Authority Score.';
  }

  const [componentName, componentScore] = lowestComponent;

  const prompt = `You are an SEO advisor for a local business. Their Authority Score is ${current_score}/100.
Their weakest area is "${componentName}" scoring ${componentScore} points.
Write exactly 1 sentence of specific, actionable advice to improve this component.
Be specific about what to do (e.g., "Add your business hours to Google Business Profile") — not generic (e.g., "Post more content").
Include the approximate point value if you know it. No preamble, just the sentence.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await res.json();
  const action = data?.content?.[0]?.text?.trim() ?? `Improve your ${componentName} to boost your Authority Score.`;

  // Track cost
  const inputTokens = data?.usage?.input_tokens ?? 0;
  const outputTokens = data?.usage?.output_tokens ?? 0;
  const run_id = `eeat_action_${client_id}_${Date.now()}`;

  await trackPipelineCost({
    pipeline_name: 'eeat_action_generation',
    client_id,
    run_id,
    model: 'claude-haiku-4-5-20251001',
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost_usd: (inputTokens * 0.00000025) + (outputTokens * 0.00000125),
  });

  return action;
}

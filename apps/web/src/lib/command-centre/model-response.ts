/** Strict preparation accepts one complete JSON object, never prose or partial output. */
export interface PreparationModelResponse {
  content: Array<{ type: string; text?: string }>
  stop_reason?: string | null
}

export const PREPARATION_RESPONSE_REASONS = [
  'empty_text', 'invalid_json', 'invalid_shape', 'invalid_values', 'incomplete_response', 'refused_response',
] as const
export type PreparationResponseReason = typeof PREPARATION_RESPONSE_REASONS[number]

/** Carries only a fixed reason; never retains provider text, prompts or causes. */
export class PreparationResponseError extends SyntaxError {
  constructor(readonly reason: PreparationResponseReason) {
    super('The preparation response did not satisfy its output contract')
    this.name = 'PreparationResponseError'
  }
}

export function readPreparationObject(response: PreparationModelResponse, requiredKeys: readonly string[]): Record<string, unknown> {
  if (response.stop_reason === 'refusal') throw new PreparationResponseError('refused_response')
  if (response.stop_reason !== 'end_turn') throw new PreparationResponseError('incomplete_response')
  const text = response.content.filter((block) => block.type === 'text').map((block) => {
    if (typeof block.text !== 'string') throw new PreparationResponseError('empty_text')
    return block.text
  }).join('\n')
  if (!text.trim()) throw new PreparationResponseError('empty_text')
  let parsed: unknown
  try { parsed = JSON.parse(text) } catch { throw new PreparationResponseError('invalid_json') }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
    Object.keys(parsed).some((key) => !requiredKeys.includes(key)) ||
    requiredKeys.some((key) => !Object.hasOwn(parsed, key))) {
    throw new PreparationResponseError('invalid_shape')
  }
  return parsed as Record<string, unknown>
}

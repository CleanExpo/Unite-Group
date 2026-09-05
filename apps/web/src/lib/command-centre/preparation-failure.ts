import { AIConfigurationError } from '@/lib/ai/client'

export type PreparationStep = 'context' | 'classification' | 'clarification' | 'specification' | 'board'

/** Never retain original exceptions, messages, headers, prompts or model output. */
export class PreparationFailure extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly diagnostic: { stage: PreparationStep; errorName: string; status?: number; requestId?: string },
  ) {
    super(message)
    this.name = 'PreparationFailure'
  }
}

const ERROR_NAMES = new Set(['Error', 'SyntaxError', 'AuthenticationError', 'PermissionDeniedError', 'RateLimitError', 'APIError', 'APIConnectionError', 'APIConnectionTimeoutError', 'NotFoundError', 'BadRequestError', 'InternalServerError'])

export function preparationFailure(error: unknown, stage: PreparationStep): PreparationFailure {
  if (error instanceof PreparationFailure) return error
  const source = error && typeof error === 'object' ? error as Record<string, unknown> : {}
  const diagnostic: PreparationFailure['diagnostic'] = {
    stage,
    errorName: error instanceof AIConfigurationError ? 'AIConfigurationError'
      : typeof source.name === 'string' && ERROR_NAMES.has(source.name) ? source.name : 'Error',
  }
  if (typeof source.status === 'number' && Number.isInteger(source.status) && source.status >= 400 && source.status <= 599) diagnostic.status = source.status
  if (typeof source.request_id === 'string' && /^req_[A-Za-z0-9]{16,64}$/.test(source.request_id)) diagnostic.requestId = source.request_id
  if (stage !== 'context' && [401, 403].includes(diagnostic.status ?? 0)) return new PreparationFailure(
    'preparation_provider_authentication',
    'Margot’s AI connection needs attention from your delivery operator. Your idea and saved progress remain available. Continue preparation after the connection is repaired.', diagnostic,
  )
  if (stage !== 'context' && diagnostic.status === 429) return new PreparationFailure(
    'preparation_provider_rate_limited',
    'Margot’s AI provider has temporarily limited requests. Your idea and saved progress remain available; wait a little, then continue preparation.', diagnostic,
  )
  if (stage !== 'context' && (error instanceof AIConfigurationError || [400, 404].includes(diagnostic.status ?? 0))) return new PreparationFailure(
    'preparation_provider_configuration',
    error instanceof AIConfigurationError
      ? 'Margot’s AI connection needs configuration by your delivery operator. Your idea and saved progress remain available. Continue preparation after the connection is repaired.'
      : 'Margot’s AI request could not be accepted. Your delivery operator needs to check the model connection. Your idea and saved progress remain available.', diagnostic,
  )
  if (error instanceof SyntaxError) return new PreparationFailure(
    'preparation_response_invalid',
    'Margot did not return a usable preparation response. Your idea and saved progress remain available; continue preparation to retry.', diagnostic,
  )
  return new PreparationFailure('preparation_unavailable',
    'Margot could not finish this preparation step. Your idea and saved progress remain available; resume to retry.', diagnostic)
}

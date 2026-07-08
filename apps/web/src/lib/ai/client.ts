// src/lib/ai/client.ts
// Singleton Anthropic client for the centralised AI service layer.
// All AI calls should go through this client to avoid duplicate instantiation.
//
// Auth modes (in priority order):
//   1. Max-plan OAuth — CLAUDE_CODE_OAUTH_TOKEN (a long-lived token from
//      `claude setup-token`). Authenticates against the founder's Claude Max
//      subscription instead of pay-as-you-go API credits. This is the same
//      token the autopilot runner uses (apps/autopilot-runner). When present we
//      send it as a Bearer `authToken` (NOT `x-api-key`) plus the
//      `anthropic-beta: oauth-2025-04-20` header — the contract proven in-repo
//      by apps/workspace/src/server/provider-usage.ts. OAuth tokens on
//      /v1/messages also require the system prompt to identify as Claude Code,
//      so we prepend that identity block on every message in this mode.
//   2. API key — ANTHROPIC_API_KEY (x-api-key, billed against credits).
//
// Falling back keeps every AI feature working whether or not the OAuth token is
// configured on the deployment.

import Anthropic from '@anthropic-ai/sdk'

let _instance: Anthropic | null = null
let _mode: 'oauth' | 'apikey' | null = null

/** Beta header required for Claude Code OAuth tokens on the Anthropic API. */
const OAUTH_BETA_HEADER = 'oauth-2025-04-20'

/**
 * Required identity for OAuth (Max-plan) requests against /v1/messages. Claude
 * Code OAuth tokens are rejected unless the request identifies as Claude Code,
 * so this is prepended as the first system block in OAuth mode only.
 */
const CLAUDE_CODE_IDENTITY =
  "You are Claude Code, Anthropic's official CLI for Claude."

function readOAuthToken(): string | null {
  const t =
    process.env.CLAUDE_CODE_OAUTH_TOKEN?.trim() ||
    process.env.ANTHROPIC_AUTH_TOKEN?.trim()
  return t && t.length > 0 ? t : null
}

/** Prepend the Claude Code identity to a system prompt (string or block array). */
function withClaudeCodeIdentity(
  system: Anthropic.MessageCreateParams['system'],
): Anthropic.MessageCreateParams['system'] {
  if (system == null || system === '') return CLAUDE_CODE_IDENTITY
  if (typeof system === 'string') return `${CLAUDE_CODE_IDENTITY}\n\n${system}`
  // Block array — prepend an identity text block.
  return [{ type: 'text', text: CLAUDE_CODE_IDENTITY }, ...system]
}

/**
 * Returns a singleton Anthropic client instance.
 *
 * Prefers the Max-plan OAuth token (CLAUDE_CODE_OAUTH_TOKEN) and falls back to
 * ANTHROPIC_API_KEY. In OAuth mode the returned client transparently injects the
 * required `anthropic-beta` header and Claude Code system identity on every
 * `messages.create` call, so existing call sites need no changes.
 *
 * Throws if neither credential is configured.
 */
export function getAIClient(): Anthropic {
  if (_instance) return _instance

  const oauthToken = readOAuthToken()
  if (oauthToken) {
    _mode = 'oauth'
    const client = new Anthropic({
      // UNI-2344: retry policy lives in ai/router createWithRetry — SDK default
      // maxRetries=2 would stack multiplicatively under it (4×3 HTTP calls).
      maxRetries: 0,
      authToken: oauthToken,
      // Force OAuth-only: the SDK defaults apiKey to process.env.ANTHROPIC_API_KEY,
      // which (if set) would make it send BOTH x-api-key AND Authorization headers
      // — and the API would then bill the API key (credits) instead of the Max
      // plan. Passing null suppresses the x-api-key header entirely.
      apiKey: null,
      defaultHeaders: { 'anthropic-beta': OAUTH_BETA_HEADER },
    })

    // Wrap messages.create to inject the Claude Code identity (required for
    // OAuth tokens). Contained here so no call site needs to know the auth mode.
    const origCreate = client.messages.create.bind(client.messages) as (
      ...args: unknown[]
    ) => unknown
    client.messages.create = ((
      body: Anthropic.MessageCreateParams,
      ...rest: unknown[]
    ) =>
      origCreate(
        { ...body, system: withClaudeCodeIdentity(body.system) },
        ...rest,
      )) as typeof client.messages.create

    _instance = client
    return _instance
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error(
      'No Claude credentials configured. Set CLAUDE_CODE_OAUTH_TOKEN (Max plan) ' +
        'or ANTHROPIC_API_KEY in your environment variables.',
    )
  }
  _mode = 'apikey'
  _instance = new Anthropic({
    apiKey,
    // UNI-2344: retry policy lives in ai/router createWithRetry — SDK default
    // maxRetries=2 would stack multiplicatively under it (4×3 HTTP calls).
    maxRetries: 0,
  })
  return _instance
}

/** Which auth mode the live client is using ('oauth' | 'apikey'), or null pre-init. */
export function getAIClientMode(): 'oauth' | 'apikey' | null {
  return _mode
}

/** Reset the singleton — used in tests to ensure isolation. */
export function resetAIClient(): void {
  _instance = null
  _mode = null
}

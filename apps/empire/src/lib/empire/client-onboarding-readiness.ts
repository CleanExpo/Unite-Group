// UNI-2148 — server-side readiness computation for the client onboarding
// packet. Reads PRESENCE of env vars + existing nexus_clients columns and
// returns presence BOOLEANS only. Never copies a secret, token, or env VALUE
// into the result — only `typeof x === 'string' && x.length > 0` checks. The
// route passes `process.env` in so the pure fn stays unit-testable (env
// injected, no direct process.env inside).
//
// No new columns are introduced (UNI-2148 constraint: derive from existing
// columns only). nexus_clients today carries `linear_project_id`,
// `brand_config`, `portal_content` and the core identity fields — the
// provider-link columns (github_repo, vercel_project, …) live on the separate
// `businesses` table, not here. So provider link signals are honestly `false`
// for a nexus_clients-keyed onboarding row unless a real column proves
// otherwise. The row shape below tolerates absent columns (all optional) so a
// brand-new row computes cleanly without a schema change.

import type { ClientReadinessSignals } from './client-launch-packet';

/**
 * The subset of nexus_clients columns onboarding readiness derives from. All
 * optional/nullable so a minimal `select('*')` row — or a brand-new row with
 * most fields unset — computes without throwing. No new columns are added.
 */
export interface ClientReadinessRow {
  slug: string;
  /** Linked Linear project on nexus_clients (the real column today). */
  linear_project_id?: string | null;
  /** Brand config JSONB — non-empty once the wizard has configured branding. */
  brand_config?: Record<string, unknown> | null;
  /** Portal content JSONB — non-empty once the portal copy is drafted. */
  portal_content?: Record<string, unknown> | null;
}

/** Env var presence — value never read, only checked for a non-empty string. */
type EnvLike = Record<string, string | undefined>;

function present(value: unknown): boolean {
  return typeof value === 'string' && value.length > 0;
}

function hasKeys(value: unknown): boolean {
  return !!value && typeof value === 'object' && Object.keys(value as object).length > 0;
}

/**
 * Compute presence-only readiness signals for the onboarding packet.
 *
 * Pure-ish: `env` is injected (pass `process.env` from the route) so the
 * function has no hidden dependency on the ambient environment and stays
 * trivially unit-testable. The output carries booleans ONLY — no secret,
 * token, env value, or provider secret-name crosses this boundary.
 *
 * Env-derived signals (telegram bot token, linear api key) reflect whether the
 * platform credential exists. Client-link signals reflect whether THIS client
 * row has the dependency wired up. Provider columns that do not exist on
 * nexus_clients today resolve to `false` honestly — never fabricated.
 */
export function computeClientReadinessSignals(
  client: ClientReadinessRow,
  env: EnvLike,
): ClientReadinessSignals {
  return {
    // Platform credential presence (env-derived).
    telegramBotTokenPresent: present(env.TELEGRAM_BOT_TOKEN),
    linearApiKeyPresent: present(env.LINEAR_API_KEY),

    // Per-client link state (derived from existing nexus_clients columns).
    // A linked Linear project is the closest real signal we have for the
    // launch queue; the dedicated team id lives on `businesses`, so it is
    // honestly absent here until that link is wired.
    linearTeamLinked: present(client.linear_project_id),

    // Provider-link columns are not present on nexus_clients today (they live
    // on `businesses`). Reporting `false` is the honest answer — never
    // fabricate readiness, and never add a column to flip these to true.
    telegramDestinationLinked: false,
    repoLinked: false,
    vercelLinked: false,
    supabaseLinked: false,
    railwayLinked: false,
    hermesRouteConfigured: false,

    // The first work plan counts as drafted once the portal content / brand
    // config has been populated — the founder has put real onboarding material
    // into the row rather than leaving the wizard defaults.
    firstPlanDrafted: hasKeys(client.portal_content) || hasKeys(client.brand_config),
  };
}

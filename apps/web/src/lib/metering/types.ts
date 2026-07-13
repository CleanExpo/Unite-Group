/**
 * Project cost metering (WS1) — core types.
 *
 * Provider-agnostic: every cost source (Vercel, DigitalOcean, Stripe, Railway,
 * Supabase, LLM APIs, ElevenLabs, Twilio, domains, …) is a pluggable
 * {@link CostSourceAdapter}. Adding a source = adding an adapter; nothing in the
 * core changes. Adapters are PURE transforms (raw payload → normalised events)
 * so the ingestion is read-only, cred-free, and unit-testable — the live fetch
 * is injected at the edge.
 */

export type CostSourceId =
  | 'vercel'
  | 'digitalocean'
  | 'stripe'
  | 'railway'
  | 'supabase'
  | 'anthropic'
  | 'openai'
  | 'elevenlabs'
  | 'twilio'
  | 'domains';

/** How we reach the source's data. 'token' = an already-connected credential; 'key-gate' = needs a founder-provisioned scoped key. */
export type Reachability = 'token' | 'key-gate';

/** A normalised cost line from any source, before attribution to a business. */
export interface RawCostEvent {
  costSourceId: CostSourceId;
  /** Stable id within the source — dedupes at-least-once ingestion. */
  externalId: string;
  /** ISO date (YYYY-MM-DD). */
  periodStart: string;
  periodEnd: string;
  /** Amount in the source's native currency (converted to AUD downstream). */
  amount: number;
  currency: string;
  /** The value attribution maps on — e.g. a Vercel project or DO app name. */
  matchKey: string;
  raw?: Record<string, unknown>;
}

/**
 * A cost source. `toEvents` is a pure transform from the source's own usage
 * payload (`TInput`) to normalised events — no I/O. The live fetch that produces
 * `TInput` is supplied by the caller (read-only, via a connected token / scoped
 * key), keeping this layer testable and free of provider SDKs.
 */
export interface CostSourceAdapter<TInput = unknown> {
  id: CostSourceId;
  reachability: Reachability;
  /** ISO 4217, e.g. 'USD'. */
  nativeCurrency: string;
  toEvents(input: TInput): RawCostEvent[];
}

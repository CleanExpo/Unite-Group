/**
 * The OpenRouter call layer — retries, rate limits, and cost accounting.
 *
 * WHY THIS EXISTS. Phase 1 called `fetch` once and turned any non-2xx into
 * `error: 'HTTP 429'`. On free tiers that is not an edge case, it is the normal
 * operating condition: free models rate-limit hard and recover in seconds. The
 * consequence was quiet and bad — a rate-limited model does not vote, so the
 * EFFECTIVE quorum drops below the requested one and a finding that needed two
 * votes can be promoted on one, or a real finding can be dropped for want of a
 * vote that was never actually asked for. Phase 1 printed the error list, which
 * makes it visible but does not make it right.
 *
 * "Run free models in parallel" is therefore mostly a rate-limit engineering
 * problem, not a prompting one.
 */

const API = 'https://openrouter.ai/api/v1';

/** Statuses worth retrying: rate limits and transient upstream failures. */
const RETRYABLE = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

/**
 * How long to wait before retry `attempt` (1-based), in ms.
 *
 * Exponential with FULL JITTER. Without jitter, a fan-out of N models that all
 * hit the same limit at the same moment retries at the same moment, re-collides,
 * and backs off in lockstep — the classic thundering herd, which on a free tier
 * means every model burns its quota against every other. Full jitter spreads a
 * synchronised fleet across the window.
 *
 * `Retry-After` always wins when the server sent one: it is the only number here
 * that is not a guess.
 */
export function backoffMs(attempt, retryAfterSeconds, rand = Math.random) {
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
    // Cap a hostile or absurd Retry-After so one model cannot stall the run.
    return Math.min(retryAfterSeconds * 1000, 60_000);
  }
  const ceiling = Math.min(1000 * 2 ** (attempt - 1), 30_000);
  return Math.floor(rand() * ceiling);
}

/** Parse a Retry-After header, which may be seconds or an HTTP date. */
export function parseRetryAfter(value, nowMs = Date.now()) {
  if (!value) return null;
  const secs = Number(value);
  if (Number.isFinite(secs)) return Math.max(0, secs);
  const at = Date.parse(value);
  if (Number.isNaN(at)) return null;
  return Math.max(0, (at - nowMs) / 1000);
}

/**
 * Usage and cost as REPORTED BY THE PROVIDER for one response.
 *
 * `cost` is read rather than computed. A benchmark that prices calls from its
 * own table cannot notice the case it exists to catch — a model that was free
 * when the roster was chosen and is not free today. The provider's own number
 * is the only one that can contradict our assumption.
 */
export function usageOf(json) {
  const u = json?.usage ?? {};
  return {
    promptTokens: u.prompt_tokens ?? 0,
    completionTokens: u.completion_tokens ?? 0,
    // OpenRouter reports `usage.cost` in credits (USD) when it knows it.
    costUsd: typeof u.cost === 'number' ? u.cost : 0,
  };
}

/**
 * One chat completion, with retries.
 *
 * Returns `{ ok, content, usage, attempts, error }`. Never throws: a swarm that
 * dies because one free model sulked is worse than one that reports the sulk.
 */
export async function callModel({
  model,
  system,
  user,
  key,
  timeoutMs = 120_000,
  maxAttempts = 4,
  maxTokens = 1500,
  temperature = 0,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  fetchImpl = fetch,
  rand = Math.random,
}) {
  let lastError = 'unknown';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetchImpl(`${API}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/CleanExpo/Unite-Group',
          'X-Title': 'Unite-Group review swarm',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          temperature,
          max_tokens: maxTokens,
          // Ask the provider to report usage so the cost ledger has real numbers
          // rather than our assumptions about them.
          usage: { include: true },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (RETRYABLE.has(res.status) && attempt < maxAttempts) {
        const wait = backoffMs(attempt, parseRetryAfter(res.headers?.get?.('retry-after')), rand);
        lastError = `HTTP ${res.status}`;
        await sleep(wait);
        continue;
      }
      if (!res.ok) {
        return { ok: false, model, error: `HTTP ${res.status}`, attempts: attempt, usage: usageOf(null) };
      }

      const json = await res.json();
      // A 200 carrying an error body is how several providers report an
      // upstream refusal; treating it as success would score an empty review
      // as "found nothing".
      if (json?.error) {
        return { ok: false, model, error: 'api_error', attempts: attempt, usage: usageOf(json) };
      }
      return {
        ok: true,
        model,
        content: json?.choices?.[0]?.message?.content ?? '',
        usage: usageOf(json),
        attempts: attempt,
      };
    } catch (err) {
      lastError = err?.name === 'TimeoutError' ? 'timeout' : 'exception';
      if (attempt < maxAttempts) {
        await sleep(backoffMs(attempt, null, rand));
        continue;
      }
    }
  }
  return { ok: false, model, error: lastError, attempts: maxAttempts, usage: usageOf(null) };
}

/**
 * Sum reported usage, and say plainly whether "free" was actually free.
 *
 * The whole programme this belongs to is about cost. A swarm that quietly
 * started billing would be the most embarrassing possible outcome, so the ledger
 * names every model that charged rather than reporting one comforting total.
 */
export function ledger(results) {
  const byModel = new Map();
  for (const r of results) {
    const e = byModel.get(r.model) ?? { model: r.model, calls: 0, promptTokens: 0, completionTokens: 0, costUsd: 0, retries: 0 };
    e.calls += 1;
    e.promptTokens += r.usage?.promptTokens ?? 0;
    e.completionTokens += r.usage?.completionTokens ?? 0;
    e.costUsd += r.usage?.costUsd ?? 0;
    e.retries += Math.max(0, (r.attempts ?? 1) - 1);
    byModel.set(r.model, e);
  }
  const rows = [...byModel.values()].sort((a, b) => b.costUsd - a.costUsd || b.calls - a.calls);
  const totalUsd = rows.reduce((n, r) => n + r.costUsd, 0);
  // Float noise from summing many 6-dp values should not be reported as spend.
  const billed = rows.filter((r) => r.costUsd > 1e-9);
  return { rows, totalUsd, billed, wasFree: billed.length === 0 };
}

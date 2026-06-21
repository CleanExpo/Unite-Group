// src/lib/provider-pool/quota.ts
//
// Multi-provider quota math — PURE (no I/O, no secrets).
// Spec: apps/spec-board/projects/multi-provider-llm-routing/spec.md
//
// Turns recorded usage events into a 0..1 pressure figure the router/cockpit
// consume, for two plan shapes:
//   - WINDOWED (subscriptions): usage within a rolling window vs the window cap
//     (e.g. Claude/OpenAI 5-hour + weekly). Highest-pressure window wins.
//   - PREPAID (MiniMax/OpenRouter): spent vs purchased balance.
//
// Pairs with deriveProviderState() in the cockpit, which maps pressure → state.

/** One unit of recorded usage. `units` is plan-relative (tokens, or run-units). */
export interface QuotaEvent {
  at: string // ISO timestamp
  units: number
}

/** A rolling-window cap (e.g. 5-hour or weekly). */
export interface WindowCap {
  label: string
  seconds: number
  cap: number
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

/** Sum usage units within `windowSeconds` before `now`. */
export function windowUsage(events: QuotaEvent[], windowSeconds: number, now: string): number {
  const cutoff = new Date(now).getTime() - windowSeconds * 1000
  let total = 0
  for (const e of events) {
    if (new Date(e.at).getTime() >= cutoff) total += e.units
  }
  return total
}

/**
 * Pressure (0..1) for a WINDOWED/subscription plan: the max pressure across all
 * its windows (a plan blocked by its weekly cap is blocked even if the 5-hour
 * window has room). Returns 0 when there are no caps.
 */
export function windowedPressure(events: QuotaEvent[], caps: WindowCap[], now: string): number {
  let worst = 0
  for (const c of caps) {
    if (c.cap <= 0) continue
    const used = windowUsage(events, c.seconds, now)
    worst = Math.max(worst, used / c.cap)
  }
  return clamp01(worst)
}

/** Pressure (0..1) for a PREPAID plan: spent vs purchased balance. */
export function prepaidPressure(spentUnits: number, purchasedUnits: number): number {
  if (purchasedUnits <= 0) return 1
  return clamp01(spentUnits / purchasedUnits)
}

/** Common window presets (seconds). */
export const WINDOW = {
  fiveHour: 5 * 60 * 60,
  weekly: 7 * 24 * 60 * 60,
  daily: 24 * 60 * 60,
} as const

/**
 * When a windowed plan is at/over a cap, the soonest moment it frees up: the
 * oldest in-window event's timestamp + the window length. Null when not capped
 * or there are no in-window events. Used to set an account's `coolingUntil`.
 */
export function nextResetAt(events: QuotaEvent[], cap: WindowCap, now: string): string | null {
  const used = windowUsage(events, cap.seconds, now)
  if (cap.cap <= 0 || used < cap.cap) return null
  const cutoff = new Date(now).getTime() - cap.seconds * 1000
  const inWindow = events
    .map((e) => new Date(e.at).getTime())
    .filter((t) => t >= cutoff)
    .sort((a, b) => a - b)
  if (inWindow.length === 0) return null
  return new Date(inWindow[0]! + cap.seconds * 1000).toISOString()
}

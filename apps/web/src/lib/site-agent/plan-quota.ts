// src/lib/site-agent/plan-quota.ts
// Plan → daily chat ceiling for the public site agent (UNI-2917). Config only:
// no prices live here or anywhere in the site agent.
//
// The ceiling lands in public_agent_controls.chat_daily_per_key, which is ONE
// value per founder applied to every site key (migration
// 20261006000000_public_agent_quota.sql). A genuinely per-key plan needs a
// per-key column — a founder-gated migration, not this file.
//
// Only ceilings with a source are filled in. `starter` = 200, the migration's
// own default. The other plans have no founder-set ceiling yet, so they
// resolve to `unset` and callers refuse rather than guess a number.

export const SITE_AGENT_PLANS = ['starter', 'growth', 'managed'] as const

export type SiteAgentPlan = (typeof SITE_AGENT_PLANS)[number]

const CHAT_DAILY_PER_KEY: Record<SiteAgentPlan, number | null> = {
  starter: 200,
  growth: null,
  managed: null,
}

export type PlanQuota =
  | { ok: true; chatDailyPerKey: number }
  | { ok: false; reason: 'unknown_plan' | 'unset' }

export function chatDailyPerKeyForPlan(plan: string): PlanQuota {
  if (!(SITE_AGENT_PLANS as readonly string[]).includes(plan)) {
    return { ok: false, reason: 'unknown_plan' }
  }
  const ceiling = CHAT_DAILY_PER_KEY[plan as SiteAgentPlan]
  return ceiling === null ? { ok: false, reason: 'unset' } : { ok: true, chatDailyPerKey: ceiling }
}

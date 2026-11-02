// Portal entitlements: the shared contract for the Ivi portal track (S1, S2, S3). UNI-3167 on a slice of UNI-3141.
// Growth modules are paid. They default OFF, and any plan other than 'paid' reads every module as OFF,
// whatever the stored row says. The database refuses a comp/none row with a module ON as well.

export const PORTAL_PLANS = ['comp', 'paid', 'none'] as const
export type PortalPlan = (typeof PORTAL_PLANS)[number]

export const PORTAL_MODULES = ['content', 'seo', 'social', 'voice'] as const
export type PortalModule = (typeof PORTAL_MODULES)[number]

export type Entitlements = { plan: PortalPlan; modules: Record<PortalModule, boolean> }

export function allModulesOff(): Record<PortalModule, boolean> {
  return { content: false, seo: false, social: false, voice: false }
}

/** The answer for a tenant with no entitlement row: no plan, nothing switched on. */
export function noEntitlements(): Entitlements {
  return { plan: 'none', modules: allModulesOff() }
}

function isPlan(value: unknown): value is PortalPlan {
  return typeof value === 'string' && (PORTAL_PLANS as readonly string[]).includes(value)
}

/**
 * Turns a stored row into Entitlements. A module is ON only when the plan is 'paid' AND the stored value is
 * exactly `true`. An unknown plan is an error, never a silent 'none', so a bad row is visible.
 */
export function normaliseEntitlements(row: { plan: unknown; modules: unknown }): Entitlements {
  if (!isPlan(row.plan)) throw new Error(`portal entitlements: unknown plan ${JSON.stringify(row.plan)}`)
  const stored = row.modules && typeof row.modules === 'object' ? (row.modules as Record<string, unknown>) : {}
  const modules = allModulesOff()
  if (row.plan === 'paid') {
    for (const m of PORTAL_MODULES) modules[m] = stored[m] === true
  }
  return { plan: row.plan, modules }
}

/**
 * Billing switch for a paid module. Stripe is out of scope for UNI-3167: there is no implementation yet.
 * UNI-3141 owns it. A module turns ON only after a confirmed payment (webhook), never after a browser redirect.
 */
export interface StripeModuleSwitch {
  /** Start turning a module on: creates or updates the Stripe subscription item. Returns the pending change id. */
  requestEnable(input: { tenantSlug: string; module: PortalModule; idempotencyKey: string }): Promise<{ changeId: string }>
  /** Start turning a module off at the end of the paid period. Returns the effective stop date (ISO). */
  requestDisable(input: { tenantSlug: string; module: PortalModule; idempotencyKey: string }): Promise<{ effectiveAt: string }>
}

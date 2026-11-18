// Forecast display. A forecast is shown only when the team entered a window, a basis and a confidence, and dated
// it. Nothing here computes or invents a date. Without a verified estimate the client reads the exact words below.

export const ESTIMATE_NOT_VERIFIED = 'ESTIMATE NOT YET VERIFIED'

/** After this many days a forecast is shown as stale, with its date, rather than as current. */
export const FORECAST_STALE_DAYS = 14

export interface ForecastInput {
  window: string | null
  basis: string | null
  confidence: 'low' | 'medium' | 'high' | null
  updatedAt: string | null
}

export type ForecastView =
  | { kind: 'unverified'; text: typeof ESTIMATE_NOT_VERIFIED }
  | { kind: 'forecast'; text: string; basis: string; confidence: 'low' | 'medium' | 'high'; updatedAt: string; stale: boolean }

export function forecastView(f: ForecastInput, now: Date = new Date()): ForecastView {
  const window = f.window?.trim()
  const basis = f.basis?.trim()
  if (!window || !basis || !f.confidence || !f.updatedAt) return { kind: 'unverified', text: ESTIMATE_NOT_VERIFIED }
  const at = Date.parse(f.updatedAt)
  if (Number.isNaN(at)) return { kind: 'unverified', text: ESTIMATE_NOT_VERIFIED }
  const stale = now.getTime() - at > FORECAST_STALE_DAYS * 24 * 60 * 60 * 1000
  return { kind: 'forecast', text: window, basis, confidence: f.confidence, updatedAt: f.updatedAt, stale }
}

/** en-AU date for the page, e.g. 19/11/2026. */
export function formatAuDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'unknown date'
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Australia/Brisbane' })
}

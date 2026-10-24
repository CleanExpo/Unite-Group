// Link gating for Synthex URLs shown in Mission Control (eng I4): only these
// hosts render as links; anything else is shown as text.

/** Only an https LinkedIn URL becomes a link (eng I4); anything else stays text. */
export function linkedInPostUrl(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    const linkedIn = url.hostname === 'linkedin.com' || url.hostname.endsWith('.linkedin.com')
    return url.protocol === 'https:' && linkedIn && !url.username && !url.password ? url.href : null
  } catch { return null }
}

/** Only an https synthex.social deep link becomes the approve link. */
export function synthexApproveUrl(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    const synthex = url.hostname === 'synthex.social' || url.hostname.endsWith('.synthex.social')
    return url.protocol === 'https:' && synthex && !url.username && !url.password ? url.href : null
  } catch { return null }
}

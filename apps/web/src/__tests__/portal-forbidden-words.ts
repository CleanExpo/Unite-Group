import { NO_PASSWORD_LINE } from '@/components/portal/portal-copy'

// Shared by the source scan (portal-no-password.test.ts) and the rendered-page scan (portal-guard.test.tsx), so the
// two checks can never disagree about which words ask for a secret sign-in value. Joined-letter forms.
export const FORBIDDEN = ['password', 'passwd', 'passcode', 'passphrase', 'logindetails', 'signindetails', 'logondetails', 'credential']

const REACT_ESCAPES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#x27;': "'", '&#39;': "'" }

/**
 * What a visitor of this rendered HTML could read that asks for a password. The HTML is what React actually produced,
 * so any string built at run time ('passXword'.replace('X', 'w'), joined arrays, computed props) is already resolved.
 * Every letter is joined, both across the whole markup (tag and attribute names included, so type="password" counts)
 * and across the visible text alone, after taking out the one approved promise line.
 */
export function renderedFindings(html: string): string[] {
  const text = html.replace(/&(?:amp|lt|gt|quot|#x27|#39);/g, (m) => REACT_ESCAPES[m] ?? m).normalize('NFKC')
  const rest = text.split(NO_PASSWORD_LINE).join(' ')
  const streams = [rest, rest.replace(/<[^<>]*>/g, '')].map((s) => s.toLowerCase().replace(/[^a-z]/g, ''))
  const out = FORBIDDEN.filter((word) => streams.some((s) => s.includes(word))).map((w) => `rendered password wording: ${w}`)
  if (/\bpwd\b/i.test(rest)) out.push('rendered password wording: pwd')
  return out
}

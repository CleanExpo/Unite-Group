// src/lib/email/signature.ts
// Per-account email signature footers for Unite-Group Nexus mailboxes (UNI-2153).
//
// Produces EMAIL-SAFE HTML: table-based layout, all styles inline, web-safe
// fonts, the logo as an absolute-URL <img>, and explicit link colours — no
// external CSS or classes (email clients strip those). Composed from the real
// account → business mapping (email-accounts.ts + businesses.ts), the account's
// own sign-off (email_account_voice via getAccountVoice), and a founder-editable
// slogan (a PROPOSED default, not an asserted brand line).
//
// Business accounts only: a personal mailbox resolves to no footer.

import { accountByEmail } from '@/lib/email-accounts';
import { getBusinessByKey } from '@/lib/businesses';
import { getAccountVoice } from '@/lib/margot/account-voice';
import { getAccountSlogan } from '@/lib/margot/account-voice';

/**
 * PROPOSED, founder-editable default slogan. NOT an established brand line — it
 * is shown as an editable suggestion and can be overridden per account. Kept
 * here as config so a single edit changes every account that has not set its own.
 */
export const DEFAULT_SLOGAN = 'One command centre. Every venture, connected.';

/**
 * Real public domains per business, for footer contact + sibling links. Only
 * businesses with a real domain appear; ato/itr have none and are intentionally
 * omitted, so they never surface as a contact or a sibling link.
 */
// Clean PUBLIC brand name + real domain per business — the name shown in the
// footer is decoupled from the internal businesses.ts SSOT name (e.g. ccw's SSOT
// name is "CCW-ERP/CRM", which must not appear on outgoing mail). Only businesses
// with a real domain appear; ato/itr have none and are intentionally omitted.
export const PORTFOLIO_CONTACT: Record<string, { name: string; domain: string }> = {
  dr: { name: 'Disaster Recovery', domain: 'disasterrecovery.com.au' },
  nrpg: { name: 'NRPG', domain: 'nrpg.business' },
  carsi: { name: 'CARSI', domain: 'carsi.com.au' },
  restore: { name: 'RestoreAssist', domain: 'restoreassist.app' },
  synthex: { name: 'SYNTHEX', domain: 'synthex.social' },
  ccw: { name: 'CCW', domain: 'connexusm.com' },
};

// The parent identity for the Unite-Group Nexus HQ mailbox (contact@unite-group.in).
// Deliberately NOT in PORTFOLIO_CONTACT (so it never appears as a sibling on other
// footers) and NOT in businesses.ts (so it is not a portfolio tile).
export const HQ_KEY = 'ugn';
export const HQ_IDENTITY = { name: 'Unite-Group Nexus', domain: 'unite-group.in' };

export interface SignatureParts {
  logoUrl: string;
  slogan: string;
  signOff: string;
  founderName: string;
  businessName: string;
  accountEmail: string;
  businessDomain: string | null;
  siblings: Array<{ name: string; domain: string }>;
  /**
   * Whether to render the "Part of the Unite-Group Nexus portfolio …" disclosure
   * (and the Pty Ltd legal line). True for OWNED accounts and the HQ mailbox;
   * false for CLIENT accounts (e.g. CCW) — a client mailbox must never broadcast
   * the internal portfolio.
   */
  showPortfolioLine: boolean;
}

function logoUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://unite-group.in';
  return `${base}/logos/unite-group-nexus-logo.png`;
}

/**
 * Resolve the static signature parts for a business account, or `null` for a
 * personal / unknown mailbox (no footer). The sign-off and slogan are supplied
 * by the caller (they are async / editable); everything else is derived from the
 * real account → business → domain mapping.
 */
export function buildSignatureParts(
  accountEmail: string,
  opts: { signOff: string; slogan: string; founderName: string }
): SignatureParts | null {
  const account = accountByEmail(accountEmail);
  if (!account || account.scope === 'personal') return null;

  const ownKey = account.businessKey;
  // The Unite-Group Nexus HQ mailbox (contact@unite-group.in) is the PARENT
  // identity, not a portfolio business — kept out of PORTFOLIO_CONTACT so it never
  // lists itself as a sibling on other footers, and out of businesses.ts so it is
  // not a portfolio tile. Its own footer references every portfolio business.
  const isHQ = ownKey === HQ_KEY;
  const ownContact = isHQ ? HQ_IDENTITY : (PORTFOLIO_CONTACT[ownKey] ?? null);
  const business = getBusinessByKey(ownKey);
  if (!ownContact && !business) return null;

  const businessDomain = ownContact?.domain ?? null;

  // The portfolio disclosure (siblings + "Part of the Unite-Group Nexus
  // portfolio" + the Pty Ltd line) is for OWNED accounts and the HQ mailbox only.
  // A CLIENT mailbox (e.g. CCW phill@connexusm.com) must NOT broadcast the
  // internal portfolio — it still gets a branded footer with its own identity.
  const showPortfolioLine = account.scope === 'owned' || ownKey === HQ_KEY;

  // Every OTHER business that has a real domain — excludes this account's own
  // business and excludes domain-less businesses (ato/itr are not in the map).
  // Uses the clean public brand name, not the internal businesses.ts SSOT name.
  // For the HQ account (ownKey='ugn', not in PORTFOLIO_CONTACT) none are excluded.
  // Empty for client accounts (they never show siblings).
  const siblings = showPortfolioLine
    ? Object.entries(PORTFOLIO_CONTACT)
        .filter(([key]) => key !== ownKey)
        .map(([, c]) => ({ name: c.name, domain: c.domain }))
    : [];

  return {
    logoUrl: logoUrl(),
    slogan: opts.slogan,
    signOff: opts.signOff,
    founderName: opts.founderName,
    // Prefer the clean public brand name for the account's own business too.
    businessName: ownContact?.name ?? business?.name ?? '',
    accountEmail,
    businessDomain,
    siblings,
    showPortfolioLine,
  };
}

/**
 * HTML-escape a value for safe interpolation into TEXT context. Escapes the five
 * XSS-relevant characters plus `'` and `/` (OWASP output-encoding set) so a
 * hostile value can neither break out of an element nor an attribute nor forge a
 * closing tag. Exported so the send path (gmail.sendReply) escapes the untrusted
 * draft body with the same hardened rules.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Render email-safe signature HTML from resolved parts. Pure and sync so it is
 * trivially testable. Table layout, inline styles only, web-safe font stack,
 * explicit link colours, logo as an absolute-URL <img width="120">.
 */
export function renderSignatureHtml(parts: SignatureParts): string {
  const {
    logoUrl: logo,
    slogan,
    signOff,
    founderName,
    businessName,
    accountEmail,
    businessDomain,
    siblings,
  } = parts;

  const font = "Arial, Helvetica, 'Segoe UI', sans-serif";
  const link = '#15803d';
  const muted = '#6b7280';
  const text = '#111827';
  const rule = '#e5e7eb';
  const sep = ' &nbsp;&middot;&nbsp; ';

  // URLs go in href/src attributes: encodeURI keeps `/` `:` `@` intact (so the
  // path/domain still resolves) while percent-encoding attribute-breakout chars
  // like `"`, `<`, `>` and spaces. Visible link TEXT is escapeHtml'd (text
  // context). Both defend against a hostile domain/email/logo value.
  const domainLink = businessDomain
    ? `<a href="https://${encodeURI(businessDomain)}" style="color:${link};text-decoration:none;">${escapeHtml(businessDomain)}</a>`
    : '';

  const siblingLinks = siblings
    .map(
      (s) =>
        `<a href="https://${encodeURI(s.domain)}" style="color:${link};text-decoration:none;">${escapeHtml(s.name)}</a>`
    )
    .join(sep);

  const portfolioRows = parts.showPortfolioLine
    ? `
  <tr><td style="padding:8px 0 0 0;border-top:1px solid ${rule};font-size:11px;color:${muted};">Part of the Unite-Group Nexus portfolio${siblings.length ? ` &mdash; ${siblingLinks}` : ''}</td></tr>
  <tr><td style="padding:4px 0 0 0;font-size:11px;color:${muted};">Unite-Group Nexus Pty Ltd</td></tr>`
    : '';

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:${font};font-size:13px;line-height:1.5;color:${text};">
  <tr><td style="padding:0 0 8px 0;">
    <img src="${encodeURI(logo)}" width="120" alt="Unite-Group Nexus" style="display:block;border:0;width:120px;height:auto;" />
  </td></tr>
  <tr><td style="padding:0 0 6px 0;font-style:italic;font-size:12px;color:${muted};">${escapeHtml(slogan)}</td></tr>
  <tr><td style="padding:0 0 2px 0;font-weight:bold;color:${text};">${escapeHtml(signOff)}</td></tr>
  <tr><td style="padding:0 0 4px 0;color:${text};">${escapeHtml(founderName)}${sep}${escapeHtml(businessName)}</td></tr>
  <tr><td style="padding:0 0 8px 0;font-size:12px;color:${muted};">
    <a href="mailto:${encodeURI(accountEmail)}" style="color:${link};text-decoration:none;">${escapeHtml(accountEmail)}</a>${businessDomain ? `${sep}${domainLink}` : ''}
  </td></tr>${portfolioRows}
</table>`;
}

/**
 * The full signature HTML for an account. Resolves the account's stored sign-off
 * and slogan, then renders. Returns '' for personal / unknown mailboxes so a
 * caller can append unconditionally. `opts.slogan` (e.g. a live preview override)
 * wins over the stored slogan, which wins over DEFAULT_SLOGAN.
 */
export async function getAccountSignature(
  founderId: string,
  accountEmail: string,
  opts?: { slogan?: string }
): Promise<string> {
  const account = accountByEmail(accountEmail);
  if (!account || account.scope === 'personal') return '';

  const [voice, storedSlogan] = await Promise.all([
    getAccountVoice(founderId, accountEmail),
    getAccountSlogan(founderId, accountEmail),
  ]);

  const slogan =
    opts?.slogan?.trim() || storedSlogan?.trim() || DEFAULT_SLOGAN;

  const parts = buildSignatureParts(accountEmail, {
    signOff: voice.signOff,
    slogan,
    founderName: voice.name,
  });
  if (!parts) return '';
  return renderSignatureHtml(parts);
}

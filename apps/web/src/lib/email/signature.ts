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

export interface SignatureParts {
  logoUrl: string;
  slogan: string;
  signOff: string;
  founderName: string;
  businessName: string;
  accountEmail: string;
  businessDomain: string | null;
  siblings: Array<{ name: string; domain: string }>;
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

  const business = getBusinessByKey(account.businessKey);
  if (!business) return null;

  const ownKey = account.businessKey;
  const ownContact = PORTFOLIO_CONTACT[ownKey] ?? null;
  const businessDomain = ownContact?.domain ?? null;

  // Every OTHER business that has a real domain — excludes this account's own
  // business and excludes domain-less businesses (ato/itr are not in the map).
  // Uses the clean public brand name, not the internal businesses.ts SSOT name.
  const siblings = Object.entries(PORTFOLIO_CONTACT)
    .filter(([key]) => key !== ownKey)
    .map(([, c]) => ({ name: c.name, domain: c.domain }));

  return {
    logoUrl: logoUrl(),
    slogan: opts.slogan,
    signOff: opts.signOff,
    founderName: opts.founderName,
    // Prefer the clean public brand name for the account's own business too.
    businessName: ownContact?.name ?? business.name,
    accountEmail,
    businessDomain,
    siblings,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

  const domainLink = businessDomain
    ? `<a href="https://${businessDomain}" style="color:${link};text-decoration:none;">${businessDomain}</a>`
    : '';

  const siblingLinks = siblings
    .map(
      (s) =>
        `<a href="https://${s.domain}" style="color:${link};text-decoration:none;">${escapeHtml(s.name)}</a>`
    )
    .join(sep);

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:${font};font-size:13px;line-height:1.5;color:${text};">
  <tr><td style="padding:0 0 8px 0;">
    <img src="${logo}" width="120" alt="Unite-Group Nexus" style="display:block;border:0;width:120px;height:auto;" />
  </td></tr>
  <tr><td style="padding:0 0 6px 0;font-style:italic;font-size:12px;color:${muted};">${escapeHtml(slogan)}</td></tr>
  <tr><td style="padding:0 0 2px 0;font-weight:bold;color:${text};">${escapeHtml(signOff)}</td></tr>
  <tr><td style="padding:0 0 4px 0;color:${text};">${escapeHtml(founderName)}${sep}${escapeHtml(businessName)}</td></tr>
  <tr><td style="padding:0 0 8px 0;font-size:12px;color:${muted};">
    <a href="mailto:${accountEmail}" style="color:${link};text-decoration:none;">${escapeHtml(accountEmail)}</a>${businessDomain ? `${sep}${domainLink}` : ''}
  </td></tr>
  <tr><td style="padding:8px 0 0 0;border-top:1px solid ${rule};font-size:11px;color:${muted};">Part of the Unite-Group Nexus portfolio${siblings.length ? ` &mdash; ${siblingLinks}` : ''}</td></tr>
  <tr><td style="padding:4px 0 0 0;font-size:11px;color:${muted};">Unite-Group Nexus Pty Ltd</td></tr>
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

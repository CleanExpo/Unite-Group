// src/lib/legal/company.ts
// Legal identity shown on the public privacy and terms pages.
//
// COMPANY_ABN is the single read of the company's ABN. When it is unset, blank or
// fails the ABN checksum the verified default below is used, never a bare "ABN"
// or a malformed number. Static pages read it at build time, so a new value
// needs a redeploy.
//
// Default ABN source: the public Australian Business Register (ABR), checked
// 25/10/2026 — 95 691 477 844 is UNITE-GROUP NEXUS PTY LTD, active from
// 01 Oct 2025, GST registered from 01 Oct 2025, QLD 4305.

export const COMPANY_NAME = 'Unite-Group Nexus Pty Ltd'

/** The ABN verified on the ABR on 25/10/2026; used when COMPANY_ABN is unset, blank or invalid. */
const VERIFIED_ABN = '95691477844'

const ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]

/** ATO ABN checksum: subtract 1 from the first digit, weight, sum, divisible by 89. */
function isValidAbn(digits: string): boolean {
  if (!/^\d{11}$/.test(digits)) return false
  const sum = digits
    .split('')
    .reduce((total, char, i) => total + (Number(char) - (i === 0 ? 1 : 0)) * ABN_WEIGHTS[i], 0)
  return sum % 89 === 0
}

/** The ABN formatted as `NN NNN NNN NNN`: COMPANY_ABN when valid, otherwise the verified default. */
export function companyAbn(env: NodeJS.ProcessEnv = process.env): string {
  const fromEnv = (env.COMPANY_ABN ?? '').replace(/\s+/g, '')
  const digits = isValidAbn(fromEnv) ? fromEnv : VERIFIED_ABN
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`
}

/** `ABN NN NNN NNN NNN`. */
export function companyAbnLabel(env: NodeJS.ProcessEnv = process.env): string {
  return `ABN ${companyAbn(env)}`
}

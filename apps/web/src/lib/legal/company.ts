// src/lib/legal/company.ts
// Legal identity shown on the public privacy and terms pages.
//
// COMPANY_ABN is the single read of the company's ABN. It is a founder-supplied
// fact: when it is unset, blank or fails the ABN checksum, the pages say
// "ABN pending" rather than rendering a bare "ABN" or a malformed number.
// Static pages read it at build time, so a new value needs a redeploy.

export const COMPANY_NAME = 'Unite-Group Nexus Pty Ltd'

const ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]

/** ATO ABN checksum: subtract 1 from the first digit, weight, sum, divisible by 89. */
function isValidAbn(digits: string): boolean {
  if (!/^\d{11}$/.test(digits)) return false
  const sum = digits
    .split('')
    .reduce((total, char, i) => total + (Number(char) - (i === 0 ? 1 : 0)) * ABN_WEIGHTS[i], 0)
  return sum % 89 === 0
}

/** The ABN formatted as `NN NNN NNN NNN`, or null when unset or invalid. */
export function companyAbn(env: NodeJS.ProcessEnv = process.env): string | null {
  const digits = (env.COMPANY_ABN ?? '').replace(/\s+/g, '')
  if (!isValidAbn(digits)) return null
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`
}

/** `ABN NN NNN NNN NNN` when set, otherwise the explicit `ABN pending`. */
export function companyAbnLabel(env: NodeJS.ProcessEnv = process.env): string {
  const abn = companyAbn(env)
  return abn ? `ABN ${abn}` : 'ABN pending'
}

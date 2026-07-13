import {
  DEFAULT_ROUTE_SECURITY_ALLOWLIST,
  findUnprotectedMutatingRoutes,
} from '../src/lib/security/route-security-check'

function envAllowlist(): string[] {
  return (process.env.ROUTE_INVENTORY_ALLOWLIST ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

const violations = findUnprotectedMutatingRoutes({
  allowlist: [...DEFAULT_ROUTE_SECURITY_ALLOWLIST, ...envAllowlist()],
})

if (violations.length === 0) {
  console.log('✓ route-security check: 0 unprotected mutating routes')
  process.exit(0)
}

console.error(
  `✗ route-security check: ${violations.length} mutating route(s) ship without a detected guard`,
)
console.error('')
console.error('Each route below accepts POST/PUT/PATCH/DELETE but has no detected:')
console.error('  • auth wrapper/session check (requireAdmin / getUser / etc.)')
console.error('  • timing-safe token or cron lifecycle guard')
console.error('  • webhook signature verification')
console.error('  • route rate-limit guard')
console.error('')

for (const violation of violations) {
  console.error(`  ${violation.path}  [${violation.methods.join(', ')}]  ${violation.file}`)
}

console.error('')
console.error('Fix by adding one guard pattern, or add a narrowly reviewed public route to')
console.error('ROUTE_INVENTORY_ALLOWLIST when it has no credential side-effect.')
process.exit(1)

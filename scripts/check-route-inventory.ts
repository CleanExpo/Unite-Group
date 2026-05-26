// CI regression-gate for API route security posture.
//
// Walks src/app/api/**/route.ts. For every mutating handler (POST / PUT /
// PATCH / DELETE), confirms at least ONE protection pattern is present:
//
//   • Auth wrapper (withAuth / requireAuth / requireAdmin / verifyAdminJwt)
//   • Server-side session check (supabase.auth.getSession / getUser)
//   • Constant-time token / bearer match (timingSafeBearerMatch / timingSafeTokenMatch
//     / withSyncLifecycle for cron lifecycle)
//   • Cryptographic webhook signature verification (Stripe HMAC, generic
//     verifyWebhookSignature)
//   • Per-IP rate-limit (applyRateLimit / withRateLimit)
//
// If a mutating route ships without any of those, exit non-zero so CI
// blocks the PR. This is the regression gate that complements PR #76's
// audit + UNI-2015's triage — same script family, different lens: the
// inventory shows posture per route, this script enforces it on every
// future change.
//
// Allowlist mechanism: add ROUTE_INVENTORY_ALLOWLIST comma-separated env
// var (or edit the ALLOWLIST const below) for routes that are knowingly
// public AND have no third-party-credential side-effect. Default: empty.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const AUTH_PATTERNS = [
  /withAuth|requireAuth|requireAdmin|verifyAdminJwt|getServerSession|getAdminSession/,
  /timingSafe(Bearer|Token)Match|withSyncLifecycle/,
  /supabase\.auth\.(getSession|getUser)/,
];
const WEBHOOK_SIGNATURE_PATTERNS = [
  /verifyStripeSignature|webhooks\.constructEvent/,
  /verifyWebhookSignature|verifySignature/,
  // Telegram inline approval callbacks are signed with compact HMAC payloads
  // and verified before any ledger append or Telegram side effect.
  /verifyDecisionCallbackData/,
];
// Canonical rate-limit module is @/lib/ratelimit (exports `rateLimit` +
// `RATE_LIMITS`). The `withRateLimit` alias is reserved for a future
// wrapper variant. Detector matches both names.
const RATE_LIMIT_PATTERN = /withRateLimit|\brateLimit\s*\(|RATE_LIMITS\./;

const MUTATING_VERBS = ["POST", "PUT", "PATCH", "DELETE"] as const;

// Routes intentionally public AND with no credential side-effect.
// Keep this list empty unless absolutely necessary; every entry is an
// audit-debt liability. Format: full path string starting with /api.
const ALLOWLIST = new Set<string>(
  (process.env.ROUTE_INVENTORY_ALLOWLIST ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

interface Violation {
  path: string;
  file: string;
  methods: string[];
}

function isProtected(content: string): boolean {
  if (AUTH_PATTERNS.some((re) => re.test(content))) return true;
  if (WEBHOOK_SIGNATURE_PATTERNS.some((re) => re.test(content))) return true;
  if (RATE_LIMIT_PATTERN.test(content)) return true;
  return false;
}

function detectMethods(content: string): string[] {
  return MUTATING_VERBS.filter((m) =>
    new RegExp(
      `export\\s+(async\\s+)?function\\s+${m}\\b|export\\s+const\\s+${m}\\s*=`,
    ).test(content),
  );
}

function walk(dir: string, baseUrl = ""): Violation[] {
  const out: Violation[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...walk(full, `${baseUrl}/${entry}`));
    } else if (entry === "route.ts") {
      const content = readFileSync(full, "utf-8");
      const methods = detectMethods(content);
      if (methods.length === 0) continue; // GET-only route, not in scope
      if (isProtected(content)) continue;
      const path = baseUrl || "/";
      if (ALLOWLIST.has(path)) continue;
      out.push({
        path,
        file: full.replace(process.cwd() + "/", ""),
        methods,
      });
    }
  }
  return out;
}

const violations = walk("src/app/api", "/api").sort((a, b) =>
  a.path.localeCompare(b.path),
);

if (violations.length === 0) {
  console.log("✓ route-inventory check: 0 unprotected mutating routes");
  process.exit(0);
}

console.error(
  `✗ route-inventory check: ${violations.length} mutating route(s) ship without any detected protection`,
);
console.error("");
console.error("Each route below accepts POST/PUT/PATCH/DELETE but has no:");
console.error("  • auth wrapper (requireAuth / requireAdmin / withAuth / etc.)");
console.error("  • inline supabase.auth.getSession() / getUser() check");
console.error("  • timingSafeBearerMatch / timingSafeTokenMatch");
console.error("  • webhook signature verification (Stripe HMAC etc.)");
console.error("  • rateLimit() / RATE_LIMITS.* (@/lib/ratelimit)");
console.error("");
for (const v of violations) {
  console.error(`  ${v.path}  [${v.methods.join(", ")}]  ${v.file}`);
}
console.error("");
console.error(
  "Fix by adding ONE protection pattern, OR — if the route is intentionally",
);
console.error(
  "public AND uses no server-side third-party credentials — add the path to",
);
console.error(
  "ROUTE_INVENTORY_ALLOWLIST (env var) or the ALLOWLIST const in this script.",
);
process.exit(1);

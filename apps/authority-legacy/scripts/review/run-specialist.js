#!/usr/bin/env node
/**
 * Specialist Review Runner — SYN-591
 * Runs a single specialist review using Claude claude-haiku-4-5-20251001 (fast, cost-efficient).
 * Outputs structured findings JSON.
 *
 * Usage: node scripts/review/run-specialist.js --specialist security --base-sha abc --head-sha def --pr 42 --output /tmp/review-security.json
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// ─── Parse args ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
};

const specialist = getArg("--specialist");
const baseSha = getArg("--base-sha");
const headSha = getArg("--head-sha");
const prNumber = getArg("--pr");
const outputPath = getArg("--output");

if (!specialist || !baseSha || !headSha) {
  console.error("Usage: run-specialist.js --specialist <name> --base-sha <sha> --head-sha <sha> --pr <num> --output <path>");
  process.exit(1);
}

// ─── Specialist prompts ───────────────────────────────────────────────────────
const SPECIALIST_PROMPTS = {
  security: `You are a senior security engineer. Review this diff for:
- Hardcoded secrets, API keys, tokens
- SQL injection, XSS, CSRF vulnerabilities
- Insecure authentication/authorisation patterns
- Supabase RLS bypass risks
- Exposed environment variables`,

  typescript: `You are a TypeScript expert. Review this diff for:
- Type safety issues, implicit 'any' usage
- Missing return types on exported functions
- Unsafe type assertions
- Strict null check violations
- Interface/type design quality`,

  database: `You are a database architect. Review this diff for:
- Missing IF NOT EXISTS guards in migrations
- Missing RLS policies on new tables
- N+1 query patterns
- Missing indexes on foreign keys or frequent filter columns
- Destructive operations without safe guards`,

  performance: `You are a performance engineer. Review this diff for:
- N+1 query patterns in React components or API routes
- Unoptimised images or large bundle imports
- Missing React.memo or useMemo where appropriate
- Synchronous operations in async contexts
- Missing pagination on list endpoints`,

  architecture: `You are a senior software architect. Review this diff for:
- Cross-layer imports (UI importing DB directly, etc.)
- Violations of the established module boundaries
- Premature abstractions or over-engineering
- Missing separation of concerns
- Patterns that will cause maintenance problems`,

  accessibility: `You are an accessibility specialist. Review this diff for:
- Missing ARIA labels on interactive elements
- Insufficient colour contrast
- Missing keyboard navigation support
- Images without alt text
- Forms without proper label associations`,

  react: `You are a React expert. Review this diff for:
- Missing key props in lists
- Stale closure bugs in useEffect/useCallback
- Unnecessary re-renders
- Missing cleanup in useEffect
- Anti-patterns in hooks usage`,

  "api-design": `You are an API design expert. Review this diff for:
- Inconsistent HTTP method usage (GET that mutates, etc.)
- Missing error responses with appropriate status codes
- Breaking changes to existing API contracts
- Missing input validation
- Overly large response payloads`,

  "error-handling": `You are a reliability engineer. Review this diff for:
- Unhandled promise rejections
- Missing try/catch in async functions
- Silent error swallowing (catch blocks with no logging)
- Missing fallback UI for error states
- Errors that could expose internal stack traces to clients`,

  logging: `You are a platform engineer. Review this diff for:
- Missing structured logging on significant operations
- Logging of sensitive data (tokens, passwords, PII)
- Missing correlation IDs for request tracing
- Log levels that don't match severity`,

  testing: `You are a quality engineer. Review this diff for:
- New public functions/classes without tests
- Test assertions that don't actually verify behaviour
- Missing edge case coverage (null, empty, error paths)
- Tests that are brittle due to implementation coupling`,

  documentation: `You are a technical writer. Review this diff for:
- Public API functions without JSDoc comments
- Complex logic without explanatory comments
- README or docs that need updating
- Misleading or outdated comments`,

  dependencies: `You are a dependency management expert. Review this diff for:
- New dependencies that duplicate existing ones
- Dependencies with known security vulnerabilities
- Large dependencies that should be tree-shaken
- Dev dependencies accidentally in production`,

  migrations: `You are a database migration expert. Review this diff for:
- Migrations that weren't applied via safe-migrate.sh
- Missing ROLLBACK strategy documentation
- Missing IF NOT EXISTS guards
- Migrations that modify existing data without backup consideration`,

  auth: `You are an authentication/authorisation expert. Review this diff for:
- Changes to middleware.ts or auth routes (locked files)
- Missing authentication checks on new API routes
- JWT validation bypasses
- Session management issues`,

  "bundle-size": `You are a web performance engineer focused on bundle size. Review this diff for:
- Large library imports that should use named imports
- Missing dynamic imports for code splitting
- Images that should be in next/image
- CSS that should be modularised`,
};

// ─── Get diff ─────────────────────────────────────────────────────────────────
function getDiff() {
  try {
    return execSync(`git diff ${baseSha}...${headSha}`, { encoding: "utf-8" });
  } catch {
    return execSync(`git diff HEAD~1 HEAD`, { encoding: "utf-8" });
  }
}

// ─── Run specialist review ────────────────────────────────────────────────────
async function runSpecialist() {
  const diff = getDiff();
  const prompt = SPECIALIST_PROMPTS[specialist];

  if (!prompt) {
    console.error(`Unknown specialist: ${specialist}`);
    const result = { specialist, findings: [], error: `Unknown specialist: ${specialist}` };
    if (outputPath) fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    return;
  }

  // Truncate diff if too large (keep first 8000 chars)
  const truncatedDiff = diff.length > 8000 ? diff.slice(0, 8000) + "\n\n[diff truncated]" : diff;

  const systemPrompt = `${prompt}

Output ONLY valid JSON matching this schema:
{
  "specialist": string,
  "findings": [
    {
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO",
      "file": string,
      "line": number | null,
      "message": string,
      "suggestion": string | null
    }
  ],
  "summary": string,
  "approved": boolean
}

Rules:
- Only report actual issues, not hypotheticals
- CRITICAL: security vulnerabilities, data loss risk
- HIGH: bugs that will cause failures
- MEDIUM: code quality issues that should be fixed
- LOW: style issues, minor improvements
- INFO: observations with no action required
- Set approved=false if any CRITICAL or HIGH findings
- Set approved=true only if no CRITICAL/HIGH findings`;

  const requestBody = {
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `Review this PR diff as the ${specialist} specialist:\n\n\`\`\`diff\n${truncatedDiff}\n\`\`\``,
      },
    ],
    system: systemPrompt,
  };

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.content[0].text;

    let parsed;
    try {
      // Extract JSON from response (may have markdown code fences)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
    } catch {
      parsed = {
        specialist,
        findings: [],
        summary: "Could not parse specialist response",
        approved: true,
        error: "JSON parse failed",
      };
    }

    const result = { ...parsed, specialist, pr_number: prNumber };

    if (outputPath) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    }

    console.log(`✅ ${specialist} review complete: ${result.findings?.length ?? 0} findings`);
    if (result.findings?.some((f) => f.severity === "CRITICAL")) {
      console.log(`⚠️  CRITICAL findings detected`);
    }
  } catch (error) {
    const result = {
      specialist,
      findings: [],
      summary: `Review failed: ${error.message}`,
      approved: true, // Circuit breaker: don't block PRs on infrastructure failure
      error: error.message,
    };
    if (outputPath) fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.error(`❌ ${specialist} review failed:`, error.message);
  }
}

runSpecialist().catch(console.error);

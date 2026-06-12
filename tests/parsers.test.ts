import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFindings } from "../lib/findings.ts";
import { extractClaims, summarizeEvidence } from "../lib/evidence.ts";

test("parseFindings handles tagged, bracketed, spaced, and plain lines", () => {
  const critique = [
    "1. (critical) — Lock the finish line to one sentence [INFERENCE]",
    "2. (nice-to-have): add dark mode",
    "3. [important] Use scoped tools, not raw bash",
    "4. Plain finding without a tag",
    "Not a finding line",
    "5. (Nice to have) — defer billing",
  ].join("\n");

  const findings = parseFindings(critique);
  assert.equal(findings.length, 5);
  // sorted critical → important → nice-to-have
  assert.equal(findings[0].priority, "critical");
  assert.deepEqual(
    findings.map((f) => f.priority),
    ["critical", "important", "important", "nice-to-have", "nice-to-have"],
  );
  assert.ok(findings.some((f) => f.text === "Plain finding without a tag"));
});

test("parseFindings returns empty for prose with no numbered lines", () => {
  assert.deepEqual(parseFindings("The material does not cover this topic."), []);
});

test("extractClaims pulls tagged claims with source URLs", () => {
  const spec = [
    "- The market is growing 40% YoY [VERIFIED] (https://example.com/report).",
    "* Users will prefer mobile [INFERENCE] from the survey note.",
    "1. Budget is under $5k [UNCONFIRMED]",
    "This line has no tag and is skipped.",
    "- Cited video [verified] https://youtube.com/watch?v=abc123",
  ].join("\n");

  const claims = extractClaims(spec);
  assert.equal(claims.length, 4);
  assert.equal(claims[0].tag, "verified");
  assert.equal(claims[0].sourceUrl, "https://example.com/report");
  assert.equal(claims[1].tag, "inference");
  assert.equal(claims[1].sourceUrl, null);
  assert.equal(claims[2].tag, "unconfirmed");
  assert.equal(claims[3].sourceUrl, "https://youtube.com/watch?v=abc123");

  const summary = summarizeEvidence(claims);
  assert.deepEqual(summary, { verified: 2, inference: 1, unconfirmed: 1 });
});

test("extractClaims caps runaway specs", () => {
  const spec = Array.from({ length: 500 }, (_, i) => `- Claim ${i} [VERIFIED]`).join("\n");
  assert.equal(extractClaims(spec).length, 200);
});

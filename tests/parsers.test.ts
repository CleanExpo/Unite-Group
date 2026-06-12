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

test("parseSources reads piped researcher output and dedupes", async () => {
  const { parseSources } = await import("../lib/sources.ts");
  const text = [
    "1. AI Spec Writing in 2026 | https://example.com/spec-writing | Survey of current practice.",
    "2. Deep dive video | https://youtube.com/watch?v=xyz | 40-min walkthrough.",
    "3. AI Spec Writing in 2026 | https://example.com/spec-writing | duplicate URL is dropped",
    "Some commentary the model was told not to write",
    "4. Bare line with https://example.com/whitepaper.pdf trailing words",
  ].join("\n");

  const sources = parseSources(text);
  assert.equal(sources.length, 3);
  assert.equal(sources[0].title, "AI Spec Writing in 2026");
  assert.equal(sources[0].url, "https://example.com/spec-writing");
  assert.equal(sources[1].url, "https://youtube.com/watch?v=xyz");
  assert.equal(sources[2].url, "https://example.com/whitepaper.pdf");
  assert.ok(sources[2].title.length > 0);
});

test("keywordQuery ORs meaningful vision words for FTS fallback", async () => {
  const { keywordQuery } = await import("../lib/keywords.ts");
  const q = keywordQuery(
    "I want to build a mortgage broker dashboard that tracks loan approvals with some alerts",
  );
  assert.ok(q);
  assert.ok(q!.includes(" or "));
  assert.ok(q!.includes("mortgage"));
  assert.ok(!q!.split(" or ").includes("want"));
  assert.equal(keywordQuery("a an to of"), null);
});

test("harvestSources rescues URLs from prose output", async () => {
  const { harvestSources } = await import("../lib/sources.ts");
  const prose = [
    "I found a great overview at https://example.com/overview which covers pricing.",
    "There's also a detailed video walkthrough: https://youtube.com/watch?v=abc.",
    "See https://example.com/overview again (duplicate).",
  ].join("\n");

  const sources = harvestSources(prose);
  assert.equal(sources.length, 2);
  assert.equal(sources[0].url, "https://example.com/overview");
  assert.equal(sources[1].url, "https://youtube.com/watch?v=abc");
  assert.ok(sources[0].title.length > 0);
});

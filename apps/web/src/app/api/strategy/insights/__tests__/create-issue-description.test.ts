import { describe, it, expect } from "vitest";
import { hasAcceptanceCriteria } from "@/lib/command-centre/linear-claim";

// The work→task bridge (B8) builds a Linear issue description from an insight.
// Linear is a planning projection, but acceptance criteria remain part of the
// human-readable work contract. This guards the route's exact description shape.
function buildDescription(
  body: string,
  acceptanceCriteria: string,
  evidenceIds: string[],
): string {
  const evidenceSection = evidenceIds.length
    ? `\n\n## Evidence\n${evidenceIds.map((e) => `- ${e}`).join("\n")}`
    : "";
  return (
    `${body}\n\n## Acceptance Criteria\n${acceptanceCriteria}` +
    evidenceSection +
    `\n\n---\nCreated from strategy insight \`abc\` (strategy).`
  );
}

describe("work→task bridge description", () => {
  it("produces a planning description with an Acceptance Criteria heading", () => {
    const desc = buildDescription(
      "Investigate slow query",
      "Page loads under 1s",
      ["https://example.com/trace"],
    );
    expect(hasAcceptanceCriteria({ description: desc })).toBe(true);
  });

  it("includes the evidence section when evidence is supplied", () => {
    const desc = buildDescription("body", "criteria", [
      "https://example.com/a",
      "ref-2",
    ]);
    expect(desc).toContain("## Evidence");
    expect(desc).toContain("- https://example.com/a");
    expect(desc).toContain("- ref-2");
  });

  it("omits the evidence section when no evidence is supplied", () => {
    const desc = buildDescription("body", "criteria", []);
    expect(desc).not.toContain("## Evidence");
    expect(hasAcceptanceCriteria({ description: desc })).toBe(true);
  });
});

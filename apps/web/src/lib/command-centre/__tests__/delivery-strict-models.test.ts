import { describe, expect, it } from "vitest";
import { generateClarifyingQuestions } from "../clarify";
import { generateBuildPlan } from "../lanes/software-plan";

const client = (text: string) => ({
  messages: { create: async () => ({ content: [{ type: "text", text }] }) },
});
const offline = {
  messages: {
    create: async (): Promise<never> => {
      throw new Error("offline");
    },
  },
};

describe("delivery strict planning uses actual provider output", () => {
  it("preserves legacy clarify fallback but strict delivery fails on provider outage", async () => {
    expect(await generateClarifyingQuestions("A portal", offline)).toEqual([]);
    await expect(
      generateClarifyingQuestions("A portal", offline, { strict: true }),
    ).rejects.toThrow();
  });
  it("accepts an explicit empty question array, rejects malformed provider output", async () => {
    expect(
      await generateClarifyingQuestions("Fully scoped", client("[]"), {
        strict: true,
      }),
    ).toEqual([]);
    await expect(
      generateClarifyingQuestions("A portal", client("{}"), { strict: true }),
    ).rejects.toThrow();
  });
  it("does not turn failed software planning into a ready generic plan", async () => {
    expect((await generateBuildPlan("A portal", offline)).summary).toBe(
      "A portal",
    );
    await expect(
      generateBuildPlan("A portal", offline, { strict: true }),
    ).rejects.toThrow();
    await expect(
      generateBuildPlan("A portal", client("{}"), { strict: true }),
    ).rejects.toThrow();
  });
});

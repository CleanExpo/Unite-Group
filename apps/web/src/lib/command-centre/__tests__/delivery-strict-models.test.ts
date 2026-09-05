import { describe, expect, it, vi } from "vitest";
import { generateClarifyingQuestions, type ModelClientLike } from "../clarify";
import { generateBuildPlan } from "../lanes/software-plan";
import { classifyIdea } from "../classify-idea";
import { preparationFailure, type PreparationStep } from "../preparation-failure";
import { PreparationResponseError } from "../model-response";

const client = (text: string) => ({
  messages: { create: async () => ({ content: [{ type: "text", text }], stop_reason: "end_turn" }) },
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
      await generateClarifyingQuestions("Fully scoped", client('{"questions":[]}'), {
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

const context = { idea: "A customer portal", clarifications: { questions: [], answers: {} } };
const classification = { lane: "software", confidence: 0.9, rationale: "A customer-facing application" };
const plan = {
  title: "Customer portal", summary: "Customers can view their own job progress.",
  acceptanceCriteria: ["A customer sees their own jobs", "Other customers' jobs remain private"],
  steps: ["Inspect the existing portal", "Implement the scoped view", "Verify customer isolation"],
};
const cases = [
  {
    stage: "classification" as const,
    output: classification,
    run: (model: ModelClientLike) => classifyIdea(context, model, { strict: true }),
    result: classification,
    properties: { lane: { type: "string", enum: ["marketing", "software", "content"] }, confidence: { type: "number" }, rationale: { type: "string" } },
    invalidValues: [
      { ...classification, lane: "unrecognised" },
      { ...classification, confidence: 2 },
      { ...classification, confidence: "0.9" },
      { ...classification, rationale: " " },
    ],
  },
  {
    stage: "clarification" as const,
    output: { questions: ["Who will use the portal?"] },
    run: (model: ModelClientLike) => generateClarifyingQuestions(context.idea, model, { strict: true }),
    result: ["Who will use the portal?"],
    properties: { questions: { type: "array", items: { type: "string" } } },
    invalidValues: [
      { questions: ["Not a question"] },
      { questions: ["A?", "B?", "C?", "D?", "E?"] },
      { questions: [null] },
      { questions: "Who?" },
    ],
  },
  {
    stage: "specification" as const,
    output: plan,
    run: (model: ModelClientLike) => generateBuildPlan(context.idea, model, { strict: true }),
    result: plan,
    properties: { title: { type: "string" }, summary: { type: "string" }, acceptanceCriteria: { type: "array", items: { type: "string" } }, steps: { type: "array", items: { type: "string" } } },
    invalidValues: [
      { ...plan, acceptanceCriteria: ["Valid", 12] },
      { ...plan, steps: [" "] },
      { ...plan, title: " " },
      { ...plan, acceptanceCriteria: [] },
    ],
  },
];

function modelResponse(text: string, stopReason: string | null | undefined = "end_turn", leadingBlocks: Array<{ type: string; text?: string }> = []) {
  return {
    messages: { create: vi.fn().mockResolvedValue({
      content: [...leadingBlocks, { type: "text", text }], stop_reason: stopReason,
    }) },
  };
}

async function safeFailure(run: () => Promise<unknown>, stage: PreparationStep) {
  try { return await run(); } catch (error) { throw preparationFailure(error, stage); }
}

describe.each(cases)("strict $stage response contract", (scenario) => {
  it("requests a supported closed JSON object schema only once", async () => {
    const model = modelResponse(JSON.stringify(scenario.output));
    expect(await scenario.run(model)).toMatchObject(scenario.result);
    expect(model.messages.create).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      max_tokens: scenario.stage === "specification" ? 4096 : scenario.stage === "clarification" ? 400 : 300,
      output_config: { format: { type: "json_schema", schema: expect.objectContaining({
        type: "object", additionalProperties: false,
        required: Object.keys(scenario.output),
        properties: expect.objectContaining(Object.fromEntries(Object.entries(scenario.properties).map(([key, value]) => [key, expect.objectContaining(value)]))),
      }) } },
    }));
    const format = model.messages.create.mock.calls[0][0].output_config.format;
    expect(JSON.stringify(format)).not.toMatch(/"(?:minimum|maximum|minLength|maxLength|minItems|maxItems)":/);
  });

  it("finds output after thinking and other non-text blocks", async () => {
    const model = modelResponse(JSON.stringify(scenario.output), "end_turn", [
      { type: "thinking", text: "private internal content" }, { type: "redacted_thinking" },
    ]);
    expect(await scenario.run(model)).toMatchObject(scenario.result);
  });

  it.each(["refusal", "max_tokens", "stop_sequence", "tool_use", "pause_turn", "model_context_window_exceeded", "future_stop", null])(
    "rejects a valid-looking object when the response stopped with %s", async (stopReason) => {
      const model = modelResponse(JSON.stringify(scenario.output), stopReason);
      await expect(safeFailure(() => scenario.run(model), scenario.stage)).rejects.toMatchObject({
        code: "preparation_response_invalid",
        diagnostic: { stage: scenario.stage, errorName: "PreparationResponseError", reason: stopReason === "refusal" ? "refused_response" : "incomplete_response" },
      });
      expect(model.messages.create).toHaveBeenCalledTimes(1);
    },
  );

  it("rejects an absent completion receipt", async () => {
    const model = { messages: { create: vi.fn().mockResolvedValue({ content: [{ type: "text", text: JSON.stringify(scenario.output) }] }) } };
    await expect(safeFailure(() => scenario.run(model), scenario.stage)).rejects.toMatchObject({ diagnostic: { reason: "incomplete_response" } });
  });

  it.each(["", "  "])("distinguishes missing text from malformed JSON: %s", async (text) => {
    const model = modelResponse(text);
    await expect(safeFailure(() => scenario.run(model), scenario.stage)).rejects.toMatchObject({ diagnostic: { reason: "empty_text" } });
  });

  it.each(["private output", "```json\n{}\n```", "{} {}", '{"unfinished":', "An explanation followed by {}"])(
    "rejects malformed, wrapped or multiple documents without retaining their text: %s", async (text) => {
      const model = modelResponse(text);
      try {
        await safeFailure(() => scenario.run(model), scenario.stage);
        expect.fail("Invalid model output was accepted");
      } catch (error) {
        expect(error).toMatchObject({ code: "preparation_response_invalid", diagnostic: { reason: "invalid_json" } });
        expect(JSON.stringify(error)).not.toContain(text);
      }
    },
  );

  it("rejects a second JSON document in a later text block", async () => {
    const model = modelResponse("{}", "end_turn", [{ type: "text", text: JSON.stringify(scenario.output) }]);
    await expect(safeFailure(() => scenario.run(model), scenario.stage)).rejects.toMatchObject({ diagnostic: { reason: "invalid_json" } });
  });

  it.each([null, [], {}, { unexpected: "field" }])("rejects a wrong object shape: %j", async (value) => {
    const model = modelResponse(JSON.stringify(value));
    await expect(safeFailure(() => scenario.run(model), scenario.stage)).rejects.toMatchObject({ diagnostic: { reason: "invalid_shape" } });
  });

  it("rejects unexpected properties", async () => {
    const model = modelResponse(JSON.stringify({ ...scenario.output, extra: "unrequested" }));
    await expect(safeFailure(() => scenario.run(model), scenario.stage)).rejects.toMatchObject({ diagnostic: { reason: "invalid_shape" } });
  });

  it.each(scenario.invalidValues)("enforces local business validation: %j", async (value) => {
    const model = modelResponse(JSON.stringify(value));
    await expect(safeFailure(() => scenario.run(model), scenario.stage)).rejects.toMatchObject({ diagnostic: { reason: "invalid_values" } });
  });
});

it("keeps legacy advisory request formats unchanged", async () => {
  const classifier = modelResponse(JSON.stringify(classification));
  const clarification = modelResponse('["Who is the audience?"]');
  const planner = modelResponse(JSON.stringify(plan));
  expect((await classifyIdea(context, classifier)).lane).toBe("software");
  expect(await generateClarifyingQuestions(context.idea, clarification)).toEqual(["Who is the audience?"]);
  expect(await generateBuildPlan(context.idea, planner)).toEqual(plan);
  for (const model of [classifier, clarification, planner]) {
    expect(model.messages.create.mock.calls[0][0]).not.toHaveProperty("output_config");
  }
  expect(clarification.messages.create.mock.calls[0][0].system).toContain("JSON array");
  expect(planner.messages.create.mock.calls[0][0].max_tokens).toBe(1024);
});

it("normalises strict lane casing while keeping advisory case behaviour", async () => {
  const response = JSON.stringify({ ...classification, lane: " Software " });
  expect((await classifyIdea(context, modelResponse(response), { strict: true })).lane).toBe("software");
  expect((await classifyIdea(context, modelResponse(response))).lane).toBe("unknown");
});

it("records only the typed allowlisted response reason without provider details", () => {
  const original = Object.assign(new PreparationResponseError("invalid_json"), {
    message: "private provider response", name: "private dynamic error name", headers: { private: "header" },
  });
  const failure = preparationFailure(original, "specification");
  expect(failure.diagnostic).toEqual({ stage: "specification", errorName: "PreparationResponseError", reason: "invalid_json" });
  expect(JSON.stringify(failure)).not.toContain("private");
  expect(failure).not.toHaveProperty("cause");
});

it("does not promote untyped or tampered response reasons into diagnostics", () => {
  const spoofed = Object.assign(new SyntaxError("private"), { reason: "invalid_json" });
  expect(preparationFailure(spoofed, "clarification").diagnostic).not.toHaveProperty("reason");
  const tampered = Object.assign(new PreparationResponseError("invalid_json"), { reason: "private content" });
  expect(preparationFailure(tampered, "clarification").diagnostic).not.toHaveProperty("reason");
});

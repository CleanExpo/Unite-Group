// src/lib/brand/voice-rules.test.ts
// Note: plan specified `import { describe, it, expect } from "vitest"` but this
// repo uses Jest (jest.config.js, ts-jest preset). Jest exposes describe/it/expect
// as globals with the same API surface used here, so the import is omitted.
import { VOICE_RULES, lintSentence } from "./voice-rules";

describe("voice rules — each rule matches its positives and skips its negatives", () => {
  for (const rule of VOICE_RULES) {
    describe(rule.id, () => {
      for (const ex of rule.positiveExamples) {
        it(`flags: ${ex.slice(0, 60)}…`, () => {
          const hits = lintSentence(ex);
          expect(hits.some((h) => h.ruleId === rule.id)).toBe(true);
        });
      }
      for (const ex of rule.negativeExamples) {
        it(`spares: ${ex.slice(0, 60)}…`, () => {
          const hits = lintSentence(ex);
          expect(hits.some((h) => h.ruleId === rule.id)).toBe(false);
        });
      }
    });
  }
});

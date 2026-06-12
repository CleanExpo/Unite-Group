// tests/developers/branch-ticket-resolver.spec.ts
import { describe, it, expect } from "@jest/globals";
import { extractLinearKey } from "@/lib/developers/branch-ticket-resolver";

describe("extractLinearKey", () => {
  it("pulls RA-3013 from feat/ra-3013-turnstile", () => {
    expect(extractLinearKey("feat/ra-3013-turnstile")).toBe("RA-3013");
  });
  it("pulls CCW-160 from fix/ccw-160-prisma-alembic", () => {
    expect(extractLinearKey("fix/ccw-160-prisma-alembic")).toBe("CCW-160");
  });
  it("pulls UNI-42 from uni-42-onboarding-start", () => {
    expect(extractLinearKey("uni-42-onboarding-start")).toBe("UNI-42");
  });
  it("returns null for unrelated branch names", () => {
    expect(extractLinearKey("main")).toBeNull();
    expect(extractLinearKey("feat/new-button")).toBeNull();
    expect(extractLinearKey("hotfix")).toBeNull();
  });
  it("handles uppercased input", () => {
    expect(extractLinearKey("feat/RA-3013-turnstile")).toBe("RA-3013");
  });
  it("ignores numbers that aren't preceded by 2-4 letter prefix", () => {
    expect(extractLinearKey("feat/123-something")).toBeNull();
  });
});

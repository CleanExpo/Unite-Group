/**
 * Synthex witness receiver — CI smoke test (Flywheel C2).
 *
 * Pins the pure mapping layer the /api/events route is built on: event
 * validation, business-slug resolution (incl. aliases), and the
 * agent_actions insert shape. Failures here mean Synthex events would be
 * rejected or mis-attributed, and /empire would silently stop witnessing.
 */

import {
  resolveBusinessSlug,
  summariseEvent,
  synthexEventSchema,
  toAgentActionInsert,
} from "../../src/lib/integrations/synthex-events"

const VALID_EVENT = {
  type: "content.published",
  source: "synthex" as const,
  timestamp: "2026-07-09T07:00:00.000Z",
  orgSlug: "carsi",
  userId: "user-1",
  platform: "linkedin",
  postId: "post-123",
}

describe("synthexEventSchema", () => {
  it("accepts a connector-shaped content.published event", () => {
    const parsed = synthexEventSchema.safeParse(VALID_EVENT)
    expect(parsed.success).toBe(true)
  })

  it("accepts unknown event types (never drop a fact)", () => {
    const parsed = synthexEventSchema.safeParse({
      ...VALID_EVENT,
      type: "something.new",
    })
    expect(parsed.success).toBe(true)
  })

  it("rejects wrong source, missing type, and bad timestamps", () => {
    expect(
      synthexEventSchema.safeParse({ ...VALID_EVENT, source: "hermes" }).success
    ).toBe(false)
    expect(
      synthexEventSchema.safeParse({ ...VALID_EVENT, type: "" }).success
    ).toBe(false)
    expect(
      synthexEventSchema.safeParse({ ...VALID_EVENT, timestamp: "yesterday" })
        .success
    ).toBe(false)
  })
})

describe("resolveBusinessSlug", () => {
  it("passes through matching slugs and applies aliases", () => {
    expect(resolveBusinessSlug("carsi")).toBe("carsi")
    expect(resolveBusinessSlug("restoreassist")).toBe("restoreassist")
    expect(resolveBusinessSlug("ccw")).toBe("ccw-crm")
    expect(resolveBusinessSlug("nrpg")).toBe("dr-nrpg")
  })

  it("returns null for absent or blank slugs", () => {
    expect(resolveBusinessSlug(undefined)).toBeNull()
    expect(resolveBusinessSlug("  ")).toBeNull()
  })
})

describe("toAgentActionInsert", () => {
  it("lands a witnessed fact: source synthex, status done, resolved at event time", () => {
    const parsed = synthexEventSchema.parse(VALID_EVENT)
    const insert = toAgentActionInsert(parsed, "business-uuid")

    expect(insert.source).toBe("synthex")
    expect(insert.action_type).toBe("content.published")
    expect(insert.status).toBe("done")
    expect(insert.resolved_at).toBe(VALID_EVENT.timestamp)
    expect(insert.business_id).toBe("business-uuid")
    expect(insert.payload).toMatchObject({ postId: "post-123" })
  })

  it("keeps unresolved brands witnessed with a null business_id", () => {
    const parsed = synthexEventSchema.parse({ ...VALID_EVENT, orgSlug: undefined })
    const insert = toAgentActionInsert(parsed, null)
    expect(insert.business_id).toBeNull()
  })

  it("summarises known types for the activity feed", () => {
    const parsed = synthexEventSchema.parse(VALID_EVENT)
    expect(summariseEvent(parsed)).toBe("Synthex published a linkedin post for carsi")
  })
})

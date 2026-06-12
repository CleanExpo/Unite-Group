// tests/developers/activity-aggregator.spec.ts
import { describe, it, expect } from "@jest/globals";
import { aggregateRollingWindow } from "@/lib/developers/activity-aggregator";

describe("aggregateRollingWindow", () => {
  it("rolls per-commit timestamps into per-day counts in IST", () => {
    const commits = [
      { committed_at: "2026-05-12T07:00:00Z" }, // 2026-05-12 in Asia/Karachi (UTC+5)
      { committed_at: "2026-05-12T20:00:00Z" }, // 2026-05-13 in Asia/Karachi
      { committed_at: "2026-05-11T05:00:00Z" }, // 2026-05-11
    ];
    const result = aggregateRollingWindow(commits, "Asia/Karachi", 14, new Date("2026-05-13T00:00:00Z"));
    const map = Object.fromEntries(result.map((r) => [r.date, r.count]));
    expect(map["2026-05-11"]).toBe(1);
    expect(map["2026-05-12"]).toBe(1);
    expect(map["2026-05-13"]).toBe(1);
  });

  it("returns exactly N days with zero-fill", () => {
    const result = aggregateRollingWindow([], "UTC", 14, new Date("2026-05-13T00:00:00Z"));
    expect(result).toHaveLength(14);
    expect(result.every((r) => r.count === 0)).toBe(true);
  });

  it("the returned array is in ascending date order", () => {
    const result = aggregateRollingWindow([], "UTC", 5, new Date("2026-05-13T00:00:00Z"));
    expect(result.map((r) => r.date)).toEqual([
      "2026-05-09", "2026-05-10", "2026-05-11", "2026-05-12", "2026-05-13",
    ]);
  });
});

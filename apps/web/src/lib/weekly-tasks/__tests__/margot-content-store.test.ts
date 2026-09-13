import { createClient } from "@supabase/supabase-js";
import { expect, it, vi } from "vitest";
import { createContentReviewStore } from "../margot-content-review.server";
import type { MargotLiveDatabase } from "../margot-private-storage";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(), getUser: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));
it("filters more than 1000 unrelated historical decisions out at the database boundary", async () => {
  const current = { batchId: "synthetic-current", version: 2, packetSHA256: "a".repeat(64) };
  const historical = Array.from({ length: 1001 }, (_, i) => ({ id: String(i), cells: { batchId: "old" } }));
  const fetcher = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    expect(url.searchParams.get("owner_id")).toBe("eq.owner");
    expect(url.searchParams.get("database_id")).toBe("eq.collection");
    expect(url.searchParams.get("archived_at")).toBe("is.null");
    expect(url.searchParams.get("cells->>kind")).toBe("eq.margot-content-review-event");
    const scoped = url.searchParams.get("cells->>batchId") === `eq.${current.batchId}` && url.searchParams.get("cells->>version") === "eq.2" && url.searchParams.get("cells->>packetSHA256") === `eq.${current.packetSHA256}`;
    return new Response(JSON.stringify(scoped ? [] : historical), { status: 200, headers: { "Content-Type": "application/json" } });
  });
  const client = createClient<MargotLiveDatabase>("https://synthetic.supabase.co", "synthetic-key", { global: { fetch: fetcher }, auth: { persistSession: false, autoRefreshToken: false } });
  const result = await createContentReviewStore(client).listEvents("owner", "collection", current);
  expect(result.error).toBeNull(); expect(result.data).toEqual([]); expect(fetcher).toHaveBeenCalledTimes(1);
});

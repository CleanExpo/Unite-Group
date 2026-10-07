import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { acceptedBundle } from "@/lib/synthex/__tests__/import-fixture";

vi.mock("@/lib/supabase/server", () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}));
vi.mock("@/lib/error-reporting", () => ({
  sanitiseError: (_error: unknown, message: string) => message,
}));
vi.mock("@/lib/synthex/import-projects", () => ({
  getImportProjects: vi.fn(),
}));

import { createClient, getUser } from "@/lib/supabase/server";
import { getImportProjects } from "@/lib/synthex/import-projects";
import { GET, POST } from "../route";

const rows = new Map<string, Record<string, unknown>>();
const upsert = vi.fn(async (row: Record<string, unknown>) => {
  if (!rows.has(row.id as string)) rows.set(row.id as string, row);
  return { error: null };
});
const filters: Record<string, string> = {};
const single = vi.fn(async () => {
  const row = rows.get(filters.id);
  return {
    data: row?.founder_id === filters.founder_id ? row : null,
    error: null,
  };
});
const eq = vi.fn((field: string, value: string) => {
  filters[field] = value;
  return { eq, single };
});
const select = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ upsert, select }));

function request(body: unknown) {
  return new Request("https://unit.test/api/founder/opportunities/import", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
const payload = () => ({
  bundle: acceptedBundle(),
  targetRepository: "CleanExpo/Synthex",
  previewOnly: false,
});

describe("/api/founder/opportunities/import", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.clearAllMocks();
    rows.clear();
    vi.mocked(getUser).mockResolvedValue({ id: "founder-1" } as Awaited<
      ReturnType<typeof getUser>
    >);
    vi.mocked(createClient).mockResolvedValue({ from } as unknown as Awaited<
      ReturnType<typeof createClient>
    >);
    vi.mocked(getImportProjects).mockReturnValue([
      { name: "synthex", repository: "CleanExpo/Synthex" },
    ]);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps a stored association conflict to 409 with one redacted event and no overwrite", async () => {
    const saved = await POST(request(payload()));
    const opportunity = (await saved.json()).opportunity;
    const row = rows.get(opportunity.id)!;
    row.additional_data = {
      synthexImport: { privateObservation: "synthetic private data" },
    };
    const before = JSON.stringify(row);
    const conflict = await POST(request(payload()));
    expect(conflict.status).toBe(409);
    expect(conflict.headers.get("cache-control")).toBe("no-store");
    expect(JSON.stringify(row)).toBe(before);
    expect(console.warn).toHaveBeenCalledExactlyOnceWith({
      event: "synthex_import_association_conflict",
      opportunityId: opportunity.id,
      reason: "association_invalid",
    });
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain(
      "synthetic private",
    );
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain(
      "founder-1",
    );
  });

  it("authenticates GET and POST before loading projects or parsing bodies", async () => {
    vi.mocked(getUser).mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    const response = await POST(request(payload()));
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(getImportProjects).not.toHaveBeenCalled();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns only local registry planning references", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      projects: [{ name: "synthex", repository: "CleanExpo/Synthex" }],
    });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("validates preview without constructing a database client", async () => {
    const response = await POST(request({ ...payload(), previewOnly: true }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      preview: {
        executionBlocked: true,
        opportunity: { stage: "blocked_review", status: "blocked_review" },
      },
    });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("rejects unknown projects, extra founder data, and incomplete or forged bundles without writes", async () => {
    const invalid = payload();
    Object.assign(invalid.bundle.opportunity, { probability: 100 });
    for (const body of [
      { ...payload(), targetRepository: "unknown/repo" },
      { ...payload(), founderId: "founder-2" },
      {
        ...payload(),
        additional_data: { synthexImport: { projectId: "caller-project" } },
      },
      invalid,
    ]) {
      expect((await POST(request(body))).status).toBe(400);
    }
    expect(createClient).not.toHaveBeenCalled();
  });

  it("rejects oversized input before persistence", async () => {
    const response = await POST(
      new Request("https://unit.test/import", {
        method: "POST",
        body: "x".repeat(300_001),
      }),
    );
    expect(response.status).toBe(413);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("rejects a malformed URL as invalid input without throwing or querying", async () => {
    const body = payload();
    body.bundle.proposal.sources[0].url = "not-a-url";
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("saves once with atomic ignore-duplicate and founder-scoped read-back", async () => {
    const first = await POST(request(payload()));
    const retry = await POST(request(payload()));
    expect(first.status).toBe(200);
    expect(retry.status).toBe(200);
    expect(rows.size).toBe(1);
    expect(from).toHaveBeenCalledWith("crm_opportunities");
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        founder_id: "founder-1",
        stage: "blocked_review",
        status: "blocked_review",
        value_amount: null,
      }),
      { onConflict: "id", ignoreDuplicates: true },
    );
    expect(eq).toHaveBeenCalledWith("founder_id", "founder-1");
    const firstData = await first.json();
    expect(firstData.opportunity).toMatchObject({
      source: "synthex",
      probability: null,
    });
    const changed = payload();
    changed.bundle.revision += 1;
    expect((await POST(request(changed))).status).toBe(409);
  });

  it("does not read another founder row, and sanitises write errors", async () => {
    await POST(request(payload()));
    for (const row of rows.values()) row.founder_id = "founder-2";
    expect((await POST(request(payload()))).status).toBe(500);
    upsert.mockResolvedValueOnce({
      error: { message: "secret database detail" },
    } as never);
    const response = await POST(request(payload()));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Failed to import Synthex opportunity",
    });
  });
});

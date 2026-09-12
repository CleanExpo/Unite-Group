import { describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import legacy from "./margot-first-five.fixture.json";
import {
  exportMargotPrivatePacket,
  ingestMargotPrivatePacket,
} from "../margot-packet-ingestion.operator";
import {
  MARGOT_COLLECTION_MARKER,
  type MargotLiveDatabase,
} from "../margot-private-storage";

const owner = "11111111-1111-4111-8111-111111111111";
const collectionId = "22222222-2222-4222-8222-222222222222";
const rowId = "33333333-3333-4333-8333-333333333333";
const source = () => ({
  ...structuredClone(legacy),
  localPath: "/private/must-not-export",
  episodes: legacy.episodes.map((episode, index) => ({
    ...episode,
    productionStatus: index
      ? "rendered-draft-pending-review"
      : episode.productionStatus,
    videoId: String(index + 1).repeat(32),
    providerResponse: { secret: "not-display" },
  })),
});
function database() {
  const rows = new Map<string, Record<string, unknown>>();
  const writes: Array<{
    method: string;
    url: URL;
    body: Record<string, unknown>;
  }> = [];
  let conflict = false;
  let uncertain = false;
  let wrongOwner = false;
  let failVersionRead = false;
  let uncertainInsert = false;
  let bootstrapRace = false;
  let rejectedUpdate = false;
  const transport = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? "GET";
      if (url.pathname.endsWith("/user"))
        return new Response(JSON.stringify({ id: owner }), { status: 200 });
      expect(url.searchParams.get("owner_id")).toBe(
        method === "POST" ? null : `eq.${owner}`,
      );
      if (url.pathname.endsWith("/nexus_databases"))
        return new Response(
          JSON.stringify({
            id: collectionId,
            owner_id: wrongOwner ? rowId : owner,
            name: "Synthetic",
            description: MARGOT_COLLECTION_MARKER,
          }),
        );
      if (method !== "POST") {
        expect(url.searchParams.get("database_id")).toBe(`eq.${collectionId}`);
        expect(url.searchParams.get("archived_at")).toBe("is.null");
      }
      const id = url.searchParams.get("id")?.slice(3);
      if (method === "GET") {
        if (failVersionRead && id !== collectionId && rows.has(id ?? ""))
          return new Response("{}", { status: 503 });
        return new Response(JSON.stringify(rows.get(id ?? "") ?? null));
      }
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      writes.push({ method, url, body });
      if (method === "POST") {
        expect(body.owner_id).toBe(owner);
        expect(body.database_id).toBe(collectionId);
        if (rows.has(String(body.id)))
          return new Response(JSON.stringify({ message: "duplicate" }), {
            status: 409,
          });
        if (bootstrapRace && body.id === collectionId) {
          rows.set(collectionId, {
            ...body,
            cells: { kind: "concurrent synthetic pointer" },
          });
          return new Response("{}", { status: 409 });
        }
        rows.set(String(body.id), body);
        if (uncertainInsert) return new Response("{}", { status: 500 });
        return new Response(JSON.stringify([body]), { status: 201 });
      }
      expect(method).toBe("PATCH");
      expect(url.searchParams.get("cells->>revision")).toBe("eq.1");
      expect(url.searchParams.get("cells->>kind")).toBe(
        "eq.margot-weekly-active-pointer",
      );
      if (conflict) return new Response("[]");
      if (rejectedUpdate) return new Response("{}", { status: 500 });
      rows.set(id!, { ...rows.get(id!), ...body });
      if (uncertain)
        return new Response(JSON.stringify({ message: "uncertain response" }), {
          status: 500,
        });
      return new Response(JSON.stringify([rows.get(id!)]));
    },
  );
  const client = createClient<MargotLiveDatabase>(
    "https://synthetic.invalid",
    "synthetic-anon-key",
    {
      global: { fetch: transport },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  vi.spyOn(client.auth, "getUser").mockResolvedValue({
    data: { user: { id: owner } },
    error: null,
  } as never);
  const input = {
    client,
    collectionId,
    rowId,
    batchId: "synthetic-batch",
    version: 1,
    sourcePacket: source(),
    sourceManifestSHA256: "a".repeat(64),
    expectedRevision: null as number | null,
  };
  return {
    rows,
    writes,
    transport,
    client,
    input,
    setConflict: () => {
      conflict = true;
    },
    setUncertain: () => {
      uncertain = true;
    },
    setWrongOwner: () => {
      wrongOwner = true;
    },
    setFailVersionRead: () => {
      failVersionRead = true;
    },
    setUncertainInsert: () => {
      uncertainInsert = true;
    },
    setBootstrapRace: () => {
      bootstrapRace = true;
    },
    setRejectedUpdate: () => {
      rejectedUpdate = true;
    },
  };
}

describe("allowlisted local private export", () => {
  it("strips private implementation fields while preserving exact script and caption wording", () => {
    const input = source();
    input.episodes[1].script = "  Exact script\n";
    input.episodes[1].caption = "  Exact caption\n";
    const packet = exportMargotPrivatePacket(input);
    expect(packet.episodes[1]).toMatchObject({
      script: "  Exact script\n",
      caption: "  Exact caption\n",
      media: { kind: "generated_draft" },
      releaseApproval: "pending",
    });
    expect(JSON.stringify(packet)).not.toMatch(
      /localPath|providerResponse|not-display/,
    );
    expect(packet.releaseEligible).toBe(false);
  });
  it("rejects an incompatible source status rather than inventing approval", () => {
    const input = source();
    input.episodes[1].productionStatus = "published";
    expect(() => exportMargotPrivatePacket(input)).toThrow();
  });
});

describe("private pointer ingestion with mocked authenticated transport", () => {
  it("inserts content then pointer, confirms both and never changes existing content", async () => {
    const f = database();
    const result = await ingestMargotPrivatePacket(f.input);
    expect(result).toMatchObject({
      status: "confirmed",
      pointerRevision: 1,
      previousActive: null,
      releaseEligible: false,
    });
    expect(f.writes.map((item) => item.body.id)).toEqual([rowId, collectionId]);
    await ingestMargotPrivatePacket(f.input);
    expect(f.writes).toHaveLength(2);
  });
  it("uses server-side revision CAS and preserves the prior pointer on conflict", async () => {
    const f = database();
    await ingestMargotPrivatePacket(f.input);
    const before = structuredClone(f.rows.get(collectionId));
    f.setConflict();
    await expect(
      ingestMargotPrivatePacket({
        ...f.input,
        rowId: "44444444-4444-4444-8444-444444444444",
        version: 2,
        expectedRevision: 1,
      }),
    ).rejects.toThrow("Pointer revision conflict");
    expect(f.rows.get(collectionId)).toEqual(before);
    expect(f.rows.has(rowId)).toBe(true);
  });
  it("reconciles an uncertain update by exact pointer readback without a retry write", async () => {
    const f = database();
    await ingestMargotPrivatePacket(f.input);
    f.setUncertain();
    expect(
      await ingestMargotPrivatePacket({
        ...f.input,
        rowId: "44444444-4444-4444-8444-444444444444",
        version: 2,
        expectedRevision: 1,
      }),
    ).toMatchObject({ status: "confirmed", pointerRevision: 2 });
    expect(f.writes.filter((item) => item.method === "PATCH")).toHaveLength(1);
  });
  it("does no storage operations for an unauthenticated caller", async () => {
    const f = database();
    vi.mocked(f.client.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    } as never);
    await expect(ingestMargotPrivatePacket(f.input)).rejects.toThrow(
      "Authentication",
    );
    expect(f.transport).not.toHaveBeenCalled();
  });
});

it("refuses a different collection owner before any private writes", async () => {
  const f = database();
  f.setWrongOwner();
  await expect(ingestMargotPrivatePacket(f.input)).rejects.toThrow("not owned");
  expect(f.writes).toHaveLength(0);
});
it("never overwrites an existing version identity with different content", async () => {
  const f = database();
  await ingestMargotPrivatePacket(f.input);
  const revised = source();
  revised.episodes[1].script = "Different synthetic version";
  await expect(
    ingestMargotPrivatePacket({
      ...f.input,
      expectedRevision: 1,
      sourcePacket: revised,
    }),
  ).rejects.toThrow("identity conflict");
  expect(f.writes).toHaveLength(2);
});
it("a failed content readback leaves the old complete pointer and unused new content intact", async () => {
  const f = database();
  await ingestMargotPrivatePacket(f.input);
  const before = structuredClone(f.rows.get(collectionId));
  f.setFailVersionRead();
  await expect(
    ingestMargotPrivatePacket({
      ...f.input,
      rowId: "44444444-4444-4444-8444-444444444444",
      version: 2,
      expectedRevision: 1,
    }),
  ).rejects.toThrow("unconfirmed");
  expect(f.rows.get(collectionId)).toEqual(before);
  expect(f.rows.has("44444444-4444-4444-8444-444444444444")).toBe(true);
  expect(f.writes.filter((item) => item.method === "PATCH")).toHaveLength(0);
});
it("reconciles uncertain content and bootstrap inserts without repeating either write", async () => {
  const f = database();
  f.setUncertainInsert();
  expect(await ingestMargotPrivatePacket(f.input)).toMatchObject({
    status: "confirmed",
  });
  expect(f.writes.map((item) => item.body.id)).toEqual([rowId, collectionId]);
});

it("a concurrent different bootstrap pointer is never overwritten", async () => {
  const f = database();
  f.setBootstrapRace();
  await expect(ingestMargotPrivatePacket(f.input)).rejects.toThrow(
    "concurrent conflict",
  );
  expect(f.rows.get(collectionId)?.cells).toEqual({
    kind: "concurrent synthetic pointer",
  });
  expect(f.writes.filter((item) => item.method === "PATCH")).toHaveLength(0);
});
it("authentication errors reject even an accompanying user object", async () => {
  const f = database();
  vi.mocked(f.client.auth.getUser).mockResolvedValue({
    data: { user: { id: owner } },
    error: new Error("untrusted auth"),
  } as never);
  await expect(ingestMargotPrivatePacket(f.input)).rejects.toThrow(
    "Authentication",
  );
  expect(f.transport).not.toHaveBeenCalled();
});
it("a failed update with nonmatching readback remains unconfirmed without retrying", async () => {
  const f = database();
  await ingestMargotPrivatePacket(f.input);
  const previous = structuredClone(f.rows.get(collectionId));
  f.setRejectedUpdate();
  await expect(
    ingestMargotPrivatePacket({
      ...f.input,
      rowId: "44444444-4444-4444-8444-444444444444",
      version: 2,
      expectedRevision: 1,
    }),
  ).rejects.toThrow("unconfirmed");
  expect(f.rows.get(collectionId)).toEqual(previous);
  expect(f.writes.filter((item) => item.method === "PATCH")).toHaveLength(1);
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { acceptedBundle } from "./import-fixture";
import {
  importSynthexOpportunity,
  previewSynthexOpportunity,
  type OpportunityImportStore,
} from "../opportunity-import";
import type { Tables } from "@/types/database";

const projects = [{ name: "synthex", repository: "CleanExpo/Synthex" }];

function memoryStore() {
  const rows = new Map<string, Tables<"crm_opportunities">>();
  const store: OpportunityImportStore = {
    insertIgnoringDuplicate: vi.fn(async (row) => {
      if (!rows.has(row.id!))
        rows.set(
          row.id!,
          JSON.parse(JSON.stringify(row)) as Tables<"crm_opportunities">,
        );
    }),
    findScoped: vi.fn(async (id, founderId) => {
      const row = rows.get(id);
      return row?.founder_id === founderId ? row : null;
    }),
  };
  return { store, rows };
}

describe("Synthex opportunity import public service", () => {
  it("persists the canonical project association across JSON serialization and retry", async () => {
    const { store, rows } = memoryStore();
    const args = {
      bundle: acceptedBundle(),
      targetRepository: "CleanExpo/Synthex",
      projects,
      founderId: "founder-1",
      store,
    };
    const preview = previewSynthexOpportunity(
      args.bundle,
      args.targetRepository,
      projects,
    );
    const expected = {
      version: 1,
      projectId: "synthex",
      repository: "CleanExpo/Synthex",
      packetId: args.bundle.packetId,
      revision: args.bundle.revision,
      digest: preview.opportunity.source_detail.match(
        /sha256 ([a-f0-9]{64})/,
      )![1],
      executionBlocked: true,
    };
    expect(preview.opportunity).toMatchObject({
      additional_data: { synthexImport: expected },
    });
    const first = await importSynthexOpportunity(args);
    rows.set(
      first.opportunity.id,
      JSON.parse(JSON.stringify(first.opportunity)),
    );
    const retry = await importSynthexOpportunity(args);
    expect(retry.opportunity).toMatchObject({
      additional_data: { synthexImport: expected },
    });
    expect(rows.size).toBe(1);
  });

  it("previews an accepted complete proposal with no economics or persistence", () => {
    const result = previewSynthexOpportunity(
      acceptedBundle(),
      "CleanExpo/Synthex",
      projects,
    );
    expect(result.proposal.sources[0].url).toBe("https://example.org/article");
    expect(result.project.repository).toBe("CleanExpo/Synthex");
    expect(result.executionBlocked).toBe(true);
    expect(result.opportunity).toMatchObject({
      stage: "blocked_review",
      status: "blocked_review",
      value_amount: null,
      probability: null,
    });
  });

  it.each([
    [
      "unaccepted",
      (b: ReturnType<typeof acceptedBundle>) => {
        b.review.state = "pending";
      },
    ],
    [
      "unblocked",
      (b: ReturnType<typeof acceptedBundle>) => {
        b.executionBlocked = false;
      },
    ],
    [
      "spending",
      (b: ReturnType<typeof acceptedBundle>) => {
        b.proposal.spendBoundary.maxSpend = 50;
      },
    ],
    [
      "validated demand",
      (b: ReturnType<typeof acceptedBundle>) => {
        b.proposal.demandValidated = true;
      },
    ],
    [
      "validated revenue",
      (b: ReturnType<typeof acceptedBundle>) => {
        b.proposal.revenueValidated = true;
      },
    ],
    [
      "missing evidence",
      (b: ReturnType<typeof acceptedBundle>) => {
        b.proposal.uniteEvidence = [];
      },
    ],
    [
      "invalid date",
      (b: ReturnType<typeof acceptedBundle>) => {
        b.proposal.sources[0].capturedAt = "yesterday";
      },
    ],
    [
      "unsafe URL",
      (b: ReturnType<typeof acceptedBundle>) => {
        b.proposal.sources[0].url = "javascript:alert(1)";
      },
    ],
    [
      "credential URL",
      (b: ReturnType<typeof acceptedBundle>) => {
        b.proposal.sources[0].url = "https://user:password@example.org/article";
      },
    ],
    [
      "forged economics",
      (b: ReturnType<typeof acceptedBundle>) => {
        Object.assign(b.opportunity, { value_amount: 90000 });
      },
    ],
    [
      "source disagreement",
      (b: ReturnType<typeof acceptedBundle>) => {
        b.opportunity.name = "Different proposal";
      },
    ],
  ])("rejects %s bundles", (_name, mutate) => {
    const bundle = acceptedBundle();
    mutate(bundle);
    expect(() =>
      previewSynthexOpportunity(bundle, "CleanExpo/Synthex", projects),
    ).toThrow();
  });

  it("requires the selected repository to match the bundle and local registry", () => {
    expect(() =>
      previewSynthexOpportunity(acceptedBundle(), "unknown/repo", projects),
    ).toThrow();
    expect(() =>
      previewSynthexOpportunity(acceptedBundle(), "CleanExpo/Synthex", []),
    ).toThrow();
  });

  it("bounds the next action without splitting a Unicode character", () => {
    const bundle = acceptedBundle();
    bundle.proposal.nextValidationStep = "x".repeat(499) + "😀";
    bundle.opportunity.next_action = bundle.proposal.nextValidationStep;
    expect(
      previewSynthexOpportunity(bundle, "CleanExpo/Synthex", projects)
        .opportunity.next_action,
    ).toBe("x".repeat(499));
  });

  it("rejects proposals exceeding the shared v1 UTF-8 size limit", () => {
    const bundle = acceptedBundle();
    const source = {
      ...bundle.proposal.sources[0],
      claims: Array.from({ length: 20 }, () => "界".repeat(2000)),
    };
    bundle.proposal.sources = [source, source, source];
    expect(() =>
      previewSynthexOpportunity(bundle, "CleanExpo/Synthex", projects),
    ).toThrow();
  });

  it("atomically deduplicates concurrent retries, reads back scoped rows and isolates founders", async () => {
    const { store, rows } = memoryStore();
    const args = {
      bundle: acceptedBundle(),
      targetRepository: "CleanExpo/Synthex",
      projects,
      founderId: "founder-1",
      store,
    };
    const [first, retry] = await Promise.all([
      importSynthexOpportunity(args),
      importSynthexOpportunity(args),
    ]);
    expect(first.opportunity.id).toBe(retry.opportunity.id);
    expect(rows.size).toBe(1);
    expect(first.opportunity).toMatchObject({
      founder_id: "founder-1",
      stage: "blocked_review",
      status: "blocked_review",
      source: "synthex",
      value_amount: null,
      value_currency: null,
      probability: null,
      linked_lead_id: null,
      linked_contact_id: null,
      approval_required: true,
      approval_status: "requested",
    });
    expect(first.opportunity.source_detail!.length).toBeLessThanOrEqual(500);
    expect(first.opportunity.source_detail).toContain("CleanExpo/Synthex");
    expect(store.findScoped).toHaveBeenCalledWith(
      first.opportunity.id,
      "founder-1",
    );
    const other = await importSynthexOpportunity({
      ...args,
      founderId: "founder-2",
    });
    expect(other.opportunity.id).not.toBe(first.opportunity.id);
    expect(rows.size).toBe(2);
  });

  it.each(["revision", "content"])(
    "rejects conflicting %s for an existing source packet",
    async (kind) => {
      const { store } = memoryStore();
      const args = {
        bundle: acceptedBundle(),
        targetRepository: "CleanExpo/Synthex",
        projects,
        founderId: "founder-1",
        store,
      };
      await importSynthexOpportunity(args);
      if (kind === "revision") args.bundle.revision += 1;
      else
        args.bundle.proposal.customerProblemHypothesis =
          "Changed source content.";
      await expect(importSynthexOpportunity(args)).rejects.toMatchObject({
        status: 409,
      });
    },
  );

  it("never reports success when persistence or scoped read-back fails", async () => {
    const { store } = memoryStore();
    vi.mocked(store.findScoped).mockResolvedValue(null);
    await expect(
      importSynthexOpportunity({
        bundle: acceptedBundle(),
        targetRepository: "CleanExpo/Synthex",
        projects,
        founderId: "founder-1",
        store,
      }),
    ).rejects.toThrow();
  });

  it("rejects a retry if the stored blocked record was altered or given economics", async () => {
    const { store, rows } = memoryStore();
    const args = {
      bundle: acceptedBundle(),
      targetRepository: "CleanExpo/Synthex",
      projects,
      founderId: "founder-1",
      store,
    };
    const saved = await importSynthexOpportunity(args);
    rows.get(saved.opportunity.id)!.linked_contact_id = "foreign-contact";
    await expect(importSynthexOpportunity(args)).rejects.toMatchObject({
      status: 409,
    });
  });
});

describe("Synthex reserved project association", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setup() {
    const { store, rows } = memoryStore();
    return {
      rows,
      args: {
        bundle: acceptedBundle(),
        targetRepository: "CleanExpo/Synthex",
        projects,
        founderId: "founder-1",
        store,
      },
    };
  }

  it("accepts reordered serialized associations and preserves unrelated namespaces without logging", async () => {
    const { rows, args } = setup();
    const first = await importSynthexOpportunity(args);
    const association = (
      first.opportunity.additional_data as Record<string, unknown>
    ).synthexImport as Record<string, unknown>;
    const metadata = {
      independentNamespace: { observation: "synthetic unrelated data" },
      synthexImport: Object.fromEntries(Object.entries(association).reverse()),
    };
    rows.get(first.opportunity.id)!.additional_data = JSON.parse(
      JSON.stringify(metadata),
    );
    const retry = await importSynthexOpportunity(args);
    expect(retry.opportunity.additional_data).toEqual(metadata);
    expect(rows.size).toBe(1);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it.each([
    ["version", 2, "association_invalid"],
    ["executionBlocked", false, "association_invalid"],
    ["projectId", "different-project", "association_mismatch"],
    ["repository", "CleanExpo/Other", "association_mismatch"],
    ["packetId", "different-packet", "association_mismatch"],
    ["revision", 3, "association_mismatch"],
    ["digest", "b".repeat(64), "association_mismatch"],
    ["unexpected", "synthetic private observation", "association_invalid"],
    ["revision", 0, "association_invalid"],
    ["revision", 1.5, "association_invalid"],
    ["revision", Number.MAX_SAFE_INTEGER + 1, "association_invalid"],
    ["digest", "A".repeat(64), "association_invalid"],
    ["packetId", "x".repeat(101), "association_invalid"],
    ["projectId", { id: "synthex", unexpected: true }, "association_invalid"],
  ])(
    "conflicts on altered reserved field %s without overwriting or leaking its value",
    async (key, value, reason) => {
      const { rows, args } = setup();
      const first = await importSynthexOpportunity(args);
      const row = rows.get(first.opportunity.id)!;
      const metadata = row.additional_data as Record<
        string,
        Record<string, unknown>
      >;
      metadata.synthexImport[key as string] = value;
      const before = JSON.stringify(row);
      await expect(importSynthexOpportunity(args)).rejects.toMatchObject({
        status: 409,
      });
      expect(JSON.stringify(row)).toBe(before);
      expect(console.warn).toHaveBeenCalledExactlyOnceWith({
        event: "synthex_import_association_conflict",
        opportunityId: first.opportunity.id,
        reason,
      });
    },
  );

  it.each([
    ["legacy absence", undefined, "association_missing"],
    ["missing namespace", {}, "association_missing"],
    [
      "unrelated namespace only",
      { unrelated: "synthetic other data" },
      "association_missing",
    ],
    ["null metadata", null, "association_invalid"],
    ["array metadata", [], "association_invalid"],
    ["string metadata", "synthetic private data", "association_invalid"],
    ["null namespace", { synthexImport: null }, "association_invalid"],
    ["array namespace", { synthexImport: [] }, "association_invalid"],
    [
      "string namespace",
      { synthexImport: "synthetic private data" },
      "association_invalid",
    ],
    [
      "incomplete namespace",
      { synthexImport: { version: 1 } },
      "association_invalid",
    ],
  ])(
    "conflicts on %s with one bounded event and no backfill",
    async (_name, metadata, reason) => {
      const { rows, args } = setup();
      const first = await importSynthexOpportunity(args);
      const row = rows.get(first.opportunity.id)!;
      row.additional_data =
        metadata as Tables<"crm_opportunities">["additional_data"];
      const before = JSON.stringify(row);
      await expect(importSynthexOpportunity(args)).rejects.toMatchObject({
        status: 409,
      });
      expect(JSON.stringify(row)).toBe(before);
      expect(console.warn).toHaveBeenCalledExactlyOnceWith({
        event: "synthex_import_association_conflict",
        opportunityId: first.opportunity.id,
        reason,
      });
      const logged = JSON.stringify(vi.mocked(console.warn).mock.calls);
      expect(logged).not.toContain("founder-1");
      expect(logged).not.toContain("synthetic private");
      expect(logged).not.toContain(args.bundle.proposal.title);
      expect(Buffer.byteLength(logged, "utf8")).toBeLessThan(250);
    },
  );

  it("recovers an exact retry after insertion commits but readback fails", async () => {
    const { rows, args } = setup();
    vi.mocked(args.store.findScoped).mockRejectedValueOnce(
      new Error("synthetic database read failure"),
    );
    await expect(importSynthexOpportunity(args)).rejects.toThrow(
      "synthetic database read failure",
    );
    expect(rows.size).toBe(1);
    const retry = await importSynthexOpportunity(args);
    expect(retry.opportunity.additional_data).toMatchObject({
      synthexImport: { projectId: "synthex" },
    });
    expect(rows.size).toBe(1);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("admits exactly 1024 UTF-8 association bytes and rejects one byte over before persistence", async () => {
    const { args } = setup();
    args.bundle.packetId = "界".repeat(100);
    const fixed = {
      version: 1,
      projectId: "",
      repository: args.targetRepository,
      packetId: args.bundle.packetId,
      revision: args.bundle.revision,
      digest: "a".repeat(64),
      executionBlocked: true,
    };
    const projectId = "p".repeat(
      1024 - Buffer.byteLength(JSON.stringify(fixed), "utf8"),
    );
    args.projects = [{ name: projectId, repository: args.targetRepository }];
    const preview = previewSynthexOpportunity(
      args.bundle,
      args.targetRepository,
      args.projects,
    );
    const saved = await importSynthexOpportunity(args);
    expect(saved.opportunity.additional_data).toEqual(
      preview.opportunity.additional_data,
    );
    expect(
      Buffer.byteLength(
        JSON.stringify(
          (saved.opportunity.additional_data as Record<string, unknown>)
            .synthexImport,
        ),
        "utf8",
      ),
    ).toBe(1024);
    const { store } = memoryStore();
    await expect(
      importSynthexOpportunity({
        ...args,
        store,
        projects: [
          { name: projectId + "p", repository: args.targetRepository },
        ],
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(store.insertIgnoringDuplicate).not.toHaveBeenCalled();
    expect(store.findScoped).not.toHaveBeenCalled();
  });
});

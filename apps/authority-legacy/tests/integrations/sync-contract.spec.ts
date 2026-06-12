// tests/integrations/sync-contract.spec.ts
//
// SCOPE — this is a SHAPE contract test, not a behavioural test.
// The mocks short-circuit each sync to its empty-result path; the loop
// bodies (per-repo / per-project / per-vault) are NOT exercised here.
// What this test proves: every sync function exits cleanly with the
// canonical shape `{ rowsUpserted: number; succeeded: string[]; failed:
// Array<{ error: string; ... }> }` when the input list is empty.
//
// What it does NOT prove: that the actual upserts, network calls,
// pagination, or per-entity error handling work end-to-end. Those need
// integration tests with `nock` (network) or a real sandbox DB — TBD as
// a Plan 2 follow-up.
//
// Strategy: mock `@/lib/supabase/admin` with a chainable Proxy so any
// `sb.from(...).upsert(...)` / `.update().eq()` / `.delete().lt()` call
// resolves to `{data: [], error: null}`. Each integration's `./client`
// module is mocked so the list-* helpers return empty arrays — that
// short-circuits each sync to its empty-result path without making
// any real HTTP calls or shelling out to the `op` CLI.

import { describe, it, expect } from "@jest/globals";

// ── Mock the supabase admin client ────────────────────────────────────────
// Any chain of method calls resolves to {data: [], error: null}, which is
// also `await`-able because the proxy implements `.then`.
jest.mock("@/lib/supabase/admin", () => {
  const empty = { data: [], error: null };
  const makeChainable = (): unknown =>
    new Proxy(function () {}, {
      get(_target, prop) {
        if (prop === "then") {
          // Thenable so `await sb.from(...).upsert(...)` resolves.
          return (resolve: (v: typeof empty) => void) => resolve(empty);
        }
        if (prop === Symbol.toPrimitive || prop === Symbol.iterator) {
          return undefined;
        }
        return makeChainable;
      },
      apply() {
        return makeChainable();
      },
    });
  return {
    getAdminClient: () => makeChainable(),
    supabaseAdmin: makeChainable(),
  };
});

// ── Per-integration client mocks (return empty so syncs short-circuit) ───
jest.mock("@/lib/integrations/github/client", () => ({
  octokit: {
    repos: { get: async () => ({ data: {} }) },
    pulls: { list: async () => [] },
    paginate: async () => [],
  },
  gql: async () => ({}),
  TRACKED_REPOS: [] as string[],
}));

jest.mock("@/lib/integrations/vercel/client", () => ({
  listProjects: async () => [],
  listDeployments: async () => [],
  listEnvVars: async () => [],
}));

jest.mock("@/lib/integrations/railway/client", () => ({
  gql: async () => ({}),
  listServices: async () => [],
}));

jest.mock("@/lib/integrations/digitalocean/client", () => ({
  listApps: async () => [],
  listDroplets: async () => [],
  listDatabases: async () => [],
}));

jest.mock("@/lib/integrations/supabase/client", () => ({
  listProjects: async () => [],
  listAdvisors: async () => ({ lints: [] }),
}));

jest.mock("@/lib/integrations/onepassword/client", () => ({
  // Empty vault list → sync logs "no vaults configured" and returns immediately.
  configuredVaults: () => [] as string[],
  hasConnect: () => false,
  listConnectVaults: async () => [],
  listItemsInVaultViaCli: async () => [],
  listItemsInVaultViaConnect: async () => [],
}));

jest.mock("@/lib/integrations/composio/client", () => ({
  listConnections: async () => [],
}));

// Stripe: mock the constructor so the auto-paginators yield zero items.
jest.mock("stripe", () => {
  class StripeMock {
    subscriptions = {
      list: () => ({
        [Symbol.asyncIterator]: async function* () {
          /* yield nothing */
        },
      }),
    };
    invoices = {
      list: () => ({
        [Symbol.asyncIterator]: async function* () {
          /* yield nothing */
        },
      }),
    };
  }
  return { __esModule: true, default: StripeMock };
});

// Linear sync makes a raw `fetch` GraphQL call. Stub global fetch so
// it resolves with an empty payload — each section ends up in `succeeded[]`
// with zero rows, or in `failed[]` if the schema doesn't match. Either is
// shape-compliant.
const realFetch = global.fetch;
beforeAll(() => {
  global.fetch = (async () =>
    new Response(JSON.stringify({ data: {} }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;
});
afterAll(() => {
  global.fetch = realFetch;
});

// ── Imports under test (after mocks so module-load env reads see "") ─────
import { syncGitHub } from "@/lib/integrations/github/sync";
import { syncVercel } from "@/lib/integrations/vercel/sync";
import { syncRailway } from "@/lib/integrations/railway/sync";
import { syncDigitalOcean } from "@/lib/integrations/digitalocean/sync";
import { syncSupabase } from "@/lib/integrations/supabase/sync";
import { syncOnePassword } from "@/lib/integrations/onepassword/sync";
import { syncLinear } from "@/lib/integrations/linear/sync";
import { syncStripe } from "@/lib/integrations/stripe/sync";
import { syncComposio } from "@/lib/integrations/composio/sync";

type SyncResult = {
  rowsUpserted: number;
  succeeded: string[];
  failed: Array<Record<string, unknown> & { error: string }>;
};

const allSyncs: Record<string, () => Promise<SyncResult>> = {
  syncGitHub: syncGitHub as () => Promise<SyncResult>,
  syncVercel: syncVercel as () => Promise<SyncResult>,
  syncRailway: syncRailway as () => Promise<SyncResult>,
  syncDigitalOcean: syncDigitalOcean as () => Promise<SyncResult>,
  syncSupabase: syncSupabase as () => Promise<SyncResult>,
  syncOnePassword: syncOnePassword as () => Promise<SyncResult>,
  syncLinear: syncLinear as () => Promise<SyncResult>,
  syncStripe: syncStripe as () => Promise<SyncResult>,
  syncComposio: syncComposio as () => Promise<SyncResult>,
};

describe("integration sync contract", () => {
  for (const [name, fn] of Object.entries(allSyncs)) {
    it(`${name} returns canonical {rowsUpserted, succeeded, failed} shape and does not throw without env tokens`, async () => {
      const result = await fn();

      // Shape assertions
      expect(result).toBeDefined();
      expect(typeof result.rowsUpserted).toBe("number");
      expect(result.rowsUpserted).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.succeeded)).toBe(true);
      expect(Array.isArray(result.failed)).toBe(true);

      // Every failure entry must include an `error: string` field.
      for (const f of result.failed) {
        expect(typeof f.error).toBe("string");
      }
    });
  }
});

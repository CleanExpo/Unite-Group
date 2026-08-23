import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ getUser: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));
vi.mock("@/lib/error-reporting", () => ({ captureApiError: vi.fn() }));

import { getUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { GET, POST } from "../route";

interface Result {
  data?: unknown;
  error: unknown;
}

function makeChain(results: Result[] = []) {
  const queue = [...results];
  const next = () =>
    queue.length ? queue.shift()! : { data: null, error: null };
  const chain: Record<string, unknown> = {
    from: vi.fn(() => chain),
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve(next())),
    then: (resolve: (value: unknown) => unknown) => resolve(next()),
  };
  return chain as Record<string, ReturnType<typeof vi.fn>> & { then: unknown };
}

describe("/api/campaigns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUser).mockResolvedValue({ id: "user-123" } as never);
  });

  it("GET returns eligible child brands with business keys", async () => {
    const chain = makeChain([
      {
        data: [
          {
            id: "brand-2",
            client_name: "DR Brand",
            website_url: "https://dr.example",
            logo_url: null,
            industry: "Recovery",
            business_key: "dr",
            status: "ready",
            created_at: "2026-01-01T00:00:00Z",
          },
        ],
        error: null,
      },
    ]);
    vi.mocked(createServiceClient).mockReturnValue(chain as never);

    const res = await GET();
    const body = (await res.json()) as {
      profiles: Array<{ business_key?: string }>;
    };

    expect(res.status).toBe(200);
    expect(chain.select).toHaveBeenCalledWith(
      expect.stringContaining("business_key"),
    );
    expect(chain.eq).toHaveBeenCalledWith("founder_id", "user-123");
    expect(chain.eq).toHaveBeenCalledWith("status", "ready");
    expect(body.profiles[0]?.business_key).toBe("dr");
  });

  it("POST persists the founder-owned brand profile and returns its business identity", async () => {
    const chain = makeChain([
      {
        data: {
          id: "brand-dr",
          business_key: "dr",
          client_name: "Disaster Recovery",
        },
        error: null,
      },
      {
        data: {
          id: "camp-1",
          theme: "EOFY",
          objective: "awareness",
          status: "draft",
          created_at: "2026-01-01T00:00:00Z",
        },
        error: null,
      },
    ]);
    vi.mocked(createServiceClient).mockReturnValue(chain as never);

    const res = await POST(
      new Request("http://localhost/api/campaigns", {
        method: "POST",
        body: JSON.stringify({
          brandProfileId: "brand-dr",
          theme: "EOFY",
          objective: "awareness",
          platforms: ["linkedin"],
          postCount: 3,
        }),
      }),
    );
    const body = (await res.json()) as {
      brandProfileId?: string;
      businessKey?: string;
      brandName?: string;
    };

    expect(res.status).toBe(201);
    expect(chain.eq).toHaveBeenCalledWith("id", "brand-dr");
    expect(chain.eq).toHaveBeenCalledWith("founder_id", "user-123");
    // Authorization is founder-scoped brand-profile ownership, not the
    // never-provisioned user_organizations membership table (UNI-2218).
    expect(chain.from).not.toHaveBeenCalledWith("user_organizations");
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        founder_id: "user-123",
        brand_profile_id: "brand-dr",
        theme: "EOFY",
      }),
    );
    expect(body).toMatchObject({
      brandProfileId: "brand-dr",
      businessKey: "dr",
      brandName: "Disaster Recovery",
    });
  });

  it("POST returns 401 when unauthenticated", async () => {
    vi.mocked(getUser).mockResolvedValue(null as never);

    const res = await POST(
      new Request("http://localhost/api/campaigns", {
        method: "POST",
        body: JSON.stringify({
          brandProfileId: "brand-dr",
          theme: "EOFY",
          objective: "awareness",
          platforms: ["linkedin"],
        }),
      }),
    );

    expect(res.status).toBe(401);
  });

  it("POST returns 404 when the brand profile is not owned by the founder", async () => {
    // The founder-owned ready brand profile is the authorization boundary.
    const chain = makeChain([
      { data: null, error: null },
    ]);
    vi.mocked(createServiceClient).mockReturnValue(chain as never);

    const res = await POST(
      new Request("http://localhost/api/campaigns", {
        method: "POST",
        body: JSON.stringify({
          brandProfileId: "brand-dr",
          theme: "EOFY",
          objective: "awareness",
          platforms: ["linkedin"],
        }),
      }),
    );

    expect(res.status).toBe(404);
    expect(chain.insert).not.toHaveBeenCalled();
  });

  it("POST succeeds for an owner without any user_organizations row (UNI-2218 regression)", async () => {
    // Before the fix, a missing user_organizations table made membership null
    // and the handler returned 403 for every founder. Owning a ready brand
    // profile in the org must be sufficient.
    const chain = makeChain([
      {
        data: {
          id: "brand-dr",
          business_key: "dr",
          client_name: "Disaster Recovery",
        },
        error: null,
      },
      {
        data: {
          id: "camp-1",
          theme: "EOFY",
          objective: "awareness",
          status: "draft",
          created_at: "2026-01-01T00:00:00Z",
        },
        error: null,
      },
    ]);
    vi.mocked(createServiceClient).mockReturnValue(chain as never);

    const res = await POST(
      new Request("http://localhost/api/campaigns", {
        method: "POST",
        body: JSON.stringify({
          brandProfileId: "brand-dr",
          theme: "EOFY",
          objective: "awareness",
          platforms: ["linkedin"],
        }),
      }),
    );

    expect(res.status).toBe(201);
    expect(chain.from).not.toHaveBeenCalledWith("user_organizations");
    expect(chain.insert).toHaveBeenCalled();
  });
});

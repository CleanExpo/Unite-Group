import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrandProfileSelector } from "../BrandProfileSelector";

function mockFetch(response: unknown, ok = true, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok,
      status,
      json: async () => response,
    })),
  );
}

describe("BrandProfileSelector", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads eligible child brands and returns the selected profile identity", async () => {
    const onSelect = vi.fn();
    mockFetch({
      profiles: [
        {
          id: "brand-dr",
          organization_id: "org-dr",
          client_name: "Disaster Recovery",
          website_url: "https://dr.example",
          industry: "Recovery",
          business_key: "dr",
        },
      ],
    });

    render(<BrandProfileSelector onSelect={onSelect} onScanNew={vi.fn()} />);

    expect(screen.getByText(/loading eligible child brands/i)).toBeTruthy();
    const brandButton = await screen.findByRole("button", {
      name: /disaster recovery/i,
    });
    await userEvent.click(brandButton);

    expect(fetch).toHaveBeenCalledWith("/api/campaigns");
    expect(onSelect).toHaveBeenCalledWith({
      id: "brand-dr",
      organizationId: "org-dr",
      clientName: "Disaster Recovery",
      websiteUrl: "https://dr.example",
      industry: "Recovery",
      businessKey: "dr",
    });
  });

  it("shows empty state with scan CTA when no ready child brands exist", async () => {
    const onScanNew = vi.fn();
    mockFetch({ profiles: [] });

    render(<BrandProfileSelector onSelect={vi.fn()} onScanNew={onScanNew} />);

    await screen.findByText(/no ready child brands found/i);
    await userEvent.click(
      screen.getByRole("button", { name: /scan brand dna/i }),
    );

    expect(onScanNew).toHaveBeenCalledTimes(1);
  });

  it("shows retrieval errors and can retry loading child brands", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "database unavailable" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ profiles: [] }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<BrandProfileSelector onSelect={vi.fn()} onScanNew={vi.fn()} />);

    await screen.findByText("database unavailable");
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByText(/no ready child brands found/i),
    ).toBeTruthy();
  });
});

import { exportMargotPrivatePacket } from "@/lib/weekly-tasks/margot-packet-ingestion.operator";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import fixture from "@/lib/weekly-tasks/__tests__/margot-first-five.fixture.json";
import { parseMargotWeeklyPacket } from "@/lib/weekly-tasks/margot-packet";
import { MargotWeeklyReview } from "../MargotWeeklyReview";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

describe("read-only Margot weekly review", () => {
  it("shows unconfigured source without fake counts, episodes, video or actions", () => {
    const network = vi.fn();
    vi.stubGlobal("fetch", network);
    render(<MargotWeeklyReview review={{ source: "not_configured" }} />);
    expect(screen.getByText("Weekly packet not connected")).toBeVisible();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /approve|schedule|publish|generate/i,
      }),
    ).not.toBeInTheDocument();
    expect(network).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
  it("labels a synthetic local packet as a preview, with one reference and four missing videos", () => {
    const parsed = parseMargotWeeklyPacket(fixture);
    if (!parsed.success) throw new Error("Invalid synthetic fixture");
    render(
      <MargotWeeklyReview
        review={{ source: "local_preview", packet: parsed.data }}
      />,
    );
    expect(screen.getByText("Local editorial preview")).toBeVisible();
    expect(screen.getAllByRole("article")).toHaveLength(5);
    expect(screen.getAllByText("Not rendered")).toHaveLength(4);
    const master = screen.getByRole("link", {
      name: "Open existing master in HeyGen",
    });
    expect(master).toHaveAttribute(
      "href",
      "https://app.heygen.com/videos/00000000000000000000000000000000",
    );
    expect(
      screen.getByText(/Publication authority remains pending/),
    ).toBeVisible();
    expect(screen.getByText(/Australia\/Brisbane/)).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(/five videos ready/i)).not.toBeInTheDocument();
  });
});

describe("private connected review", () => {
  function privatePacket() {
    return exportMargotPrivatePacket({
      ...fixture,
      episodes: fixture.episodes.map((item, index) => ({
        ...item,
        productionStatus: index
          ? "rendered-draft-pending-review"
          : item.productionStatus,
        videoId: String(index + 1).repeat(32),
      })),
    });
  }
  it("shows five review links, four draft labels and no release action or HTML interpretation", () => {
    const packet = privatePacket();
    packet.episodes[1].script = "<img src=x onerror=alert(1)>";
    const network = vi.fn();
    vi.stubGlobal("fetch", network);
    const { container } = render(
      <MargotWeeklyReview
        review={{
          source: "available",
          packet,
          batchId: "synthetic-week",
          version: 2,
          packetSHA256: "a".repeat(64),
          calendar: "current",
        }}
      />,
    );
    expect(
      screen.getAllByRole("link", { name: "Watch original provider version in HeyGen" }),
    ).toHaveLength(5);
    expect(
      screen.getAllByText(/Generated draft — video review pending/),
    ).toHaveLength(4);
    expect(
      screen.getByText(/5 videos available to review; 0 awaiting render/),
    ).toBeVisible();
    expect(
      screen.getByText("<img src=x onerror=alert(1)>"),
    ).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
    for (const button of screen.getAllByRole("button", { name: "Approve this version" })) expect(button).toBeDisabled();
    expect(screen.queryByRole("button", { name: /publish|schedule/i })).toBeNull();
    expect(network).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
  it("shows approved script while the new video and release remain pending", () => {
    const packet = privatePacket();
    packet.episodes[1].scriptApproval = "approved";
    render(<MargotWeeklyReview review={{ source: "available", packet, batchId: "synthetic-week", version: 2, packetSHA256: "a".repeat(64), calendar: "current" }} />);
    const draft = within(screen.getByRole("article", { name: packet.episodes[1].title }));
    expect(draft.getByText("Script review: approved. Release: pending.")).toBeVisible();
    expect(draft.getByText(/Generated draft — video review pending/)).toBeVisible();
    expect(draft.queryByText(/Previously approved reference/)).toBeNull();
    expect(draft.getByRole("button", { name: "Approve this version" })).toBeDisabled();
    expect(draft.getByRole("link", { name: "Watch original provider version in HeyGen" })).toHaveAttribute("href", `https://app.heygen.com/videos/${"2".repeat(32)}`);
  });
  it("shows an incomplete prior batch truthfully", () => {
    const packet = privatePacket();
    packet.episodes[4].media = { kind: "awaiting_render" };
    render(
      <MargotWeeklyReview
        review={{
          source: "available",
          packet,
          batchId: "synthetic-old-week",
          version: 1,
          packetSHA256: "a".repeat(64),
          calendar: "stale",
        }}
      />,
    );
    expect(
      screen.getByText(/4 videos available to review; 1 awaiting render/),
    ).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(
      "previous weekly packet",
    );
  });
  it.each(["missing", "invalid", "unavailable"] as const)(
    "shows %s without fake data",
    (source) => {
      render(<MargotWeeklyReview review={{ source }} />);
      expect(screen.getByRole("alert")).toBeVisible();
      expect(screen.queryByRole("article")).toBeNull();
    },
  );
});

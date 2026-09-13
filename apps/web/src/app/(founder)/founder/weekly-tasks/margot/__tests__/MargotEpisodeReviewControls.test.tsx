import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MargotEpisodeReviewControls } from "../MargotEpisodeReviewControls";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
const binding = { batchId: "synthetic-week", version: 2, packetSHA256: "a".repeat(64), episodeId: "episode-one" };
afterEach(() => vi.unstubAllGlobals());
describe("per-card content review", () => {
  it("keeps whole-version approval unavailable when exact playback is missing", () => {
    render(<MargotEpisodeReviewControls binding={binding} mediaAvailable={false} />);
    expect(screen.getByRole("button", { name: "Approve this version" })).toBeDisabled();
    expect(screen.getByText(/verified video.*not available/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Feedback for this version")).toBeEnabled();
  });
  it("preserves feedback after failed saves and retries the same operation once", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({ status: "unavailable" }) });
    vi.stubGlobal("fetch", fetcher);
    render(<MargotEpisodeReviewControls binding={binding} mediaAvailable={false} />);
    fireEvent.change(screen.getByLabelText("Feedback for this version"), { target: { value: "Please correct this sentence." } });
    fireEvent.click(screen.getByRole("button", { name: "Request changes" }));
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Feedback for this version")).toHaveValue("Please correct this sentence.");
    expect(screen.queryByText(/changes saved/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Request changes" }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    expect(JSON.parse(fetcher.mock.calls[0][1].body).operationId).toBe(JSON.parse(fetcher.mock.calls[1][1].body).operationId);
  });
  it("blocks duplicate clicks while the save remains pending", async () => {
    let finish!: (value: unknown) => void;
    const fetcher = vi.fn(() => new Promise(resolve => { finish = resolve; }));
    vi.stubGlobal("fetch", fetcher);
    render(<MargotEpisodeReviewControls binding={binding} mediaAvailable />);
    const button = screen.getByRole("button", { name: "Approve this version" });
    fireEvent.click(button); fireEvent.click(button);
    expect(button).toBeDisabled(); expect(fetcher).toHaveBeenCalledTimes(1);
    finish({ ok: false, status: 409, json: async () => ({ status: "stale" }) });
    await screen.findByRole("alert");
    expect(screen.queryByText(/approval saved/i)).not.toBeInTheDocument();
  });
});

it("keeps feedback but makes changed-version controls inert", () => {
  const { rerender } = render(<MargotEpisodeReviewControls binding={binding} mediaAvailable />);
  fireEvent.change(screen.getByLabelText("Feedback for this version"), { target: { value: "Keep this note." } });
  rerender(<MargotEpisodeReviewControls binding={{ ...binding, version: 3 }} mediaAvailable />);
  expect(screen.getByLabelText("Feedback for this version")).toHaveValue("Keep this note.");
  expect(screen.getByRole("button", { name: "Approve this version" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Request changes" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Reload current packet" })).toBeEnabled();
});
it("takes actions offline when saved status becomes unavailable", () => {
  const { rerender } = render(<MargotEpisodeReviewControls binding={binding} mediaAvailable />);
  rerender(<MargotEpisodeReviewControls binding={binding} mediaAvailable loadFailed />);
  expect(screen.getByText(/Saved review status unavailable/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Approve this version" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Request changes" })).toBeDisabled();
});
it("does not apply a response arriving after the packet binding changes", async () => {
  let finish!: (value: unknown) => void;
  vi.stubGlobal("fetch", vi.fn(() => new Promise(resolve => { finish = resolve; })));
  const { rerender } = render(<MargotEpisodeReviewControls binding={binding} mediaAvailable />);
  fireEvent.click(screen.getByRole("button", { name: "Approve this version" }));
  rerender(<MargotEpisodeReviewControls binding={{ ...binding, packetSHA256: "b".repeat(64) }} mediaAvailable />);
  finish({ ok: true, status: 200, json: async () => ({ status: "saved" }) });
  await waitFor(() => expect(screen.queryByText(/Saving your decision/)).not.toBeInTheDocument());
  expect(screen.queryByText(/Approval saved/)).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Approve this version" })).toBeDisabled();
});
it("does not save a delayed response after the read status fails", async () => {
  let finish!: (value: unknown) => void;
  vi.stubGlobal("fetch", vi.fn(() => new Promise(resolve => { finish = resolve; })));
  const { rerender } = render(<MargotEpisodeReviewControls binding={binding} mediaAvailable />);
  fireEvent.click(screen.getByRole("button", { name: "Approve this version" }));
  rerender(<MargotEpisodeReviewControls binding={binding} mediaAvailable loadFailed />);
  finish({ ok: true, status: 200, json: async () => ({ status: "saved" }) });
  await waitFor(() => expect(screen.queryByText(/Saving your decision/)).not.toBeInTheDocument());
  expect(screen.queryByText(/Approval saved/)).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Approve this version" })).toBeDisabled();
});
it("keeps feedback and gives a sign-in next action on401", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
  render(<MargotEpisodeReviewControls binding={binding} mediaAvailable />);
  fireEvent.change(screen.getByLabelText("Feedback for this version"), { target: { value: "Keep this feedback." } });
  fireEvent.click(screen.getByRole("button", { name: "Request changes" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Sign in again");
  expect(screen.getByLabelText("Feedback for this version")).toHaveValue("Keep this feedback.");
  expect(screen.getByRole("button", { name: "Request changes" })).toBeDisabled();
});
it.each(["operationId", "action", "packetSHA256", "version"])("rejects a saved response with a different %s", async field => {
  vi.stubGlobal("fetch", vi.fn(async (_url, options) => {
    const request = JSON.parse(options.body);
    const event = { ...request, kind: "margot-content-review-event", schemaVersion: 1, episodeSHA256: "b".repeat(64), scriptSHA256: "c".repeat(64), mediaSHA256: "d".repeat(64), videoId: "1".repeat(32), recordedAt: "2026-09-13T00:00:00.000Z", publicationApproved: false };
    event[field] = field === "version" ? 3 : field === "action" ? "request_changes" : field === "operationId" ? "99999999-9999-4999-8999-999999999999" : "f".repeat(64);
    return { ok: true, status: 200, json: async () => ({ status: "saved", event }) };
  }));
  render(<MargotEpisodeReviewControls binding={binding} mediaAvailable />);
  fireEvent.click(screen.getByRole("button", { name: "Approve this version" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("did not match");
  expect(screen.queryByText(/Approval saved/)).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Approve this version" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Request changes" })).toBeDisabled();
  expect(screen.getByRole("button", { name: /Reload/ })).toBeInTheDocument();
});
function savedEvent(request: Record<string, unknown>) {
  return { ...request, kind: "margot-content-review-event", schemaVersion: 1, episodeSHA256: "b".repeat(64), scriptSHA256: "c".repeat(64), mediaSHA256: "d".repeat(64), videoId: "1".repeat(32), recordedAt: "2026-09-13T00:00:00.000Z", publicationApproved: false };
}
it("does not retain a fully valid delayed approval after read failure and recovery", async () => {
  let finish!: (value: unknown) => void;
  let request: Record<string, unknown> = {};
  vi.stubGlobal("fetch", vi.fn((_url, options) => { request = JSON.parse(options.body); return new Promise(resolve => { finish = resolve; }); }));
  const { rerender } = render(<MargotEpisodeReviewControls binding={binding} mediaAvailable />);
  fireEvent.click(screen.getByRole("button", { name: "Approve this version" }));
  rerender(<MargotEpisodeReviewControls binding={binding} mediaAvailable loadFailed />);
  finish({ ok: true, status: 200, json: async () => ({ status: "saved", event: savedEvent(request) }) });
  await waitFor(() => expect(screen.queryByText(/Saving your decision/)).not.toBeInTheDocument());
  rerender(<MargotEpisodeReviewControls binding={binding} mediaAvailable />);
  expect(screen.queryByText(/Approval saved/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Status: Proposal approved/)).not.toBeInTheDocument();
});
it("disables approval after verified playback is unavailable while allowing feedback", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ status: "media_unavailable" }) }));
  render(<MargotEpisodeReviewControls binding={binding} mediaAvailable />);
  fireEvent.click(screen.getByRole("button", { name: "Approve this version" }));
  await screen.findByRole("alert");
  expect(screen.getByRole("button", { name: "Approve this version" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Request changes" })).toBeEnabled();
});
it("shows saved confirmation only after a matching persisted receipt", async () => {
  vi.stubGlobal("fetch", vi.fn(async (_url, options) => ({ ok: true, status: 200, json: async () => ({ status: "saved", event: savedEvent(JSON.parse(options.body)) }) })));
  render(<MargotEpisodeReviewControls binding={binding} mediaAvailable />);
  fireEvent.click(screen.getByRole("button", { name: "Approve this version" }));
  expect(await screen.findByText(/Approval saved for version 2/)).toBeInTheDocument();
  expect(screen.getByText(/Nothing has been scheduled or published/)).toBeInTheDocument();
});

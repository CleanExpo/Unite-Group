"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { contentEventSchema, type ContentEvent } from "@/lib/weekly-tasks/margot-content-review-contract";
type Binding = { batchId: string; version: number; packetSHA256: string; episodeId: string };
export function MargotEpisodeReviewControls({ binding, mediaAvailable, initialEvent, loadFailed = false }: {
  binding: Binding; mediaAvailable: boolean; initialEvent?: ContentEvent; loadFailed?: boolean;
}) {
  const router = useRouter();
  const bindingKey = JSON.stringify(binding);
  const initialBinding = useRef(bindingKey);
  const latestBinding = useRef(bindingKey);
  latestBinding.current = bindingKey;
  const latestReadHealthy = useRef(!loadFailed);
  latestReadHealthy.current = !loadFailed;
  const bindingChanged = initialBinding.current !== bindingKey;
  const [feedback, setFeedback] = useState("");
  const [pending, setPending] = useState(false);
  const [event, setEvent] = useState(initialEvent);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [stale, setStale] = useState(false);
  const [playbackFailed, setPlaybackFailed] = useState(false);
  const inFlight = useRef(false);
  const retry = useRef<{ key: string; operationId: string } | null>(null);
  async function save(action: "approve" | "request_changes") {
    if (inFlight.current || stale || bindingChanged || loadFailed || (action === "approve" && (!mediaAvailable || playbackFailed))) return;
    const text = feedback.trim();
    if (action === "request_changes" && !text) { setError("Please describe the changes you need."); return; }
    const key = JSON.stringify({ ...binding, action, feedback: text });
    if (!retry.current || retry.current.key !== key) retry.current = { key, operationId: crypto.randomUUID() };
    inFlight.current = true; setPending(true); setError(""); setSaved(false);
    try {
      const response = await fetch("/api/founder/weekly-tasks/margot/review", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...binding, action, feedback: text, operationId: retry.current.operationId }),
      });
      if (latestBinding.current !== bindingKey) { setStale(true); throw new Error("This version changed. Reload the packet before reviewing it."); }
      if (response.status === 401) { setStale(true); throw new Error("Sign in again, then reload the current packet. Your feedback is retained."); }
      const payload = await response.json();
      if (payload?.status === "media_unavailable") { setPlaybackFailed(true); throw new Error("Verified video unavailable. You can still request changes; protected playback must be restored before approval."); }
      if (payload?.status === "stale") { setStale(true); throw new Error("This version changed. Reload the packet before reviewing it."); }
      if (!response.ok || payload?.status !== "saved") throw new Error("Your decision could not be confirmed. Your feedback is retained; please retry.");
      if (latestBinding.current !== bindingKey || !latestReadHealthy.current) { setStale(true); throw new Error("This version changed. Reload the packet before reviewing it."); }
      const parsed = contentEventSchema.safeParse(payload.event);
      if (!parsed.success || parsed.data.batchId !== binding.batchId || parsed.data.version !== binding.version || parsed.data.packetSHA256 !== binding.packetSHA256 || parsed.data.episodeId !== binding.episodeId || parsed.data.operationId !== retry.current.operationId || parsed.data.action !== action || parsed.data.feedback !== text) { setStale(true); throw new Error("The saved response did not match this version. Please reload before continuing."); }
      setEvent(parsed.data); setSaved(true); retry.current = null; router.refresh();
    } catch (cause) {
      // Only locally generated safe messages are displayed; provider response text is never used.
      setError(cause instanceof Error && ["Verified video unavailable. You can still request changes; protected playback must be restored before approval.", "Sign in again, then reload the current packet. Your feedback is retained.", "This version changed. Reload the packet before reviewing it.", "Your decision could not be confirmed. Your feedback is retained; please retry.", "The saved response did not match this version. Please reload before continuing."].includes(cause.message) ? cause.message : "Your decision could not be confirmed. Your feedback is retained; please retry.");
    } finally { inFlight.current = false; setPending(false); }
  }
  const currentEvent = !bindingChanged && !loadFailed ? [event, initialEvent].filter((item): item is ContentEvent => Boolean(item && item.batchId === binding.batchId && item.version === binding.version && item.packetSHA256 === binding.packetSHA256 && item.episodeId === binding.episodeId)).sort((a, b) => `${b.recordedAt}/${b.operationId}`.localeCompare(`${a.recordedAt}/${a.operationId}`))[0] : undefined;
  return <section aria-label="Review this proposal version">
    <p>Current proposal version: {binding.version}. Content review only — publication is a separate decision.</p>
    <p>Status: {currentEvent?.action === "approve" ? "Proposal approved" : currentEvent?.action === "request_changes" ? "Changes requested" : bindingChanged ? "Version changed — reload required" : loadFailed ? "Saved review status unavailable" : "Proposal review pending"}.</p>
    {currentEvent?.feedback && <p>Saved feedback: {currentEvent.feedback}</p>}
    {(!mediaAvailable || playbackFailed) && <p>The verified video for this version is not available for protected playback. You can read the proposal and request changes.</p>}
    {loadFailed && <p role="alert">Previous decisions could not be read. Reload to check the saved status.</p>}
    <label htmlFor={`feedback-${binding.episodeId}`}>Feedback for this version</label>
    <textarea id={`feedback-${binding.episodeId}`} maxLength={4000} value={feedback} onChange={e => setFeedback(e.target.value)} disabled={pending} />
    <p><button type="button" disabled={pending || stale || bindingChanged || loadFailed || !mediaAvailable || playbackFailed} onClick={() => void save("approve")}>Approve this version</button>{" "}<button type="button" disabled={pending || stale || bindingChanged || loadFailed} onClick={() => void save("request_changes")}>Request changes</button></p>
    {pending && <p role="status">Saving your decision…</p>}
    {saved && !bindingChanged && !loadFailed && <p role="status">{currentEvent?.action === "approve" ? "Approval saved" : "Requested changes saved"} for version {binding.version}. Nothing has been scheduled or published.</p>}
    {bindingChanged && <p role="alert">This version changed. Your unsaved feedback is retained for copying. Reload before reviewing the new version.</p>}
    {error && <p role="alert">{error}</p>}
    <p>Next action: {stale || bindingChanged || loadFailed ? "reload the current packet" : currentEvent?.action === "approve" ? "complete the separate publication review" : currentEvent?.action === "request_changes" ? "review the revised proposal when it is ready" : "read the proposal, watch the exact video when available, then approve or request changes"}.</p>
    {(stale || bindingChanged || loadFailed) && <button type="button" onClick={() => window.location.reload()}>Reload current packet</button>}
  </section>;
}

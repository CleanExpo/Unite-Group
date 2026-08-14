"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, GitBranchPlus } from "lucide-react";

interface BridgeLink {
  linear_issue_id: string;
  linear_issue_url: string | null;
  autonomous: boolean;
}

interface InsightIssueLinkProps {
  insightId: string;
  onLinked?: () => void;
}

export function InsightIssueLink({
  insightId,
  onLinked,
}: InsightIssueLinkProps) {
  const [link, setLink] = useState<BridgeLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Write-path slot: the POST that creates the issue. Distinct from `loadError`
  // below, and deliberately cleared at submit ENTRY — it describes the write
  // currently in flight, so carrying the previous attempt's message into a new
  // one would be the lie. The read-side rule (clear on success only) does NOT
  // apply here; see the comment on `loadError`.
  const [error, setError] = useState<string | null>(null);
  // Read-path slot. Before this the read was `.catch(() => {})` with no
  // `res.ok` check at all, so a 500 — HTML body and all — left `link` at null
  // and `loading` false. `link === null` is not "no data yet": it is the
  // positive claim "this insight has no Linear issue", and the Create button
  // below was offered on the strength of it. [UNI-2486]
  const [loadError, setLoadError] = useState<string | null>(null);

  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [evidence, setEvidence] = useState("");

  // Generation token. `load` is called both by the mount effect and directly by
  // Retry, and the effect's cleanup is not available to the latter — so two
  // reads can be in flight at once. Without this, an older response landing
  // after a newer one can resurrect a cleared `loadError` or overwrite a fresher
  // `link`. Only the newest read may write state.
  const readGeneration = useRef(0);

  const load = useCallback(() => {
    const generation = ++readGeneration.current;
    const isCurrent = () => readGeneration.current === generation;
    setLoading(true);
    fetch(`/api/strategy/insights/${insightId}/create-issue`)
      .then((r) => {
        if (!r.ok) throw new Error("read failed");
        return r.json();
      })
      .then((d) => {
        if (!isCurrent()) return;
        setLink(d.link ?? null);
        // Cleared on SUCCESS only, never at loader entry. Clearing on entry
        // would drop the "unknown" state mid-read and flash the Create button
        // back on screen before the answer arrived.
        setLoadError(null);
      })
      .catch(() => {
        if (!isCurrent()) return;
        setLoadError(
          "Could not check whether this insight already has a Linear issue — this is a failed read, not a confirmed absence.",
        );
      })
      .finally(() => {
        if (isCurrent()) setLoading(false);
      });
  }, [insightId]);

  useEffect(() => {
    load();
    // Superseding the generation on unmount stops a late response writing to a
    // component that is gone.
    return () => {
      readGeneration.current += 1;
    };
  }, [load]);

  async function submit() {
    if (!acceptanceCriteria.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/strategy/insights/${insightId}/create-issue`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            acceptanceCriteria,
            evidenceIds: evidence
              .split("\n")
              .map((e) => e.trim())
              .filter(Boolean),
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create issue.");
        return;
      }
      setLink(data.link);
      setOpen(false);
      onLinked?.();
    } finally {
      setSubmitting(false);
    }
  }

  // The unknown state is checked BEFORE `loading`, not after. `load` sets
  // `loading` true, so with the order reversed pressing Retry replaced the alert
  // and the Retry button with nothing at all — and if that read stalled, the
  // founder was left staring at an empty area with no way back. The first load
  // still renders nothing (no error yet), which is what the `loading` return
  // below is for.
  //
  // This also fixed a test that was passing for the wrong reason: the in-flight
  // case asserted the Create button was absent, and it was — because the whole
  // component was rendering null. It now asserts the recovery UI is present.
  //
  // The unknown state renders BEFORE the link check and before the Create
  // button, and it renders no write control at all — not even a disabled one.
  //
  // This is the one surface in the failed-read audit where the standard
  // retain-mark-disable shape is the wrong fix. There is no retained payload to
  // mark: the only thing a failed read leaves behind is `link === null`, which
  // the UI reads as "no Linear issue exists yet". A DISABLED Create button
  // still asserts that claim, and the claim is what causes the harm — acting on
  // it can raise a duplicate of an issue that already exists. So the button is
  // withheld until a read has actually answered the question, and the founder
  // is given a live Retry instead. [UNI-2486]
  if (loadError) {
    return (
      <div className="mt-3 flex items-center gap-2">
        <p role="alert" className="text-[11px]" style={{ color: "#ef4444" }}>
          {loadError}
        </p>
        {/* Recovery control. Disabled only while its own read is in flight —
            that is progress feedback, not a stale-read gate, and it stops a
            queue of overlapping retries building up. */}
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="text-[11px] px-2 py-1 rounded-sm border shrink-0 disabled:opacity-40"
          style={{
            borderColor: "var(--color-border)",
            color: "var(--color-text-disabled)",
          }}
        >
          {loading ? "retrying…" : "↻ retry"}
        </button>
      </div>
    );
  }

  if (loading) return null;

  if (link) {
    return (
      <div
        className="flex items-center gap-2 mt-3 text-[11px]"
        style={{ color: "var(--color-text-muted)" }}
      >
        <GitBranchPlus size={12} style={{ color: "#15803d" }} />
        <span>Linear issue</span>
        {link.linear_issue_url ? (
          <a
            href={link.linear_issue_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium"
            style={{ color: "#15803d" }}
          >
            {link.linear_issue_id}
            <ExternalLink size={10} />
          </a>
        ) : (
          <span
            className="font-medium"
            style={{ color: "var(--color-text-primary)" }}
          >
            {link.linear_issue_id}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-sm border transition-colors"
          style={{
            borderColor: "var(--color-border)",
            color: "var(--color-text-secondary)",
          }}
        >
          <GitBranchPlus size={11} />
          Create Linear issue
        </button>
      ) : (
        <div
          className="flex flex-col gap-2 rounded-sm border p-3"
          style={{ borderColor: "var(--color-border)" }}
        >
          <label
            className="text-[10px] font-medium"
            style={{ color: "var(--color-text-muted)" }}
          >
            Acceptance criteria <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <textarea
            value={acceptanceCriteria}
            onChange={(e) => setAcceptanceCriteria(e.target.value)}
            rows={3}
            placeholder="What done looks like for this planning projection."
            className="text-[12px] px-2 py-1.5 rounded-sm border bg-transparent resize-y"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-text-primary)",
            }}
          />
          <label
            className="text-[10px] font-medium"
            style={{ color: "var(--color-text-muted)" }}
          >
            Evidence (one URL or reference per line)
          </label>
          <textarea
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            rows={2}
            placeholder="https://…"
            className="text-[12px] px-2 py-1.5 rounded-sm border bg-transparent resize-y"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-text-primary)",
            }}
          />
          {/* `role="alert"` was absent, so the write failure was invisible to
              the census oracle (`announcesFailure`) as well as to assistive
              technology — the surface could fail a POST and still read as
              silent to every instrument watching it. [UNI-2486] */}
          {error && (
            <p role="alert" className="text-[11px]" style={{ color: "#ef4444" }}>
              {error}
            </p>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={submit}
              disabled={submitting || !acceptanceCriteria.trim()}
              className="text-[11px] px-3 py-1.5 rounded-sm border transition-colors disabled:opacity-40"
              style={{
                borderColor: "rgba(22, 163, 74,0.3)",
                color: "#15803d",
                background: "rgba(22, 163, 74,0.06)",
              }}
            >
              {submitting ? "Creating…" : "Create issue"}
            </button>
            <button
              onClick={() => setOpen(false)}
              disabled={submitting}
              className="text-[11px] px-3 py-1.5 rounded-sm transition-colors"
              style={{ color: "var(--color-text-disabled)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

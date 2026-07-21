"use client";

import { useEffect, useState } from "react";
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
  const [error, setError] = useState<string | null>(null);

  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [evidence, setEvidence] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/strategy/insights/${insightId}/create-issue`)
      .then((r) => r.json())
      .then((d) => {
        if (active) setLink(d.link ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [insightId]);

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
          {error && (
            <p className="text-[11px]" style={{ color: "#ef4444" }}>
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

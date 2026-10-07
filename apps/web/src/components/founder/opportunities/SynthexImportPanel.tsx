"use client";

import { useState } from "react";
import type { Tables } from "@/types/database";
import type { ImportProject } from "@/lib/synthex/import-schema";
import type { OpportunityImportPreview } from "@/lib/synthex/opportunity-import";
import { MAX_IMPORT_REQUEST_BYTES } from "@/lib/synthex/import-limits";

const endpoint = "/api/founder/opportunities/import";
const controlStyle = {
  border: "1px solid var(--color-border)",
  background: "transparent",
  color: "var(--color-text-primary)",
};

export function SynthexImportPanel({
  onImported,
}: {
  onImported: (opportunity: Tables<"crm_opportunities">) => void;
}) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ImportProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [targetRepository, setTargetRepository] = useState("");
  const [json, setJson] = useState("");
  const [preview, setPreview] = useState<OpportunityImportPreview | null>(null);
  const [previewBundle, setPreviewBundle] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function loadProjects() {
    setLoadingProjects(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error ?? "Portfolio registry unavailable");
      if (!Array.isArray(data.projects) || data.projects.length === 0)
        throw new Error("No portfolio repositories are available");
      setProjects(data.projects);
      setProjectsLoaded(true);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Portfolio registry unavailable",
      );
    } finally {
      setLoadingProjects(false);
    }
  }

  function invalidatePreview() {
    setPreview(null);
    setPreviewBundle(null);
    setSaved(false);
    setError(null);
  }

  async function previewImport() {
    invalidatePreview();
    if (new Blob([json]).size > MAX_IMPORT_REQUEST_BYTES) {
      setError("Export JSON is too large");
      return;
    }
    let bundle: unknown;
    try {
      bundle = JSON.parse(json);
    } catch {
      setError("Enter valid export JSON");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundle, targetRepository, previewOnly: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import preview failed");
      if (!data.preview?.proposal || data.preview.executionBlocked !== true)
        throw new Error("No blocked preview was returned");
      setPreview(data.preview);
      setPreviewBundle(bundle);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Import preview failed",
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveImport() {
    if (!preview || !previewBundle) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bundle: previewBundle,
          targetRepository,
          previewOnly: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import save failed");
      if (
        !data.opportunity?.id ||
        data.opportunity.stage !== "blocked_review" ||
        data.opportunity.status !== "blocked_review"
      )
        throw new Error("No saved blocked opportunity was returned");
      onImported(data.opportunity);
      setSaved(true);
      setPreview(null);
      setPreviewBundle(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Import save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="rounded-sm px-4 py-3 flex flex-col gap-3 text-[13px]"
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--color-border)",
        color: "var(--color-text-primary)",
      }}
      aria-label="Synthex proposal import"
    >
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || loadingProjects}
          aria-expanded={open}
          className="rounded-sm px-3 py-2"
          style={controlStyle}
          onClick={() => {
            setOpen(!open);
            if (!open && !projectsLoaded) void loadProjects();
          }}
        >
          {open ? "Close Synthex import" : "Import Synthex proposal"}
        </button>
        <span style={{ color: "var(--color-text-muted)" }}>
          Accepted proposals enter blocked review with zero spend.
        </span>
      </div>
      {open && (
        <>
          <p>
            Paste a Synthex export, choose its portfolio repository, and preview
            before saving. The full proposal remains in Synthex; this review
            retains its reference. The file is untrusted and does not establish
            signed source authority.
          </p>
          {loadingProjects && (
            <p role="status">Loading portfolio repositories…</p>
          )}
          {!loadingProjects && !projectsLoaded && (
            <button
              type="button"
              onClick={() => void loadProjects()}
              className="underline"
            >
              Retry projects
            </button>
          )}
          <label className="flex flex-col gap-1">
            Target repository
            <select
              value={targetRepository}
              disabled={busy || loadingProjects || !projectsLoaded}
              onChange={(event) => {
                setTargetRepository(event.target.value);
                invalidatePreview();
              }}
              className="rounded-sm px-3 py-2"
              style={controlStyle}
            >
              <option value="">Choose a local portfolio repository</option>
              {projects.map((project) => (
                <option key={project.repository} value={project.repository}>
                  {project.name} — {project.repository}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Synthex export JSON
            <textarea
              rows={6}
              maxLength={MAX_IMPORT_REQUEST_BYTES}
              value={json}
              disabled={busy}
              onChange={(event) => {
                setJson(event.target.value);
                invalidatePreview();
              }}
              className="rounded-sm px-3 py-2 font-mono"
              style={controlStyle}
            />
          </label>
          <button
            type="button"
            disabled={
              busy || !projectsLoaded || !targetRepository || !json.trim()
            }
            onClick={() => void previewImport()}
            className="self-start rounded-sm px-3 py-2"
            style={controlStyle}
          >
            {busy ? "Processing…" : "Preview import"}
          </button>
          {preview && (
            <div className="flex flex-col gap-2" aria-label="Import preview">
              <h3 className="font-medium">{preview.proposal.title}</h3>
              <p>
                {preview.project.repository} · proposal {preview.packetId} ·
                revision {preview.revision}
              </p>
              <p>
                Execution blocked. Zero-spend boundary: AUD $0. Demand and
                revenue remain unvalidated. Confidence is an operator estimate (
                {preview.proposal.confidence}).
              </p>
              <p>
                Business: {preview.proposal.targetBusiness}. Suggested owner:{" "}
                {preview.proposal.suggestedOwner}.
              </p>
              <p>
                Customer problem hypothesis:{" "}
                {preview.proposal.customerProblemHypothesis}
              </p>
              <h4 className="font-medium">Source claims</h4>
              <ul className="list-disc pl-5">
                {preview.proposal.sources.map((source, index) => (
                  <li key={index}>
                    {source.url} · captured {source.capturedAt}
                    {source.publishedAt
                      ? ` · published ${source.publishedAt}`
                      : ""}
                    <ul>
                      {source.claims.map((claim, claimIndex) => (
                        <li key={claimIndex}>{claim}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
              <h4 className="font-medium">Separate Unite evidence</h4>
              <ul className="list-disc pl-5">
                {preview.proposal.uniteEvidence.map((evidence, index) => (
                  <li key={index}>
                    {evidence.reference} · {evidence.observation} · captured{" "}
                    {evidence.capturedAt}
                  </li>
                ))}
              </ul>
              <p>Assumptions: {preview.proposal.assumptions.join("; ")}</p>
              <p>Uncertainties: {preview.proposal.uncertainties.join("; ")}</p>
              <p>
                KPI: {preview.proposal.kpi.name} ({preview.proposal.kpi.unit}).
                Baseline required: {preview.proposal.kpi.baselineRequirement}
              </p>
              <p>Success criteria: {preview.proposal.successCriteria}</p>
              <p>Stop criteria: {preview.proposal.stopCriteria}</p>
              <p>Next validation: {preview.proposal.nextValidationStep}</p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void saveImport()}
                className="self-start rounded-sm px-3 py-2"
                style={controlStyle}
              >
                Save blocked review
              </button>
            </div>
          )}
          {saved && (
            <p role="status">
              Saved as blocked review. Execution remains blocked; demand and
              revenue are unvalidated.
            </p>
          )}
          {error && <p role="alert">{error}</p>}
        </>
      )}
    </section>
  );
}

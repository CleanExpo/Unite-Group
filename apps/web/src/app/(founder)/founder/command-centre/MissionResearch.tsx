"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { IdeaLifecycle } from "@/lib/command-centre/idea-lifecycle";
import type {
  ResearchRun,
  ResearchStart,
} from "@/lib/command-centre/idea-research";
import styles from "./mission-lifecycle.module.css";
import desk from "./founder-desk.module.css";

const endpoint = "/api/command-centre/missions/research";
type OwnerResearchRun = Omit<ResearchRun, "lease"> & {
  lease?: Pick<
    NonNullable<ResearchRun["lease"]>,
    "runnerId" | "expiresAt"
  > | null;
};
interface ResearchResponse {
  taskId: string;
  research: OwnerResearchRun | null;
  source: "supabase";
  authorityCurrent: boolean;
  readiness: {
    signingAvailable: boolean;
    runnerConnection: "unknown";
    subscriptionAllowance: "unknown";
    paidApiFallback: false;
  };
  error?: string;
}
type Command =
  | ResearchStart
  | {
      action: "cancel" | "retry";
      taskId: string;
      expectedRevision: number;
      runId: string;
    };
const statuses: Record<ResearchRun["state"], string> = {
  queued: "Queued",
  running: "Running",
  partial: "Partial findings",
  blocked: "Blocked",
  completed: "Research completed",
  cancelled: "Cancelled",
};
const nextSteps: Record<ResearchRun["state"], string> = {
  queued:
    "Waiting for a researcher using the supported monthly account. Check again for progress.",
  running:
    "Gathering and comparing sources within the agreed research boundaries.",
  partial:
    "Review the partial findings and unresolved decisions. Retry within the same approved scope if needed.",
  blocked: "Research has stopped. Review the specific blocker before retrying.",
  completed:
    "Review the sources, uncertainty and proposed brief before adding anything to the evidence ledger.",
  cancelled:
    "This request is cancelled. Any saved findings remain available for review.",
};
function safeSource(reference: string): string | null {
  try {
    const url = new URL(reference);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
function localTime(input: string): string {
  const time = new Date(input);
  return Number.isNaN(time.getTime())
    ? "Time unavailable"
    : time.toLocaleString("en-AU", { timeZone: "Australia/Brisbane" });
}
function mandateBudget(mandate: NonNullable<IdeaLifecycle["mandate"]>): string {
  try {
    const format = new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: mandate.currency,
    });
    const digits = format.resolvedOptions().maximumFractionDigits;
    return digits === undefined
      ? "Review the saved budget above."
      : format.format(mandate.spendLimitMinor / 10 ** digits);
  } catch {
    return "Review the saved budget above.";
  }
}

export function MissionResearch({
  taskId,
  lifecycle,
  stale = false,
  onRefreshIdea,
}: {
  taskId: string;
  lifecycle: IdeaLifecycle;
  stale?: boolean;
  onRefreshIdea?: () => void;
}) {
  const fieldId = useId();
  const [data, setData] = useState<ResearchResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [allowanceApproved, setAllowanceApproved] = useState(false);
  const [observedNow, setObservedNow] = useState(0);
  const inFlight = useRef(false);
  const sequence = useRef(0);
  const retryIdentity = useRef<{ input: string; requestId: string } | null>(
    null,
  );
  const run = data?.research;
  const active = !!run && ["queued", "running"].includes(run.state);
  const current =
    !!run &&
    data?.authorityCurrent &&
    run.authority.lifecycleRevision === lifecycle.revision;
  const disabled = busy || stale || !!error;
  const expiredLease =
    run?.state === "running" &&
    !!run.lease &&
    Date.parse(run.lease.expiresAt) <= observedNow;
  const usageUnknown = run?.error?.code === "usage_unknown";
  const retryable =
    !!current &&
    !usageUnknown &&
    ((!!run && ["partial", "blocked"].includes(run.state)) || expiredLease);

  const request = useCallback(
    async (command?: Command) => {
      if (inFlight.current || (command && disabled)) return;
      const currentSequence = ++sequence.current;
      inFlight.current = true;
      setBusy(true);
      setError(null);
      setConflict(false);
      try {
        const response = await fetch(
          command
            ? endpoint
            : `${endpoint}?taskId=${encodeURIComponent(taskId)}`,
          {
            credentials: "include",
            cache: "no-store",
            ...(command
              ? {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(command),
                }
              : {}),
          },
        );
        const body = (await response.json()) as ResearchResponse;
        if (currentSequence !== sequence.current) return;
        if (
          !response.ok ||
          body.source !== "supabase" ||
          body.taskId !== taskId ||
          !body.readiness ||
          (body.research && body.research.taskId !== taskId)
        ) {
          setConflict(response.status === 409);
          throw new Error(
            body.error ||
              "Research status could not be confirmed. Reload it before continuing.",
          );
        }
        setData(body);
        setObservedNow(Date.now());
        if (command?.action === "start") {
          setAllowanceApproved(false);
          retryIdentity.current = null;
        }
      } catch (err) {
        if (currentSequence === sequence.current)
          setError(
            err instanceof Error
              ? err.message
              : "Research status is unavailable.",
          );
      } finally {
        if (currentSequence === sequence.current) {
          inFlight.current = false;
          setBusy(false);
        }
      }
    },
    [taskId, disabled],
  );
  useEffect(
    () => () => {
      sequence.current++;
    },
    [taskId],
  );
  useEffect(() => {
    if (!active || error) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void request();
    }, 10000);
    return () => window.clearInterval(timer);
  }, [active, error, request]);

  function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !allowanceApproved ||
      disabled ||
      !lifecycle.mandate ||
      !data?.readiness.signingAvailable
    )
      return;
    const fields = new FormData(event.currentTarget);
    const input = {
      action: "start" as const,
      taskId,
      expectedRevision: lifecycle.revision,
      allowedDomains: String(fields.get("allowedDomains") ?? "")
        .split("\n")
        .map((domain) => domain.trim().toLowerCase())
        .filter(Boolean),
      limits: {
        maximumSources: Number(fields.get("maximumSources")),
        timeLimitMinutes: Number(fields.get("timeLimitMinutes")),
        maxTurns: Number(fields.get("maxTurns")),
        concurrency: 1 as const,
      },
    };
    const identity = JSON.stringify(input);
    if (retryIdentity.current?.input !== identity)
      retryIdentity.current = {
        input: identity,
        requestId: crypto.randomUUID(),
      };
    void request({ ...input, requestId: retryIdentity.current.requestId });
  }

  return (
    <section className={styles.research} aria-label="Bounded research requests">
      <div className={desk.sectionHeading}>
        <h4>Request bounded research</h4>
        <button
          className={desk.textButton}
          disabled={busy}
          onClick={() => void request()}
        >
          {busy
            ? "Checking research…"
            : data
              ? "Refresh research"
              : "Load research requests"}
        </button>
      </div>
      <p className={desk.helper}>
        Research uses the supported monthly-account connection when a researcher
        is available. Availability and remaining subscription allowance are not
        confirmed here. There is no paid API fallback.
      </p>
      {stale && (
        <p className={desk.helper}>
          Refresh the idea before authorising research from this version.
        </p>
      )}
      {error && (
        <div className={desk.error} role="alert">
          <p>
            {error} {data && "Previously saved research is still shown."}
          </p>
          {conflict && (
            <p>
              The idea or run changed. Reload the idea and research before
              making another decision.
            </p>
          )}
          {conflict && onRefreshIdea && (
            <button className={desk.secondaryButton} onClick={onRefreshIdea}>
              Refresh the saved idea
            </button>
          )}
        </div>
      )}
      {data && (
        <>
          {!data.readiness.signingAvailable && (
            <p className={desk.error}>
              Research authorisation needs operator attention. Saved notes and
              manual research remain available.
            </p>
          )}
          {run && (
            <section aria-label="Saved research run">
              <p className={desk.status}>{statuses[run.state]}</p>
              <p>
                <strong>Next step:</strong>{" "}
                {usageUnknown
                  ? "Usage from the previous attempt could not be confirmed. A new bounded research request is required."
                  : expiredLease
                    ? "The researcher stopped responding. Retry only within the remaining approved time and allowance, or cancel this request."
                    : run.error?.message ||
                      run.checkpoint?.nextStep ||
                      nextSteps[run.state]}
              </p>
              <p className={desk.helper}>
                Request {run.id} · idea revision{" "}
                {run.authority.lifecycleRevision} · {run.attempts} attempt
                {run.attempts === 1 ? "" : "s"}
              </p>
              {run.deadlineAt && (
                <p className={desk.helper}>
                  Research deadline:{" "}
                  <time dateTime={run.deadlineAt}>
                    {localTime(run.deadlineAt)} AEST
                  </time>
                </p>
              )}
              {!current && (
                <p className={desk.helper}>
                  This request no longer matches the current idea, mandate or
                  authority. Its saved findings remain historical; a new request
                  needs approval for the current version.
                </p>
              )}
              {run.checkpoint && (
                <section aria-label="Saved research checkpoint">
                  <h4>Saved checkpoint {run.checkpoint.sequence}</h4>
                  <p>{run.checkpoint.summary}</p>
                  <p className={desk.helper}>
                    Research turns used: {run.checkpoint.turnsUsed} /{" "}
                    {run.authority.limits.maxTurns}
                  </p>
                </section>
              )}
              <details className={desk.details}>
                <summary>Approved research boundaries</summary>
                <p>
                  Public websites: {run.authority.allowedDomains.join(", ")}
                </p>
                <p>
                  {run.authority.limits.timeLimitMinutes} minutes ·{" "}
                  {run.authority.limits.maxTurns} research turns ·{" "}
                  {run.authority.limits.maximumSources} sources admitted to
                  findings · one researcher at a time for this request
                </p>
                <p className={desk.helper}>
                  The source limit caps retained evidence, rather than
                  individual page visits. Remaining monthly allowance is
                  unknown.
                </p>
                <p className={styles.hash}>
                  Idea fingerprint: {run.authority.inputHash}
                </p>
                <p className={styles.hash}>
                  Mandate fingerprint: {run.authority.mandateHash}
                </p>
              </details>
              <div className={styles.actions}>
                {active && (
                  <button
                    className={desk.secondaryButton}
                    disabled={disabled}
                    onClick={() =>
                      void request({
                        action: "cancel",
                        taskId,
                        expectedRevision: lifecycle.revision,
                        runId: run.id,
                      })
                    }
                  >
                    Cancel research request
                  </button>
                )}
                {retryable && (
                  <button
                    className={desk.secondaryButton}
                    disabled={disabled}
                    onClick={() =>
                      void request({
                        action: "retry",
                        taskId,
                        expectedRevision: lifecycle.revision,
                        runId: run.id,
                      })
                    }
                  >
                    Retry within the approved research boundaries
                  </button>
                )}
              </div>
              {run.result && <ResearchProposal result={run.result} />}
            </section>
          )}
          {!active && (
            <details className={desk.details}>
              <summary>
                {run
                  ? "Approve a new research request"
                  : "Choose the research boundaries"}
              </summary>
              {!lifecycle.mandate ? (
                <p>
                  Save the research objective, permitted sources and allowance
                  above before requesting a researcher.
                </p>
              ) : (
                <form
                  onSubmit={start}
                  onChange={(event) => {
                    if (!(
                      event.target instanceof HTMLInputElement &&
                      event.target.type === "checkbox"
                    ))
                      setAllowanceApproved(false);
                  }}
                >
                  <fieldset
                    disabled={disabled || !data.readiness.signingAvailable}
                    className={styles.fields}
                  >
                    <legend>
                      Approve public research for this saved version
                    </legend>
                    <details className={desk.details}>
                      <summary>Review the idea and saved mandate</summary>
                      <p>
                        <strong>{lifecycle.title}</strong> · revision{" "}
                        {lifecycle.revision}
                      </p>
                      <p className={styles.preserved}>{lifecycle.rawIdea}</p>
                      <p>Research objective: {lifecycle.mandate.objective}</p>
                      <p>
                        Permitted sources:{" "}
                        {lifecycle.mandate.allowedSources.join(", ")}
                      </p>
                      <p>
                        Saved mandate allowance:{" "}
                        {lifecycle.mandate.maximumSources} sources · spend limit{" "}
                        {mandateBudget(lifecycle.mandate)}
                      </p>
                    </details>
                    <label
                      className={styles.field}
                      htmlFor={`${fieldId}-domains`}
                    >
                      <span>Allowed public website domains — one per line</span>
                      <textarea
                        id={`${fieldId}-domains`}
                        name="allowedDomains"
                        rows={3}
                        required
                        maxLength={5080}
                        placeholder="example.com"
                      />
                    </label>
                    <label
                      className={styles.field}
                      htmlFor={`${fieldId}-sources`}
                    >
                      <span>Maximum sources admitted to findings</span>
                      <input
                        id={`${fieldId}-sources`}
                        name="maximumSources"
                        type="number"
                        min={1}
                        max={Math.min(25, lifecycle.mandate.maximumSources)}
                        defaultValue={Math.min(
                          10,
                          lifecycle.mandate.maximumSources,
                        )}
                        required
                      />
                    </label>
                    <p className={desk.helper}>
                      This caps retained evidence rather than individual page
                      visits.
                    </p>
                    <label
                      className={styles.field}
                      htmlFor={`${fieldId}-minutes`}
                    >
                      <span>Maximum research time (minutes)</span>
                      <input
                        id={`${fieldId}-minutes`}
                        name="timeLimitMinutes"
                        type="number"
                        min={1}
                        max={30}
                        defaultValue={10}
                        required
                      />
                    </label>
                    <label
                      className={styles.field}
                      htmlFor={`${fieldId}-turns`}
                    >
                      <span>Maximum research turns</span>
                      <input
                        id={`${fieldId}-turns`}
                        name="maxTurns"
                        type="number"
                        min={1}
                        max={12}
                        defaultValue={6}
                        required
                      />
                    </label>
                    <p className={desk.helper}>
                      One researcher runs this request at a time. Findings
                      remain proposals; research consent does not approve a
                      brief or build.
                    </p>
                    <label className={styles.researchConsent}>
                      <input
                        type="checkbox"
                        checked={allowanceApproved}
                        onChange={(event) =>
                          setAllowanceApproved(event.target.checked)
                        }
                        required
                      />
                      <span>
                        I approve public research for this saved idea, mandate,
                        domains and limits, with the remaining monthly allowance
                        unknown.
                      </span>
                    </label>
                    <button
                      className={desk.primaryButton}
                      type="submit"
                      disabled={!allowanceApproved || disabled}
                    >
                      Approve and queue research
                    </button>
                  </fieldset>
                </form>
              )}
            </details>
          )}
        </>
      )}
    </section>
  );
}

function ResearchProposal({
  result,
}: {
  result: NonNullable<ResearchRun["result"]>;
}) {
  return (
    <section aria-label="Research proposals for review">
      <h4>Proposed findings — awaiting your review</h4>
      <p>{result.summary}</p>
      <p className={desk.helper}>
        These are research proposals, including suggested sources and
        hypotheses. They do not become verified facts, approved briefs or build
        instructions automatically. Review chosen items in the evidence ledger.
      </p>
      {result.openDecisions.length > 0 && (
        <section>
          <h4>Next consequential decision</h4>
          <p>{result.openDecisions[0]}</p>
          {result.openDecisions.length > 1 && (
            <details className={desk.details}>
              <summary>Other open decisions</summary>
              <ul>
                {result.openDecisions.slice(1).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}
      <details className={desk.details}>
        <summary>Proposed sources ({result.sources.length})</summary>
        {result.sources.length === 0 && (
          <p>
            No sources proposed. Research conclusions remain unsubstantiated.
          </p>
        )}
        <ul className={styles.sources}>
          {result.sources.map((source) => {
            const href = safeSource(source.reference);
            return (
              <li key={source.id}>
                {href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    {source.label}
                  </a>
                ) : (
                  source.label
                )}
                <p>{source.annotation}</p>
                <small>
                  {source.kind} · origin: {source.independenceGroup} · recorded{" "}
                  {source.capturedAt}
                </small>
                <small>
                  Recorded rights:{" "}
                  {(source.rightsStatus ?? "unassessed").replaceAll("_", " ")} —
                  unverified source assertion
                </small>
                {source.limitations.map((limit, index) => (
                  <p key={index}>{limit}</p>
                ))}
              </li>
            );
          })}
        </ul>
      </details>
      <details className={desk.details}>
        <summary>Hypotheses and assumptions ({result.claims.length})</summary>
        <ul>
          {result.claims.map((claim) => (
            <li key={claim.id}>
              <p>{claim.statement}</p>
              <small>
                {claim.classification} · {claim.confidence} confidence
              </small>
              <p className={desk.helper}>
                Source references: {claim.sourceIds.join(", ") || "None"}
              </p>
              {claim.counterEvidenceIds.length > 0 && (
                <p className={desk.helper}>
                  Counter-evidence: {claim.counterEvidenceIds.join(", ")}
                </p>
              )}
              {claim.limitations.map((limit, index) => (
                <p key={index}>{limit}</p>
              ))}
            </li>
          ))}
        </ul>
      </details>
      {result.options.length > 0 && (
        <details className={desk.details}>
          <summary>Options and reasons to reconsider</summary>
          {result.options.map((option, index) => (
            <section key={index}>
              <h4>{option.title}</h4>
              <p>Benefits: {option.benefits.join("; ") || "Not established"}</p>
              <p>Risks: {option.risks.join("; ") || "Not established"}</p>
            </section>
          ))}
        </details>
      )}
      {result.proposedBrief && (
        <details className={desk.details}>
          <summary>Suggested brief — not approved</summary>
          <p>{result.proposedBrief.objective}</p>
          <p>
            User: {result.proposedBrief.user} · payer:{" "}
            {result.proposedBrief.payer}
          </p>
          <ul>
            {result.proposedBrief.acceptanceCriteria.map((item) => (
              <li key={item.id}>
                {item.criterion} — {item.validation}
              </li>
            ))}
          </ul>
          <ol>
            {result.proposedBrief.outputs.map((output) => (
              <li key={output.id}>
                Output {output.id} · {output.status.replaceAll("_", " ")}:{" "}
                {output.content}
              </li>
            ))}
          </ol>
        </details>
      )}
      <a
        download="research-proposal.json"
        href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(result, null, 2))}`}
      >
        Download proposal for review
      </a>
    </section>
  );
}

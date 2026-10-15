"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { DeliveryMissionView } from "@/lib/command-centre/delivery-types";
import type {
  IdeaLifecycle,
  LifecycleCommand,
  LifecycleSource,
  LifecycleClaim,
  LifecycleProgress,
  LifecycleHandoff,
} from "@/lib/command-centre/idea-lifecycle";
import styles from "./mission-lifecycle.module.css";
import desk from "./founder-desk.module.css";
import { MissionResearch } from "./MissionResearch";
import type { FactoryActivationView } from "@/lib/command-centre/idea-factory-activation";

const endpoint = "/api/command-centre/missions/lifecycle";
interface LifecycleResponse {
  taskId: string;
  lifecycle: IdeaLifecycle;
  progress: LifecycleProgress;
  handoff: LifecycleHandoff | null;
  source: string;
  mission?: DeliveryMissionView;
  error?: string;
  factoryActivation?: FactoryActivationView;
}
type Update = LifecycleCommand extends infer C
  ? C extends { action: "capture" }
    ? never
    : C extends { taskId: string; expectedRevision: number }
      ? Omit<C, "taskId" | "expectedRevision">
      : never
  : never;
const lines = (value: FormDataEntryValue | null) =>
  String(value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
const value = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();
function currencyExponent(currency: string): number {
  if (!Intl.supportedValuesOf("currency").includes(currency))
    throw new Error("Choose a supported three-letter payment currency.");
  const digits = new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
  }).resolvedOptions().maximumFractionDigits;
  if (digits === undefined)
    throw new Error("Currency precision could not be determined.");
  return digits;
}
export function currencyAmountToMinor(
  amount: string,
  currency: string,
): number {
  const digits = currencyExponent(currency);
  if (!/^\d+(?:\.\d+)?$/.test(amount))
    throw new Error("Enter an amount using digits and a decimal point.");
  const [whole, fraction = ""] = amount.split(".");
  if (fraction.length > digits)
    throw new Error(
      `${currency} supports ${digits} decimal places; review the entered amount.`,
    );
  const minor = Number(whole + fraction.padEnd(digits, "0"));
  if (!Number.isSafeInteger(minor))
    throw new Error("This amount is too large to record accurately.");
  return minor;
}
export function currencyMinorToAmount(minor: number, currency: string): string {
  const digits = currencyExponent(currency);
  return (minor / 10 ** digits).toFixed(digits);
}
// Stripe charge representation differs from ISO for these zero-decimal
// currencies: whole major units are represented with two trailing zeroes.
// Verified 15/10/2026: https://docs.stripe.com/currencies#special-cases
export function stripeAmountToMinor(amount: string, currency: string): number {
  if (currency !== "ISK" && currency !== "UGX")
    return currencyAmountToMinor(amount, currency);
  if (!/^\d+$/.test(amount))
    throw new Error(`${currency} payments require whole-currency amounts.`);
  const minor = Number(amount + "00");
  if (!Number.isSafeInteger(minor))
    throw new Error("This amount is too large to record accurately.");
  return minor;
}
export function stripeMinorToAmount(minor: number, currency: string): string {
  if (currency !== "ISK" && currency !== "UGX")
    return currencyMinorToAmount(minor, currency);
  if (!Number.isSafeInteger(minor) || minor % 100 !== 0)
    throw new Error(
      `The saved ${currency} payment target is not a whole-currency amount.`,
    );
  return (minor / 100).toFixed(0);
}
const money = (data: FormData, key: string) =>
  currencyAmountToMinor(
    value(data, key),
    value(data, "currency").toUpperCase(),
  );
function outcomeTime(input: string): string {
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(input))
    throw new Error("Include an explicit timezone in each measurement date.");
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime()))
    throw new Error("Enter a valid measurement date.");
  return parsed.toISOString();
}
const outputLabels = [
  "Understanding and assumptions",
  "Customer and competitor evidence",
  "Options and reasons not to proceed",
  "Learning and simulation design",
  "Visual references and acceptance benchmarks",
  "Property evidence and reuse",
  "Technology trade-offs",
  "Supported integration capabilities",
  "Security, privacy and review gaps",
  "Smallest validation exercise",
  "Versioned brief and acceptance criteria",
  "Research milestones and proposed delivery",
  "Handoff and evidence pack",
];

function Field({
  label,
  name,
  children,
  ...props
}: {
  label: string;
  name: string;
  children?: ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <label className={styles.field} htmlFor={id}>
      <span>{label}</span>
      {children || <input id={id} name={name} {...props} />}
    </label>
  );
}
function Text({
  label,
  name,
  defaultValue,
  required = false,
  maxLength = 4000,
  readOnly = false,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  maxLength?: number;
  readOnly?: boolean;
}) {
  const id = useId();
  return (
    <label className={styles.field} htmlFor={id}>
      <span>{label}</span>
      <textarea
        id={id}
        name={name}
        defaultValue={defaultValue}
        required={required}
        maxLength={maxLength}
        readOnly={readOnly}
        rows={3}
      />
    </label>
  );
}
function Choice({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: Array<[string, string]>;
  defaultValue?: string;
}) {
  const id = useId();
  return (
    <label className={styles.field} htmlFor={id}>
      <span>{label}</span>
      <select id={id} name={name} defaultValue={defaultValue}>
        {options.map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function MoneyFields({
  amountName,
  label,
  initialMinor,
  initialCurrency = "AUD",
  stripePayment = false,
}: {
  amountName: string;
  label: string;
  initialMinor?: number;
  initialCurrency?: string;
  stripePayment?: boolean;
}) {
  const [currency, setCurrency] = useState(initialCurrency);
  const [amount, setAmount] = useState(() => {
    if (initialMinor === undefined) return "";
    try {
      return stripePayment
        ? stripeMinorToAmount(initialMinor, initialCurrency)
        : currencyMinorToAmount(initialMinor, initialCurrency);
    } catch {
      return "";
    }
  });
  let precision: number | null = null;
  try {
    precision = currencyExponent(currency);
  } catch {
    /* Unsupported saved currencies remain visible for correction. */
  }
  return (
    <>
      <Field
        label="Payment currency"
        name="currency"
        value={currency}
        onChange={(event) => setCurrency(event.target.value.toUpperCase())}
        pattern="[A-Z]{3}"
        required
        maxLength={3}
      />
      <Field
        label={`${label} (${currency || "currency"})`}
        name={amountName}
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        inputMode="decimal"
        required
      />
      <p className={desk.helper}>
        {precision === null
          ? `Currency ${currency || "(empty)"} is unsupported here. Choose a supported currency before saving.`
          : `${currency} uses ${precision} decimal places. Changing currency does not convert the amount; review it before saving.`}
      </p>
    </>
  );
}

export function IdeaCapture({
  onCaptured,
}: {
  onCaptured: (mission: DeliveryMissionView) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retry = useRef<{ input: string; requestId: string } | null>(null);
  const submitting = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const data = new FormData(event.currentTarget);
    const rawIdea = String(data.get("rawIdea") ?? ""),
      title = value(data, "title");
    const input = JSON.stringify([title, rawIdea]);
    if (retry.current?.input !== input)
      retry.current = { input, requestId: crypto.randomUUID() };
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "capture",
          rawIdea,
          title,
          requestId: retry.current.requestId,
        }),
      });
      const body = (await response.json()) as LifecycleResponse;
      if (!mounted.current) return;
      if (!response.ok || body.source !== "supabase" || !body.mission?.taskId)
        throw new Error(
          body.error ||
            "The idea was not confirmed saved. Your text is retained; try again.",
        );
      onCaptured(body.mission);
    } catch (err) {
      if (mounted.current)
        setError(
          err instanceof Error ? err.message : "The idea could not be saved.",
        );
    } finally {
      submitting.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <section
      className={styles.capture}
      aria-label="Capture an idea for research"
    >
      <h2>Start with the idea you have</h2>
      <p>
        Save rough notes now. Research, decisions and delivery evidence stay
        with this mission.
      </p>
      <form onSubmit={(event) => void submit(event)}>
        <fieldset disabled={busy} className={styles.fields}>
          <Field label="Idea title" name="title" required maxLength={200} />
          <Text label="Rough idea" name="rawIdea" required maxLength={50000} />
          <p className={desk.helper}>
            Save your idea for research. Review the brief before preparing a
            build.
          </p>
          <button className={desk.primaryButton} type="submit">
            {busy ? "Saving idea…" : "Save idea for research"}
          </button>
        </fieldset>
      </form>
      {error && (
        <p className={desk.error} role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

export function MissionLifecycle({
  taskId,
  stale = false,
  deliveryBusy = false,
  onPrepareReviewed,
}: {
  taskId: string;
  stale?: boolean;
  deliveryBusy?: boolean;
  onPrepareReviewed?: () => void;
}) {
  const [data, setData] = useState<LifecycleResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const active = useRef(0);
  const inFlight = useRef(false);
  async function request(command?: Update | { action: "refresh_proof" }) {
    if (inFlight.current || (command && (!data || stale || error))) return;
    const sequence = ++active.current;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        command ? endpoint : `${endpoint}?taskId=${encodeURIComponent(taskId)}`,
        {
          credentials: "include",
          cache: "no-store",
          ...(command
            ? {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...command,
                  taskId,
                  expectedRevision: data!.lifecycle.revision,
                }),
              }
            : {}),
        },
      );
      const body = (await response.json()) as LifecycleResponse;
      if (sequence !== active.current) return;
      if (
        !response.ok ||
        body.source !== "supabase" ||
        body.taskId !== taskId ||
        !body.lifecycle ||
        !body.progress
      )
        throw new Error(
          body.error ||
            "Lifecycle evidence could not be read. Refresh before making another decision.",
        );
      setData(body);
      setChecked(true);
    } catch (err) {
      if (sequence === active.current) {
        setError(
          err instanceof Error
            ? err.message
            : "Lifecycle evidence is unavailable.",
        );
        setChecked(true);
      }
    } finally {
      if (sequence === active.current) {
        inFlight.current = false;
        setBusy(false);
      }
    }
  }
  useEffect(
    () => () => {
      active.current++;
    },
    [taskId],
  );
  const state = data?.lifecycle;
  const disabled = busy || deliveryBusy || stale || !!error;
  function form(
    event: FormEvent<HTMLFormElement>,
    build: (fields: FormData) => Update,
  ) {
    event.preventDefault();
    if (disabled) return;
    setFormError(null);
    try {
      void request(build(new FormData(event.currentTarget)));
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Check the entered fields. Your saved evidence has not changed.",
      );
    }
  }
  return (
    <section className={styles.lifecycle} aria-label="Idea to DONE lifecycle">
      <div className={desk.sectionHeading}>
        <h3>Idea to DONE</h3>
        <button
          className={desk.textButton}
          disabled={busy}
          onClick={() => void request()}
        >
          {busy
            ? "Reading and saving…"
            : checked
              ? "Refresh lifecycle"
              : "Open research and outcome workbench"}
        </button>
      </div>
      <p className={desk.helper}>
        Engineering, live operation and paying clients need separate proof. A
        completed task cannot establish DONE.
      </p>
      {error && (
        <p className={desk.error} role="alert">
          {error}{" "}
          {data &&
            "Previous evidence is out of date. Refresh before continuing."}
        </p>
      )}
      {formError && (
        <p className={desk.error} role="alert">
          {formError}
        </p>
      )}
      {data && state && (
        <div key={`${taskId}:${state.revision}`} className={styles.body}>
          <p className={desk.meta}>
            Saved revision {state.revision} ·{" "}
            {data.progress.stage.replaceAll("_", " ")}
          </p>
          <p>
            <strong>Next:</strong> {data.progress.nextAction}
          </p>
          <section aria-label="Internal factory use">
            <h4>Internal factory use</h4>
            <p className={desk.helper}>This mission’s operator history is separate from its customers, payments and paying-client count.</p>
            {!data.factoryActivation || data.factoryActivation.status === "not_connected" ? (
              <p>Internal-use evidence is not connected.</p>
            ) : data.factoryActivation.status === "unavailable" ? (
              <p role="status">Internal-use evidence could not be confirmed. Refresh before relying on it.</p>
            ) : (
              <>
                <p>{data.factoryActivation.firstValue ? "First internal value confirmed: an approved research handoff was persisted." : "No confirmed internal first-value event for this mission."}</p>
                <ol aria-label="Internal-use history">
                  {data.factoryActivation.history.map(entry => (
                    <li key={entry.id}>
                      <span>{entry.withdrawn ? "Evidence withdrawn" : "Approved research handoff persisted"} · revision {entry.revision}</span>{" "}
                      <time dateTime={entry.occurredAt}>{new Date(entry.occurredAt).toLocaleString("en-AU", { timeZone: "Australia/Brisbane" })} AEST</time>
                      <span> · {entry.environment} · release {entry.releaseId}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>
          {data.progress.blockers.length > 0 && (
            <div className={desk.blockers}>
              <h4>What prevents progress</h4>
              <ul>
                {data.progress.blockers.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          <ol className={styles.milestones} aria-label="Evidence milestones">
            {data.progress.milestones.map((item) => (
              <li key={item.id}>
                <strong>{item.label}</strong>
                <span>{item.status.replaceAll("_", " ")}</span>
                {item.evidence.length > 0 && (
                  <ul>
                    {item.evidence.map((proof, index) => (
                      <li key={index}>{proof}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
          <button
            className={desk.secondaryButton}
            disabled={disabled}
            onClick={() => void request({ action: "refresh_proof" })}
          >
            Check connected delivery and payment evidence
          </button>
          <details className={desk.details}>
            <summary>Original idea</summary>
            <p className={styles.preserved}>{state.rawIdea}</p>
          </details>
          <div
            className={styles.knowledge}
            aria-label="Knowledge and uncertainty"
          >
            {[
              {
                title: "Known from you and recorded sources",
                claims: state.claims.filter((item) =>
                  ["reported_fact", "preference"].includes(item.classification),
                ),
              },
              {
                title: "Assumed",
                claims: state.claims.filter(
                  (item) => item.classification === "assumption",
                ),
              },
              {
                title: "Need to research",
                claims: state.claims.filter(
                  (item) => item.classification === "hypothesis",
                ),
              },
            ].map((group) => (
              <section key={group.title}>
                <h4>{group.title}</h4>
                <p className={desk.helper}>
                  Recorded statements retain their classification; they are not
                  automatically verified.
                </p>
                {group.claims.length ? (
                  <ul>
                    {group.claims.map((claim) => (
                      <li key={claim.id}>
                        <p>{claim.statement}</p>
                        <small>
                          {claim.classification.replaceAll("_", " ")} ·{" "}
                          {claim.confidence} confidence
                        </small>
                        {claim.sourceIds.length > 0 && (
                          <p className={desk.helper}>
                            Sources: {claim.sourceIds.join(", ")}
                          </p>
                        )}
                        {claim.counterEvidenceIds.length > 0 && (
                          <p className={desk.helper}>
                            Counter-evidence:{" "}
                            {claim.counterEvidenceIds.join(", ")}
                          </p>
                        )}
                        {claim.limitations.map((limit, index) => (
                          <p className={desk.helper} key={index}>
                            {limit}
                          </p>
                        ))}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={desk.helper}>
                    No statements recorded in this group.
                  </p>
                )}
              </section>
            ))}
            <section>
              <h4>Need your decision</h4>
              {state.openDecisions.length ? (
                <ol>
                  {state.openDecisions.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ol>
              ) : (
                <p className={desk.helper}>
                  No open decisions recorded. This does not prove there are
                  none.
                </p>
              )}
            </section>
          </div>
          <details className={desk.details}>
            <summary>Research mandate and checkpoint</summary>
            <p className={desk.helper}>
              Set the objective and permitted sources first. Request bounded
              research below, or keep recording findings manually.
            </p>
            {state.checkpoint && (
              <p>
                <strong>{state.checkpoint.status}:</strong>{" "}
                {state.checkpoint.summary} Next: {state.checkpoint.nextStep}
              </p>
            )}
            <form
              onSubmit={(event) =>
                form(event, (fields) => ({
                  action: "set_mandate",
                  mandate: {
                    objective: value(fields, "objective"),
                    allowedSources: lines(fields.get("allowedSources")),
                    maximumSources: Number(value(fields, "maximumSources")),
                    spendLimitMinor: money(fields, "spendLimit"),
                    currency: value(fields, "currency").toUpperCase(),
                    paidApiAllowed: false,
                  },
                }))
              }
            >
              <fieldset disabled={disabled} className={styles.fields}>
                <legend>Research boundaries</legend>
                <Text
                  label="Research objective"
                  name="objective"
                  defaultValue={state.mandate?.objective}
                  required
                />
                <Text
                  label="Permitted sources or accounts — one per line"
                  name="allowedSources"
                  defaultValue={state.mandate?.allowedSources.join("\n")}
                  required
                />
                <Field
                  label="Maximum sources"
                  name="maximumSources"
                  type="number"
                  min={1}
                  max={100}
                  defaultValue={state.mandate?.maximumSources ?? 10}
                  required
                />
                <MoneyFields
                  label="Research spend limit"
                  amountName="spendLimit"
                  initialMinor={state.mandate?.spendLimitMinor ?? 0}
                  initialCurrency={state.mandate?.currency ?? "AUD"}
                />
                <button className={desk.secondaryButton} type="submit">
                  Save research boundaries
                </button>
              </fieldset>
            </form>
            <MissionResearch
              taskId={taskId}
              lifecycle={state}
              stale={disabled}
              onRefreshIdea={() => void request()}
            />
            <form
              onSubmit={(event) =>
                form(event, (fields) => ({
                  action: "checkpoint",
                  checkpoint: {
                    status: value(fields, "status") as
                      "partial" | "blocked" | "complete",
                    summary: value(fields, "summary"),
                    nextStep: value(fields, "nextStep"),
                    blockers: lines(fields.get("blockers")),
                  },
                }))
              }
            >
              <fieldset disabled={disabled} className={styles.fields}>
                <legend>Save a resumable checkpoint</legend>
                <Choice
                  label="Research status"
                  name="status"
                  defaultValue={state.checkpoint?.status}
                  options={[
                    ["partial", "Partial findings"],
                    ["blocked", "Blocked"],
                    ["complete", "Research scope completed"],
                  ]}
                />
                <Text
                  label="Findings so far"
                  name="summary"
                  defaultValue={state.checkpoint?.summary}
                  required
                />
                <Text
                  label="Next useful action"
                  name="nextStep"
                  defaultValue={state.checkpoint?.nextStep}
                  required
                />
                <Text
                  label="Specific blockers — one per line"
                  name="blockers"
                  defaultValue={state.checkpoint?.blockers.join("\n")}
                />
                <button className={desk.secondaryButton} type="submit">
                  Save checkpoint
                </button>
              </fieldset>
            </form>
          </details>
          <details className={desk.details}>
            <summary>Sources, claims and consequential decisions</summary>
            <ul className={styles.sources}>
              {state.sources.map((source) => (
                <li key={source.id}>
                  {source.reference.startsWith("https://") ? (
                    <a
                      href={source.reference}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {source.label}
                    </a>
                  ) : (
                    <span>{source.label} (link unavailable)</span>
                  )}
                  <small>
                    {source.id} · {source.kind} · independent group:{" "}
                    {source.independenceGroup}
                  </small>
                  <p>
                    {source.annotation || "No reference annotation recorded."}
                  </p>
                  <small>
                    Recorded rights:{" "}
                    {(source.rightsStatus ?? "unassessed").replaceAll("_", " ")}{" "}
                    · source assertion, not legal verification
                  </small>
                  <small>Recorded {source.capturedAt}</small>
                  {source.limitations.map((limit, index) => (
                    <p key={index}>{limit}</p>
                  ))}
                </li>
              ))}
            </ul>
            <form
              onSubmit={(event) =>
                form(event, (fields) => {
                  const source: LifecycleSource = {
                    id: crypto.randomUUID(),
                    label: value(fields, "label"),
                    reference: value(fields, "reference"),
                    kind: value(fields, "kind") as LifecycleSource["kind"],
                    independenceGroup: value(fields, "independenceGroup"),
                    limitations: lines(fields.get("limitations")),
                    capturedAt: new Date().toISOString(),
                    annotation: value(fields, "annotation"),
                    rightsStatus: value(
                      fields,
                      "rightsStatus",
                    ) as LifecycleSource["rightsStatus"],
                  };
                  return {
                    action: "record_research",
                    sources: [...state.sources, source],
                    claims: state.claims,
                    openDecisions: state.openDecisions,
                  };
                })
              }
            >
              <fieldset disabled={disabled} className={styles.fields}>
                <legend>Add a source</legend>
                <Field
                  label="Source title"
                  name="label"
                  required
                  maxLength={4000}
                />
                <Field
                  label="Source URL (https)"
                  name="reference"
                  type="url"
                  pattern="https://.*"
                  required
                  maxLength={2000}
                />
                <Choice
                  label="Source type"
                  name="kind"
                  options={[
                    ["primary", "Primary publication"],
                    ["secondary", "Secondary report"],
                    ["founder", "Founder testimony"],
                    ["observation", "Direct observation"],
                  ]}
                />
                <Field
                  label="Independent origin or publisher"
                  name="independenceGroup"
                  required
                  maxLength={100}
                />
                <Text
                  label="Why this reference matters (quality or acceptance criterion)"
                  name="annotation"
                />
                <Choice
                  label="Recorded rights status"
                  name="rightsStatus"
                  options={[
                    ["unassessed", "Unassessed"],
                    ["permission_required", "Permission required"],
                    [
                      "permission_recorded",
                      "Permission recorded by source or founder",
                    ],
                    ["licensed", "Licensed according to source"],
                    ["original", "Original according to source"],
                  ]}
                />
                <p className={desk.helper}>
                  Rights status records the supplied assertion. It does not
                  verify legal permission to reuse the material.
                </p>
                <Text
                  label="Source limitations — one per line"
                  name="limitations"
                />
                <button className={desk.secondaryButton} type="submit">
                  Add source
                </button>
              </fieldset>
            </form>
            <form
              onSubmit={(event) =>
                form(event, (fields) => {
                  const claim: LifecycleClaim = {
                    id: crypto.randomUUID(),
                    statement: value(fields, "statement"),
                    classification: value(
                      fields,
                      "classification",
                    ) as LifecycleClaim["classification"],
                    confidence: value(
                      fields,
                      "confidence",
                    ) as LifecycleClaim["confidence"],
                    sourceIds: fields.getAll("sourceIds").map(String),
                    counterEvidenceIds: fields
                      .getAll("counterEvidenceIds")
                      .map(String),
                    limitations: lines(fields.get("limitations")),
                  };
                  return {
                    action: "record_research",
                    sources: state.sources,
                    claims: [...state.claims, claim],
                    openDecisions: state.openDecisions,
                  };
                })
              }
            >
              <fieldset disabled={disabled} className={styles.fields}>
                <legend>Add a classified statement</legend>
                <Text label="Statement" name="statement" required />
                <Choice
                  label="Knowledge classification"
                  name="classification"
                  options={[
                    ["reported_fact", "Reported fact — requires evidence"],
                    ["preference", "User preference"],
                    ["hypothesis", "Hypothesis — research needed"],
                    ["assumption", "Assumption"],
                  ]}
                />
                <Choice
                  label="Confidence in this statement"
                  name="confidence"
                  options={[
                    ["low", "Low"],
                    ["medium", "Medium"],
                    ["high", "High"],
                  ]}
                />
                {state.sources.length > 0 && (
                  <div>
                    <p>Supporting and contradicting sources</p>
                    {state.sources.map((source) => (
                      <div className={styles.sourceChoices} key={source.id}>
                        <span>{source.label}</span>
                        <label>
                          <input
                            type="checkbox"
                            name="sourceIds"
                            value={source.id}
                          />{" "}
                          Supports
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            name="counterEvidenceIds"
                            value={source.id}
                          />{" "}
                          Contradicts
                        </label>
                      </div>
                    ))}
                  </div>
                )}
                <Text
                  label="Statement limitations — one per line"
                  name="limitations"
                />
                <button className={desk.secondaryButton} type="submit">
                  Add statement
                </button>
              </fieldset>
            </form>
            <form
              onSubmit={(event) =>
                form(event, (fields) => ({
                  action: "record_research",
                  sources: state.sources,
                  claims: state.claims,
                  openDecisions: lines(fields.get("openDecisions")),
                }))
              }
            >
              <fieldset disabled={disabled} className={styles.fields}>
                <legend>Consequential decisions</legend>
                <Text
                  label="Open decisions — one per line"
                  name="openDecisions"
                  defaultValue={state.openDecisions.join("\n")}
                />
                <p className={desk.helper}>
                  Keep “Research this” or “Not decided” visible in a decision
                  rather than silently assuming the answer.
                </p>
                <button className={desk.secondaryButton} type="submit">
                  Save decisions
                </button>
              </fieldset>
            </form>
          </details>
          <BriefForms
            state={state}
            disabled={disabled}
            form={form}
            request={request}
          />
          {state.approval &&
            state.brief &&
            state.approval.briefHash === state.brief.hash &&
            onPrepareReviewed && (
              <div className={desk.approval}>
                <div>
                  <h4>Continue with the reviewed brief</h4>
                  <p>
                    The saved brief becomes the existing delivery specification
                    without a paid AI preparation call. Review branch-build
                    consent next; merge, publication and customer actions retain
                    their own authority.
                  </p>
                </div>
                <button
                  className={desk.primaryButton}
                  disabled={disabled}
                  onClick={onPrepareReviewed}
                >
                  Prepare reviewed brief for build
                </button>
              </div>
            )}
          <details className={desk.details}>
            <summary>Launch, onboarding and paying-client target</summary>
            <p className={desk.helper}>
              Agree the target before judging success. Only connected provider
              evidence can prove live payments; saving this contract cannot
              create a payment or activation.
            </p>
            <OutcomeForm state={state} disabled={disabled} form={form} />
            <p>
              Verified eligible clients:{" "}
              {data.progress.commercial.eligibleClients}
              {data.progress.commercial.requiredClients != null
                ? ` / ${data.progress.commercial.requiredClients}`
                : " · target not agreed"}{" "}
              · {data.progress.commercial.status.replaceAll("_", " ")}
            </p>
          </details>
          {data.handoff && (
            <details className={desk.details} open>
              <summary>Non-executable draft handoff</summary>
              <p className={desk.helper}>
                This export preserves the reviewed snapshot. Research-brief
                approval does not grant build, merge, launch, outreach or
                payment authority.
              </p>
              <Text
                label="Draft build prompt"
                name="draftPrompt"
                readOnly
                defaultValue={data.handoff.prompt}
              />
              <a
                download="idea-handoff.txt"
                href={`data:text/plain;charset=utf-8,${encodeURIComponent(data.handoff.prompt)}`}
              >
                Download prompt
              </a>
              {" · "}
              <a
                download="idea-manifest.json"
                href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data.handoff.manifest, null, 2))}`}
              >
                Download manifest
              </a>
            </details>
          )}
        </div>
      )}
    </section>
  );
}

function BriefForms({
  state,
  disabled,
  form,
  request,
}: {
  state: IdeaLifecycle;
  disabled: boolean;
  form: (
    event: FormEvent<HTMLFormElement>,
    build: (fields: FormData) => Update,
  ) => void;
  request: (command: Update) => Promise<void>;
}) {
  const brief = state.brief?.snapshot.brief;
  return (
    <details className={desk.details}>
      <summary>Versioned brief, review and design handoff</summary>
      {state.briefHistory.length > 0 && (
        <details className={desk.details}>
          <summary>
            Previous brief snapshots ({state.briefHistory.length})
          </summary>
          {state.briefHistory.map((previous) => (
            <section key={previous.hash}>
              <h4>
                Revision {previous.snapshot.revision} · {previous.createdAt}
              </h4>
              <p>{previous.snapshot.brief.objective}</p>
              <p className={styles.hash}>{previous.hash}</p>
              <ul>
                {previous.snapshot.brief.acceptanceCriteria.map((item) => (
                  <li key={item.id}>
                    {item.criterion} — {item.validation}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </details>
      )}
      {state.brief && (
        <section aria-label="Current proposed brief">
          <h4>Proposed brief · revision {state.brief.snapshot.revision}</h4>
          <p>{brief?.objective}</p>
          <p>
            User: {brief?.user} · Payer: {brief?.payer}
          </p>
          <p className={styles.hash}>Snapshot: {state.brief.hash}</p>
          <ul>
            {brief?.acceptanceCriteria.map((item) => (
              <li key={item.id}>
                {item.criterion} — verify: {item.validation}
              </li>
            ))}
          </ul>
          <p>Design: {brief?.design.summary}</p>
          <ol>
            {brief?.outputs.map((item) => (
              <li key={item.id}>
                {outputLabels[item.id - 1]} · {item.status.replaceAll("_", " ")}
                : {item.content}
              </li>
            ))}
          </ol>
          <p>
            {state.approval
              ? "This exact research brief has been approved. Delivery still needs its existing action-specific authority."
              : "This version is awaiting your review."}
          </p>
          <div className={styles.actions}>
            {!state.approval ? (
              <button
                className={desk.primaryButton}
                disabled={disabled}
                onClick={() =>
                  void request({
                    action: "approve_brief",
                    briefHash: state.brief!.hash,
                  })
                }
              >
                Approve this research brief
              </button>
            ) : (
              <button
                className={desk.secondaryButton}
                disabled={disabled}
                onClick={() => void request({ action: "revoke_approval" })}
              >
                Revoke research-brief approval
              </button>
            )}
            <button
              className={desk.secondaryButton}
              disabled={disabled}
              onClick={() => void request({ action: "create_handoff" })}
            >
              Generate draft handoff
            </button>
          </div>
        </section>
      )}
      <details className={desk.details}>
        <summary>
          {brief ? "Propose a revised brief" : "Propose a first brief"}
        </summary>
        <p className={desk.helper}>
          A new snapshot preserves prior history and invalidates affected
          approval. Explain each missing output instead of inventing findings.
        </p>
        <form
          onSubmit={(event) =>
            form(event, (fields) => ({
              action: "propose_brief",
              brief: {
                objective: value(fields, "objective"),
                user: value(fields, "user"),
                payer: value(fields, "payer"),
                nonGoals: lines(fields.get("nonGoals")),
                acceptanceCriteria: lines(fields.get("criterion")).map(
                  (criterion, index) => ({
                    id:
                      brief?.acceptanceCriteria[index]?.id ??
                      crypto.randomUUID(),
                    criterion,
                    validation: lines(fields.get("validation"))[index] ?? "",
                  }),
                ),
                outputs: outputLabels.map((_, index) => ({
                  id: index + 1,
                  status: value(fields, `outputStatus${index}`) as
                    "included" | "blocked" | "deferred" | "not_applicable",
                  content: value(fields, `outputContent${index}`),
                })),
                design: {
                  summary: value(fields, "design"),
                  sourceIds: fields.getAll("designSources").map(String),
                },
                target: {
                  repository: value(fields, "repository"),
                  baseBranch: "main",
                },
                risks: lines(fields.get("risks")),
                openDecisions: state.openDecisions,
              },
            }))
          }
        >
          <fieldset disabled={disabled} className={styles.fields}>
            <legend>Brief proposal</legend>
            <Text
              label="Observable objective"
              name="objective"
              defaultValue={brief?.objective}
              required
            />
            <Field
              label="Intended user"
              name="user"
              defaultValue={brief?.user}
              required
              maxLength={4000}
            />
            <Field
              label="Intended payer"
              name="payer"
              defaultValue={brief?.payer}
              required
              maxLength={4000}
            />
            <Text
              label="Outside the scope — one per line"
              name="nonGoals"
              defaultValue={brief?.nonGoals.join("\n")}
            />
            <Text
              label="Acceptance criteria — one per line"
              name="criterion"
              defaultValue={brief?.acceptanceCriteria
                .map((item) => item.criterion)
                .join("\n")}
              required
            />
            <Text
              label="Verification for each criterion — matching lines"
              name="validation"
              defaultValue={brief?.acceptanceCriteria
                .map((item) => item.validation)
                .join("\n")}
              required
            />
            <Text
              label="Proposed design and user journey"
              name="design"
              defaultValue={brief?.design.summary}
              required
            />
            {state.sources.map((source) => (
              <label key={source.id}>
                <input
                  type="checkbox"
                  name="designSources"
                  value={source.id}
                  defaultChecked={brief?.design.sourceIds.includes(source.id)}
                />{" "}
                Design reference: {source.label}
              </label>
            ))}
            <Field
              label="Target repository (owner/repository)"
              name="repository"
              defaultValue={brief?.target.repository}
              pattern="[\w.-]+/[\w.-]+"
              required
              maxLength={200}
            />
            <p className={desk.helper}>
              Target branch: main. References are recorded here; this does not
              connect a repository.
            </p>
            <Text
              label="Risks — one per line"
              name="risks"
              defaultValue={brief?.risks.join("\n")}
            />
            {outputLabels.map((label, index) => (
              <details className={styles.output} key={label}>
                <summary>
                  {index + 1}. {label}
                </summary>
                <Choice
                  label={`${label}: coverage`}
                  name={`outputStatus${index}`}
                  defaultValue={
                    brief?.outputs.find((item) => item.id === index + 1)
                      ?.status ?? "blocked"
                  }
                  options={[
                    ["included", "Included with evidence"],
                    ["blocked", "Blocked — explain why"],
                    ["deferred", "Deferred — explain why"],
                    ["not_applicable", "Not applicable — explain why"],
                  ]}
                />
                <Text
                  label={`${label}: finding or reason`}
                  name={`outputContent${index}`}
                  defaultValue={
                    brief?.outputs.find((item) => item.id === index + 1)
                      ?.content
                  }
                  required
                />
              </details>
            ))}
            <button className={desk.primaryButton} type="submit">
              Save proposed brief snapshot
            </button>
          </fieldset>
        </form>
      </details>
    </details>
  );
}

function OutcomeForm({
  state,
  disabled,
  form,
}: {
  state: IdeaLifecycle;
  disabled: boolean;
  form: (
    event: FormEvent<HTMLFormElement>,
    build: (fields: FormData) => Update,
  ) => void;
}) {
  const outcome = state.outcome;
  return (
    <form
      onSubmit={(event) =>
        form(event, (fields) => ({
          action: "set_outcome",
          outcome: {
            repository: value(fields, "repository"),
            baseBranch: "main",
            productId: value(fields, "productId"),
            stripeAccountId: value(fields, "stripeAccountId"),
            activationEvent: value(fields, "activationEvent"),
            requiredClients: Number(value(fields, "requiredClients")),
            currency: value(fields, "currency").toUpperCase(),
            minimumNetMinor: stripeAmountToMinor(
              value(fields, "minimumNet"),
              value(fields, "currency").toUpperCase(),
            ),
            windowStart: outcomeTime(value(fields, "windowStart")),
            windowEnd: outcomeTime(value(fields, "windowEnd")),
          },
        }))
      }
    >
      <fieldset disabled={disabled} className={styles.fields}>
        <legend>Commercial outcome contract</legend>
        <Field
          label="Outcome repository (owner/repository)"
          name="repository"
          defaultValue={
            outcome?.repository ?? state.brief?.snapshot.brief.target.repository
          }
          pattern="[\w.-]+/[\w.-]+"
          required
          maxLength={200}
        />
        <Field
          label="Live Stripe account identifier"
          name="stripeAccountId"
          defaultValue={outcome?.stripeAccountId}
          pattern="acct_[A-Za-z0-9]+"
          required
          maxLength={100}
        />
        <Field
          label="Payment product identifier"
          name="productId"
          defaultValue={outcome?.productId}
          required
          maxLength={100}
        />
        <Field
          label="First valuable customer action (activation event)"
          name="activationEvent"
          defaultValue={outcome?.activationEvent}
          required
          maxLength={100}
        />
        <Field
          label="Required distinct paying clients"
          name="requiredClients"
          type="number"
          min={1}
          max={100000}
          defaultValue={outcome?.requiredClients}
          required
        />
        <MoneyFields
          stripePayment
          label="Minimum net payment per client"
          amountName="minimumNet"
          initialMinor={outcome?.minimumNetMinor}
          initialCurrency={outcome?.currency ?? "AUD"}
        />
        <Field
          label="Measurement starts (include timezone, e.g. 2026-10-15T09:00:00+10:00)"
          name="windowStart"
          type="text"
          defaultValue={outcome?.windowStart}
          required
        />
        <Field
          label="Measurement ends (include timezone)"
          name="windowEnd"
          type="text"
          defaultValue={outcome?.windowEnd}
          required
        />
        <p className={desk.helper}>
          Refunds and disputes reduce eligibility. Test, pending and failed
          payments do not count; currencies are evaluated separately.
        </p>
        <button className={desk.secondaryButton} type="submit">
          Save commercial target
        </button>
      </fieldset>
    </form>
  );
}

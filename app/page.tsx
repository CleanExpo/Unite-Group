"use client";

import { useEffect, useRef, useState } from "react";
import { parseFindings } from "@/lib/findings";

type RunState = "idle" | "running" | "done" | "error";

interface Health {
  engine: { provider: string; models: string[]; ready: boolean; problem: string | null };
  database:
    | { state: "ok"; savedSpecs: number }
    | { state: "not_configured" }
    | { state: "error"; problem: string };
  knowledge?: { configured: boolean; repo: string | null; notes: number | null };
  board?: { seats: string[] };
  skills?: { name: string; description: string }[];
  research?: { configured: boolean; provider: string | null };
}

const C = {
  bg: "#0b0d0f",
  panel: "#14171b",
  panelEdge: "#1f242b",
  border: "#2a3038",
  text: "#e8eaed",
  dim: "#8b939e",
  green: "#34d399",
  amber: "#fbbf24",
  red: "#f87171",
  accent: "#e8743b",
  mono: "ui-monospace, 'SF Mono', Menlo, monospace",
};

const GLOBAL_CSS = `
@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: .25 } }
@keyframes glow {
  0%,100% { box-shadow: 0 0 0 1px rgba(251,191,36,.45), 0 0 18px rgba(251,191,36,.12); }
  50%     { box-shadow: 0 0 0 1px rgba(251,191,36,.9),  0 0 28px rgba(251,191,36,.30); }
}
@keyframes sweep {
  0% { transform: translateX(-100%); } 100% { transform: translateX(260%); }
}
@keyframes blink { 0%,100% { opacity: 1 } 50% { opacity: 0 } }
`;

function StatusStrip() {
  const [health, setHealth] = useState<Health | null>(null);
  const [failed, setFailed] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncNote, setSyncNote] = useState("");

  const refresh = () =>
    fetch("/api/health")
      .then((res) => res.json())
      .then(setHealth)
      .catch(() => setFailed(true));

  useEffect(() => {
    refresh();
  }, []);

  async function syncVault() {
    setSyncing(true);
    setSyncNote("");
    try {
      const res = await fetch("/api/ingest", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setSyncNote(`Sync failed: ${data.error ?? res.status}`);
      } else {
        setSyncNote(`Synced ${data.ingested} notes from ${data.repo}`);
        refresh();
      }
    } catch (error) {
      setSyncNote(`Sync failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSyncing(false);
    }
  }

  const chip = (ok: boolean, label: string) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12.5,
        background: C.panel,
        border: `1px solid ${ok ? "#1f5c40" : "#6e3030"}`,
        color: ok ? C.green : C.red,
      }}
    >
      {ok ? "✓" : "✗"} {label}
    </span>
  );

  if (failed) return <div style={{ margin: "10px 0 20px" }}>{chip(false, "Status check failed — is the deployment healthy?")}</div>;
  if (!health) return <div style={{ margin: "10px 0 20px", color: C.dim, fontSize: 12.5 }}>Checking system status…</div>;

  const db = health.database;
  const kn = health.knowledge;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "10px 0 20px", alignItems: "center" }}>
      {chip(
        health.engine.ready,
        health.engine.ready
          ? `Engine ready: ${health.engine.provider} (${health.engine.models.join(" → ")})`
          : `Engine not ready: ${health.engine.problem}`,
      )}
      {chip(
        db.state === "ok",
        db.state === "ok"
          ? `Database connected (${db.savedSpecs} spec${db.savedSpecs === 1 ? "" : "s"} saved)`
          : db.state === "not_configured"
            ? "Database not configured — specs won't be saved"
            : `Database error: ${db.problem}`,
      )}
      {kn &&
        chip(
          (kn.notes ?? 0) > 0,
          (kn.notes ?? 0) > 0
            ? `2nd Brain linked (${kn.notes} notes${kn.repo ? ` from ${kn.repo}` : ""})`
            : "2nd Brain empty — push to the vault repo or run its sync workflow",
        )}
      {health.board &&
        chip(
          health.board.seats.length > 0,
          health.board.seats.length > 0
            ? `Board seated: ${health.board.seats.join(", ")}`
            : "Board empty — no profiles in knowledge/board",
        )}
      {health.research &&
        chip(
          health.research.configured,
          health.research.configured
            ? `Web research ready (${health.research.provider === "anthropic" ? "Anthropic web search" : "OpenRouter web plugin"})`
            : "Web research off — needs an Anthropic or OpenRouter key",
        )}
      {health.skills && (
        <span
          title={health.skills.map((s) => `${s.name} — ${s.description}`).join("\n\n")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: 999,
            fontSize: 12.5,
            background: C.panel,
            border: `1px solid ${health.skills.length > 0 ? "#1f5c40" : "#6e3030"}`,
            color: health.skills.length > 0 ? C.green : C.red,
            cursor: "help",
          }}
        >
          {health.skills.length > 0
            ? `✓ Skills: ${health.skills.map((s) => s.name).join(" · ")}`
            : "✗ No skills installed"}
        </span>
      )}
      {kn?.configured && (
        <button
          onClick={syncVault}
          disabled={syncing}
          style={{
            padding: "4px 12px",
            borderRadius: 999,
            fontSize: 12.5,
            background: C.panel,
            color: syncing ? C.dim : C.text,
            border: `1px solid ${C.border}`,
            cursor: syncing ? "wait" : "pointer",
          }}
        >
          {syncing ? "Syncing vault…" : "Sync vault"}
        </button>
      )}
      {syncNote && <span style={{ color: C.dim, fontSize: 12.5 }}>{syncNote}</span>}
    </div>
  );
}

// ── Cockpit ──────────────────────────────────────────────────────────────

const STATUS_SUBJECTS: Record<string, string> = {
  "finish-line": "FINISH LINE",
  "channel:obsidian": "OBSIDIAN",
  "channel:project": "PROJECT",
  "channel:web": "WEB",
  synthesis: "SYNTHESIS",
  board: "BOARD",
  gate: "GATE",
};

type StageState = "pending" | "active" | "done" | "failed" | "skipped";

interface Stage {
  state: StageState;
  detail: string;
}

const stageColor = (s: StageState) =>
  s === "done" ? C.green : s === "active" ? C.amber : s === "failed" ? C.red : C.dim;

function Tile({ label, stage }: { label: string; stage: Stage }) {
  const color = stageColor(stage.state);
  const active = stage.state === "active";
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background: C.panel,
        border: `1px solid ${stage.state === "pending" ? C.border : color}`,
        borderRadius: 10,
        padding: "10px 12px",
        minHeight: 64,
        opacity: stage.state === "pending" || stage.state === "skipped" ? 0.55 : 1,
        ...(active ? { animation: "glow 1.6s ease-in-out infinite" } : {}),
      }}
    >
      {active && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: 2,
            width: "40%",
            background: `linear-gradient(90deg, transparent, ${C.amber}, transparent)`,
            animation: "sweep 1.4s linear infinite",
          }}
        />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: stage.state === "pending" ? C.border : color,
            boxShadow: stage.state === "done" ? `0 0 8px ${C.green}` : "none",
            ...(active ? { animation: "pulse 1.1s ease-in-out infinite" } : {}),
          }}
        />
        <span style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: 1.5, color: C.text }}>
          {label}
        </span>
      </div>
      <div
        style={{
          marginTop: 6,
          fontFamily: C.mono,
          fontSize: 11,
          lineHeight: 1.45,
          color: stage.state === "failed" ? C.red : C.dim,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {stage.detail}
      </div>
    </div>
  );
}

function Cockpit({
  stages,
  statusLines,
  feed,
  running,
  elapsed,
  streamed,
  provider,
  approved,
  specId,
  runDone,
}: {
  stages: Record<string, Stage>;
  statusLines: Record<string, string>;
  feed: string[];
  running: boolean;
  elapsed: number;
  streamed: number;
  provider: string;
  approved: boolean;
  specId: string | null;
  runDone: boolean;
}) {
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  const subjectStage = (subject: string): Stage => {
    if (subject === "gate") {
      if (approved) return { state: "done", detail: "approved by you" };
      if (runDone && specId) return { state: "active", detail: "awaiting your approval" };
    }
    if (statusLines[subject] !== undefined) return { state: "done", detail: statusLines[subject] };
    if (stages.engine.state === "active") return { state: "pending", detail: "standing by" };
    return { state: "skipped", detail: "no signal" };
  };

  return (
    <section
      style={{
        marginTop: 22,
        background: `linear-gradient(180deg, ${C.panelEdge}, ${C.bg})`,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontFamily: C.mono, fontSize: 12, letterSpacing: 3, color: C.accent }}>
          ▮ FABLE COCKPIT
        </div>
        <div style={{ display: "flex", gap: 16, fontFamily: C.mono, fontSize: 11.5, color: C.dim }}>
          <span>
            T+{mm}:{ss}
          </span>
          <span>{(streamed / 1000).toFixed(1)}k chars</span>
          <span style={{ color: running ? C.amber : C.green }}>
            {running ? "● LIVE" : "■ COMPLETE"}
          </span>
          {provider && <span>{provider.toUpperCase()}</span>}
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))",
          gap: 10,
        }}
      >
        <Tile label="ENGINE" stage={stages.engine} />
        {Object.entries(STATUS_SUBJECTS).map(([subject, label]) => (
          <Tile key={subject} label={label} stage={subjectStage(subject)} />
        ))}
        <Tile label="SAVE" stage={stages.save} />
        <Tile label="CRITIC" stage={stages.critic} />
      </div>

      {feed.length > 0 && (
        <div
          style={{
            marginTop: 12,
            background: "#0e1013",
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "8px 12px",
            fontFamily: C.mono,
            fontSize: 11.5,
            lineHeight: 1.7,
            color: C.dim,
            maxHeight: 120,
            overflowY: "auto",
          }}
        >
          {feed.map((line, i) => (
            <div key={i} style={{ color: i === feed.length - 1 ? C.text : C.dim }}>
              <span style={{ color: C.accent }}>›</span> {line}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const initialStages = (): Record<string, Stage> => ({
  engine: { state: "pending", detail: "standing by" },
  save: { state: "pending", detail: "standing by" },
  critic: { state: "pending", detail: "standing by" },
});

// ── Page ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [vision, setVision] = useState("");
  const [spec, setSpec] = useState("");
  const [critique, setCritique] = useState("");
  const [criticLabel, setCriticLabel] = useState("");
  const [state, setState] = useState<RunState>("idle");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [stages, setStages] = useState<Record<string, Stage>>(initialStages);
  const [statusLines, setStatusLines] = useState<Record<string, string>>({});
  const [feed, setFeed] = useState<string[]>([]);
  const [specId, setSpecId] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [provider, setProvider] = useState("");
  const [boardResponses, setBoardResponses] = useState<
    {
      name: string;
      seat: string;
      critique: string;
      findings: { priority: string; text: string }[];
    }[]
  >([]);
  const [selectedFindings, setSelectedFindings] = useState<Set<string>>(new Set());
  const [boardSynthesis, setBoardSynthesis] = useState("");
  const [boardRunning, setBoardRunning] = useState(false);
  const [boardNote, setBoardNote] = useState("");
  const [questions, setQuestions] = useState<string[] | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [clarifying, setClarifying] = useState(false);
  const [refineText, setRefineText] = useState("");
  const [evidence, setEvidence] = useState<{
    verified: number;
    inference: number;
    unconfirmed: number;
  } | null>(null);
  const [library, setLibrary] = useState<
    | {
        specId: string;
        vision: string;
        createdAt: string;
        approvedAt: string | null;
        parentSpecId: string | null;
      }[]
    | null
  >(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryNote, setLibraryNote] = useState("");
  const lineBuffer = useRef("");

  const running = state === "running";

  useEffect(() => {
    if (!running) return;
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [running]);

  const setStage = (name: string, stage: Stage) =>
    setStages((prev) => ({ ...prev, [name]: stage }));

  const addFeed = (line: string) =>
    setFeed((prev) => [...prev.slice(-30), line]);

  function scanForStatusLines(delta: string) {
    lineBuffer.current += delta;
    let nl: number;
    while ((nl = lineBuffer.current.indexOf("\n")) >= 0) {
      const line = lineBuffer.current.slice(0, nl).trim();
      lineBuffer.current = lineBuffer.current.slice(nl + 1);
      const match = line.match(/^\[STATUS\]\s*([a-z:-]+)\s*[:—-]?\s*(.*)$/i);
      if (match && match[1].toLowerCase() in STATUS_SUBJECTS) {
        const detail = match[2].trim() || "done";
        setStatusLines((prev) => ({ ...prev, [match[1].toLowerCase()]: detail }));
        addFeed(`${match[1].toLowerCase()} — ${detail}`);
      }
    }
  }

  // Step 1 of a run: fetch 3-4 clarifying questions so the engine's one
  // shot lands better. Best-effort — failure falls through to a plain run.
  async function clarify() {
    setClarifying(true);
    setMessage("");
    try {
      const res = await fetch("/api/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vision }),
      });
      const data = await res.json().catch(() => null);
      const qs: string[] = Array.isArray(data?.questions) ? data.questions : [];
      if (qs.length === 0) {
        await run();
        return;
      }
      setQuestions(qs);
      setAnswers(qs.map(() => ""));
    } catch {
      await run();
    } finally {
      setClarifying(false);
    }
  }

  async function run(extra?: {
    refinement?: string;
    previousSpec?: string;
    previousSpecId?: string;
  }) {
    const clarifications =
      !extra && questions
        ? questions
            .map((question, i) => ({ question, answer: (answers[i] ?? "").trim() }))
            .filter((c) => c.answer.length > 0)
        : [];

    setState("running");
    setMessage("");
    setSpec("");
    setCritique("");
    setCriticLabel("");
    setCopied(false);
    setStages(initialStages());
    setStatusLines({});
    setFeed(["run started"]);
    setSpecId(null);
    setApproved(false);
    setElapsed(0);
    setProvider("");
    setBoardResponses([]);
    setBoardSynthesis("");
    setBoardNote("");
    setSelectedFindings(new Set());
    setQuestions(null);
    setRefineText("");
    setEvidence(null);
    setLibraryOpen(false);
    lineBuffer.current = "";

    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vision,
          ...(clarifications.length > 0 ? { clarifications } : {}),
          ...(extra?.refinement
            ? {
                refinement: extra.refinement,
                previousSpec: extra.previousSpec,
                ...(extra.previousSpecId ? { previousSpecId: extra.previousSpecId } : {}),
              }
            : {}),
        }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        setState("error");
        setMessage(data?.error ?? `Request failed (${res.status})`);
        return;
      }

      setStage("engine", { state: "active", detail: "spinning up…" });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let sep: number;
        while ((sep = buffer.indexOf("\n\n")) >= 0) {
          const frame = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          const dataLine = frame.split("\n").find((l) => l.startsWith("data: "));
          if (!dataLine) continue;
          let event: any;
          try {
            event = JSON.parse(dataLine.slice(6));
          } catch {
            continue;
          }
          handleEvent(event);
        }
      }
      setState((s) => (s === "running" ? "done" : s));
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  function handleEvent(event: any) {
    switch (event.type) {
      case "meta":
        setProvider(event.provider ?? "");
        setStage("engine", {
          state: "active",
          detail: `${event.provider} · ${(event.models ?? []).join(" → ")}`,
        });
        addFeed(`engine dispatched on ${event.provider}`);
        break;
      case "knowledge":
        if (event.count > 0) {
          setStatusLines((prev) => ({
            ...prev,
            "channel:obsidian": `${event.count} vault note${event.count === 1 ? "" : "s"} attached`,
          }));
          addFeed(`obsidian channel: ${event.count} vault notes retrieved`);
        } else {
          addFeed("obsidian channel: no matching vault notes");
        }
        break;
      case "web":
        if (event.count > 0) {
          setStatusLines((prev) => ({
            ...prev,
            "channel:web": `${event.count} fresh source${event.count === 1 ? "" : "s"} attached`,
          }));
          addFeed(`web channel: ${event.count} fresh sources retrieved`);
        } else {
          addFeed("web channel: no research material retrieved");
        }
        break;
      case "delta":
        setSpec((prev) => prev + event.text);
        scanForStatusLines(event.text);
        break;
      case "engine_retry":
        // Primary model returned a stub — wipe its output and restart the
        // board for the fallback attempt.
        setSpec("");
        setStatusLines({});
        lineBuffer.current = "";
        setStage("engine", {
          state: "active",
          detail: `retrying on ${(event.nextModels ?? []).join(" → ")}`,
        });
        addFeed(`${event.failedModel} returned a stub — retrying on fallback`);
        break;
      case "engine_done":
        setStage("engine", { state: "done", detail: `complete · ${event.model}` });
        setStage("save", { state: "active", detail: "writing to Supabase…" });
        addFeed(`engine complete (${event.model})`);
        break;
      case "saved":
        setSpecId(event.specId);
        setStage("save", { state: "done", detail: `spec ${String(event.specId).slice(0, 8)}…` });
        addFeed("spec saved to database");
        setLibrary(null); // stale — refetch on next open
        break;
      case "evidence":
        setEvidence({
          verified: event.verified ?? 0,
          inference: event.inference ?? 0,
          unconfirmed: event.unconfirmed ?? 0,
        });
        addFeed(
          `evidence ledger: ${event.verified} verified · ${event.inference} inference · ${event.unconfirmed} unconfirmed`,
        );
        break;
      case "evidence_error":
        addFeed(`evidence ledger failed: ${event.error}`);
        break;
      case "save_skipped":
        setStage("save", { state: "skipped", detail: "Supabase not configured" });
        addFeed("save skipped — no database");
        break;
      case "save_error":
        setStage("save", { state: "failed", detail: event.error });
        addFeed(`save failed: ${event.error}`);
        break;
      case "critic_start":
        setStage("critic", { state: "active", detail: `${event.provider} · ${event.model}` });
        addFeed(`critic reviewing (${event.provider})`);
        break;
      case "critique": {
        setCritique(event.text);
        setCriticLabel(`${event.provider} (${event.model})`);
        const v = event.text.match(/VERDICT:\s*(APPROVE|REVISE)/i)?.[1]?.toUpperCase();
        setStage("critic", { state: "done", detail: v ? `verdict: ${v}` : "review delivered" });
        addFeed(`critic verdict: ${v ?? "delivered"}`);
        break;
      }
      case "critic_skipped":
        setStage("critic", { state: "skipped", detail: "no critic configured" });
        addFeed("critic skipped");
        break;
      case "critic_error":
        setStage("critic", { state: "failed", detail: event.error });
        addFeed(`critic failed: ${event.error}`);
        break;
      case "done":
        setState("done");
        setMessage("Run complete");
        addFeed("run complete — gate open, awaiting your decision");
        break;
      case "error":
        setState("error");
        setMessage(event.error);
        setStage("engine", { state: "failed", detail: event.error });
        addFeed(`error: ${event.error}`);
        break;
    }
  }

  async function approve() {
    if (!specId) return;
    const res = await fetch("/api/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ specId }),
    });
    if (res.ok) {
      setApproved(true);
      addFeed("gate closed — spec approved");
    } else {
      const data = await res.json().catch(() => null);
      setMessage(`Approve failed: ${data?.error ?? res.status}`);
    }
  }

  // Ask the Board (Phase 3): persona critiques streamed seat by seat.
  // Board output is a lens, never truth — the approval gate stays with you.
  async function askBoard() {
    if (!specId) return;
    setBoardRunning(true);
    setBoardNote("");
    setBoardResponses([]);
    setBoardSynthesis("");
    setSelectedFindings(new Set());
    try {
      const res = await fetch("/api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specId }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        setBoardNote(`Board failed: ${data?.error ?? res.status}`);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let sep: number;
        while ((sep = buffer.indexOf("\n\n")) >= 0) {
          const frame = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          const dataLine = frame.split("\n").find((l) => l.startsWith("data: "));
          if (!dataLine) continue;
          let event: any;
          try {
            event = JSON.parse(dataLine.slice(6));
          } catch {
            continue;
          }
          handleBoardEvent(event);
        }
      }
    } catch (error) {
      setBoardNote(error instanceof Error ? error.message : String(error));
    } finally {
      setBoardRunning(false);
    }
  }

  function handleBoardEvent(event: any) {
    switch (event.type) {
      case "meta":
        addFeed(`board convened — ${(event.seats ?? []).length} seats`);
        break;
      case "seat_start":
        addFeed(`${event.name} reviewing…`);
        break;
      case "seat_done":
        setBoardResponses((prev) => [
          ...prev,
          {
            name: event.name,
            seat: event.seat,
            critique: event.critique,
            findings: Array.isArray(event.findings) ? event.findings : [],
          },
        ]);
        addFeed(`${event.name} responded`);
        break;
      case "seat_error":
        addFeed(`${event.name} failed: ${event.error}`);
        break;
      case "synthesis":
        setBoardSynthesis(event.text);
        break;
      case "done":
        setStatusLines((prev) => ({
          ...prev,
          board: `${event.responded}/${event.total} seats responded`,
        }));
        addFeed("board adjourned — lens only, the gate is still yours");
        break;
      case "error":
        setBoardNote(event.error);
        addFeed(`board error: ${event.error}`);
        break;
    }
  }

  // The Spec Library: reopen anything ever generated.
  async function openLibrary() {
    if (libraryOpen) {
      setLibraryOpen(false);
      return;
    }
    setLibraryOpen(true);
    setLibraryNote("");
    if (!library) {
      try {
        const res = await fetch("/api/specs");
        const data = await res.json();
        if (!res.ok) {
          setLibraryNote(data?.error ?? `Library failed (${res.status})`);
          return;
        }
        setLibrary(data.specs ?? []);
      } catch (error) {
        setLibraryNote(error instanceof Error ? error.message : String(error));
      }
    }
  }

  async function loadSpec(id: string) {
    setLibraryNote("");
    try {
      const res = await fetch(`/api/specs?id=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) {
        setLibraryNote(data?.error ?? `Load failed (${res.status})`);
        return;
      }
      setVision(data.vision ?? "");
      setSpec(data.content ?? "");
      setCritique(data.critique ?? "");
      setCriticLabel(data.critique ? "stored review" : "");
      setSpecId(data.specId);
      setApproved(Boolean(data.approvedAt));
      setEvidence(data.evidence ?? null);
      setBoardResponses(
        (data.boardResponses ?? []).map((r: { member: string; critique: string }) => ({
          name: r.member,
          seat: "stored response",
          critique: r.critique,
          findings: parseFindings(r.critique),
        })),
      );
      setBoardSynthesis("");
      setBoardNote("");
      setSelectedFindings(new Set());
      setQuestions(null);
      setRefineText("");
      setStages(initialStages());
      setStatusLines({});
      setFeed([]);
      setState("done");
      setMessage(`Loaded spec ${id.slice(0, 8)}… from the library`);
      setLibraryOpen(false);
    } catch (error) {
      setLibraryNote(error instanceof Error ? error.message : String(error));
    }
  }

  function download() {
    const clean = spec
      .split("\n")
      .filter((line) => !line.trim().startsWith("[STATUS]"))
      .join("\n");
    const blob = new Blob([clean], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `fable-spec-${specId ? specId.slice(0, 8) : "draft"}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function copy() {
    await navigator.clipboard.writeText(spec);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const displaySpec = spec
    .split("\n")
    .filter((line) => !line.trim().startsWith("[STATUS]"))
    .join("\n");
  const verdict = critique.match(/VERDICT:\s*(APPROVE|REVISE)/i)?.[1]?.toUpperCase() ?? null;

  return (
    <main style={{ maxWidth: 920, margin: "0 auto", padding: "48px 24px" }}>
      <style>{GLOBAL_CSS}</style>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>The Fable System</h1>
      <p style={{ color: C.dim, marginTop: 0 }}>
        Type a vision in plain English. Get a sourced, build-ready spec.
      </p>

      <StatusStrip />

      <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "0 0 16px" }}>
        <button
          onClick={openLibrary}
          style={{
            padding: "5px 14px",
            borderRadius: 999,
            fontSize: 12.5,
            background: C.panel,
            color: C.text,
            border: `1px solid ${libraryOpen ? C.accent : C.border}`,
            cursor: "pointer",
          }}
        >
          {libraryOpen ? "Close library" : "📚 Spec library"}
        </button>
        {libraryNote && <span style={{ color: C.red, fontSize: 12.5 }}>{libraryNote}</span>}
      </div>

      {libraryOpen && (
        <section
          style={{
            margin: "0 0 16px",
            padding: 12,
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          {!library && <span style={{ color: C.dim, fontSize: 13 }}>Loading…</span>}
          {library && library.length === 0 && (
            <span style={{ color: C.dim, fontSize: 13 }}>No specs saved yet.</span>
          )}
          {(library ?? []).map((item) => (
            <button
              key={item.specId}
              onClick={() => loadSpec(item.specId)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 10px",
                marginTop: 4,
                background: "transparent",
                color: C.text,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              <span style={{ fontFamily: C.mono, fontSize: 11, color: C.dim }}>
                {new Date(item.createdAt).toLocaleString()}
              </span>{" "}
              {item.approvedAt && <span style={{ color: C.green }}>✓ approved</span>}{" "}
              {item.parentSpecId && (
                <span style={{ color: C.amber, fontFamily: C.mono, fontSize: 11 }}>
                  revision
                </span>
              )}
              <div style={{ color: C.dim, marginTop: 2 }}>
                {item.vision.slice(0, 140)}
                {item.vision.length > 140 ? "…" : ""}
              </div>
            </button>
          ))}
        </section>
      )}

      <textarea
        value={vision}
        onChange={(e) => setVision(e.target.value)}
        placeholder="I want to build…"
        rows={5}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: 12,
          fontSize: 15,
          fontFamily: "inherit",
          background: C.panel,
          color: C.text,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          resize: "vertical",
        }}
      />

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
        <button
          onClick={() => clarify()}
          disabled={running || clarifying || vision.trim().length === 0}
          style={{
            padding: "10px 24px",
            fontSize: 15,
            fontWeight: 600,
            background: running || clarifying ? C.border : C.accent,
            color: running || clarifying ? C.dim : C.bg,
            border: "none",
            borderRadius: 8,
            cursor: running || clarifying ? "wait" : "pointer",
          }}
        >
          {running ? "Running…" : clarifying ? "Preparing questions…" : "Run"}
        </button>
        {message && (
          <span style={{ color: state === "error" ? C.red : C.dim, fontSize: 13 }}>{message}</span>
        )}
      </div>

      {questions && !running && (
        <section
          style={{
            marginTop: 16,
            padding: 16,
            background: C.panel,
            border: `1px solid ${C.accent}`,
            borderRadius: 8,
          }}
        >
          <h2 style={{ fontSize: 16, margin: 0 }}>Quick questions before the run</h2>
          <p style={{ color: C.dim, fontSize: 13, margin: "6px 0 0" }}>
            Answer any that help — every answer sharpens the one-shot spec. Blank ones are skipped.
          </p>
          {questions.map((q, i) => (
            <div key={i} style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13.5 }}>
                {i + 1}. {q}
              </div>
              <input
                value={answers[i] ?? ""}
                onChange={(e) =>
                  setAnswers((prev) => {
                    const next = [...prev];
                    next[i] = e.target.value;
                    return next;
                  })
                }
                placeholder="(optional)"
                style={{
                  marginTop: 6,
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "8px 10px",
                  fontSize: 14,
                  fontFamily: "inherit",
                  background: C.bg,
                  color: C.text,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                }}
              />
            </div>
          ))}
          <div style={{ display: "flex", gap: 12, marginTop: 16, alignItems: "center" }}>
            <button
              onClick={() => run()}
              style={{
                padding: "10px 24px",
                fontSize: 15,
                fontWeight: 600,
                background: C.accent,
                color: C.bg,
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Run engine →
            </button>
            <span style={{ color: C.dim, fontSize: 12.5 }}>
              {answers.filter((a) => a.trim()).length} of {questions.length} answered
            </span>
          </div>
        </section>
      )}

      {(running || spec) && (
        <Cockpit
          stages={stages}
          statusLines={statusLines}
          feed={feed}
          running={running}
          elapsed={elapsed}
          streamed={spec.length}
          provider={provider}
          approved={approved}
          specId={specId}
          runDone={state === "done"}
        />
      )}

      {spec && (
        <section style={{ marginTop: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>
              Spec{" "}
              {running && (
                <span style={{ color: C.amber, fontFamily: C.mono, fontSize: 12 }}>
                  ▮<span style={{ animation: "blink 1s step-end infinite" }}>▮</span> streaming
                </span>
              )}
            </h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={download}
                style={{
                  padding: "6px 14px",
                  fontSize: 13,
                  background: C.panel,
                  color: C.text,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Download .md
              </button>
              <button
                onClick={copy}
                style={{
                  padding: "6px 14px",
                  fontSize: 13,
                  background: C.panel,
                  color: C.text,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                {copied ? "Copied ✓" : "Copy"}
              </button>
            </div>
          </div>
          {evidence && (
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <span style={{ fontFamily: C.mono, fontSize: 11.5, color: C.green }}>
                ✓ {evidence.verified} VERIFIED
              </span>
              <span style={{ fontFamily: C.mono, fontSize: 11.5, color: C.amber }}>
                ◐ {evidence.inference} INFERENCE
              </span>
              <span style={{ fontFamily: C.mono, fontSize: 11.5, color: C.red }}>
                ⚠ {evidence.unconfirmed} UNCONFIRMED
              </span>
              <span style={{ fontSize: 11.5, color: C.dim }}>
                — evidence ledger, stored in findings
              </span>
            </div>
          )}
          <pre
            style={{
              marginTop: 12,
              padding: 16,
              background: C.panel,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: 13.5,
              lineHeight: 1.55,
            }}
          >
            {displaySpec}
          </pre>
        </section>
      )}

      {critique && (
        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 18, margin: 0 }}>
            Critic review{" "}
            <span style={{ color: C.dim, fontWeight: 400, fontSize: 13 }}>
              · {criticLabel} — a lens, not a verdict
            </span>
          </h2>
          {verdict && (
            <div
              style={{
                display: "inline-block",
                marginTop: 10,
                padding: "4px 12px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                fontFamily: C.mono,
                background: C.panel,
                border: `1px solid ${verdict === "APPROVE" ? "#1f5c40" : "#6e5320"}`,
                color: verdict === "APPROVE" ? C.green : C.amber,
              }}
            >
              CRITIC: {verdict}
            </div>
          )}
          <pre
            style={{
              marginTop: 12,
              padding: 16,
              background: C.panel,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: 13.5,
              lineHeight: 1.55,
            }}
          >
            {critique}
          </pre>
        </section>
      )}

      {state === "done" && spec && (
        <section
          style={{
            marginTop: 24,
            padding: 16,
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
          }}
        >
          <h2 style={{ fontSize: 16, margin: 0 }}>Refine this spec</h2>
          <p style={{ color: C.dim, fontSize: 13, margin: "6px 0 0" }}>
            Thought of something else? Describe what to add, change, or drop — the engine
            re-runs with this spec as the starting point and produces an updated version.
          </p>
          <textarea
            value={refineText}
            onChange={(e) => setRefineText(e.target.value)}
            placeholder="e.g. Add an offline mode, drop the billing phase, the finish line should mention mobile…"
            rows={3}
            style={{
              marginTop: 10,
              width: "100%",
              boxSizing: "border-box",
              padding: 10,
              fontSize: 14,
              fontFamily: "inherit",
              background: C.bg,
              color: C.text,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              resize: "vertical",
            }}
          />
          <button
            onClick={() =>
              run({
                refinement: refineText,
                previousSpec: spec,
                previousSpecId: specId ?? undefined,
              })
            }
            disabled={refineText.trim().length === 0}
            style={{
              marginTop: 10,
              padding: "8px 20px",
              fontSize: 14,
              fontWeight: 600,
              background: refineText.trim() ? C.accent : C.border,
              color: refineText.trim() ? C.bg : C.dim,
              border: "none",
              borderRadius: 8,
              cursor: refineText.trim() ? "pointer" : "not-allowed",
            }}
          >
            Refine & re-run
          </button>
        </section>
      )}

      {state === "done" && specId && (
        <section style={{ marginTop: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <button
              onClick={askBoard}
              disabled={boardRunning}
              style={{
                padding: "10px 24px",
                fontSize: 15,
                fontWeight: 600,
                background: boardRunning ? C.border : C.panel,
                color: boardRunning ? C.dim : C.text,
                border: `1px solid ${C.accent}`,
                borderRadius: 8,
                cursor: boardRunning ? "wait" : "pointer",
              }}
            >
              {boardRunning ? "Board in session…" : "Ask the board"}
            </button>
            <span style={{ color: C.dim, fontSize: 13 }}>
              Persona critiques from knowledge/board — a lens, never truth.
            </span>
            {boardNote && <span style={{ color: C.red, fontSize: 13 }}>{boardNote}</span>}
          </div>

          {boardResponses.map((r) => (
            <div key={r.name} style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 15, margin: 0 }}>
                {r.name}{" "}
                <span style={{ color: C.dim, fontWeight: 400, fontSize: 12.5 }}>
                  · {r.seat} — persona critique, not the real person
                </span>
              </h3>
              {r.findings.length > 0 ? (
                <div
                  style={{
                    marginTop: 8,
                    padding: "10px 14px",
                    background: C.panel,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                  }}
                >
                  {r.findings.map((f, i) => {
                    const key = `${r.name}|${i}`;
                    const checked = selectedFindings.has(key);
                    const priorityColor =
                      f.priority === "critical"
                        ? C.red
                        : f.priority === "important"
                          ? C.amber
                          : C.dim;
                    return (
                      <label
                        key={key}
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "baseline",
                          padding: "6px 0",
                          cursor: "pointer",
                          fontSize: 13,
                          lineHeight: 1.5,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedFindings((prev) => {
                              const next = new Set(prev);
                              if (next.has(key)) next.delete(key);
                              else next.add(key);
                              return next;
                            })
                          }
                        />
                        <span style={{ fontFamily: C.mono, fontSize: 11, color: C.dim }}>
                          {i + 1}.
                        </span>
                        <span
                          style={{
                            fontFamily: C.mono,
                            fontSize: 10.5,
                            letterSpacing: 0.5,
                            color: priorityColor,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {f.priority.toUpperCase()}
                        </span>
                        <span style={{ color: checked ? C.text : C.dim }}>{f.text}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <pre
                  style={{
                    marginTop: 8,
                    padding: 14,
                    background: C.panel,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontSize: 13,
                    lineHeight: 1.55,
                  }}
                >
                  {r.critique}
                </pre>
              )}
            </div>
          ))}

          {!boardRunning && boardResponses.some((r) => r.findings.length > 0) && (
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 16 }}>
              <button
                onClick={() => {
                  const chosen = boardResponses.flatMap((r) =>
                    r.findings
                      .map((f, i) => ({ key: `${r.name}|${i}`, member: r.name, f }))
                      .filter((x) => selectedFindings.has(x.key)),
                  );
                  if (chosen.length === 0) return;
                  const refinement = `Integrate these selected board findings into the spec:\n${chosen
                    .map((x) => `- [${x.member} — ${x.f.priority}] ${x.f.text}`)
                    .join("\n")}`;
                  run({ refinement, previousSpec: spec, previousSpecId: specId ?? undefined });
                }}
                disabled={selectedFindings.size === 0}
                style={{
                  padding: "10px 24px",
                  fontSize: 15,
                  fontWeight: 600,
                  background: selectedFindings.size > 0 ? C.green : C.border,
                  color: selectedFindings.size > 0 ? C.bg : C.dim,
                  border: "none",
                  borderRadius: 8,
                  cursor: selectedFindings.size > 0 ? "pointer" : "not-allowed",
                }}
              >
                Integrate {selectedFindings.size || ""} selected & re-run
              </button>
              <span style={{ color: C.dim, fontSize: 12.5 }}>
                Tick the findings you want folded into the next version of the spec.
              </span>
            </div>
          )}

          {boardSynthesis && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 15, margin: 0 }}>
                Board synthesis{" "}
                <span style={{ color: C.dim, fontWeight: 400, fontSize: 12.5 }}>
                  · [INFERENCE] — persona synthesis, not fact
                </span>
              </h3>
              <pre
                style={{
                  marginTop: 8,
                  padding: 14,
                  background: C.panel,
                  border: `1px solid ${C.accent}`,
                  borderRadius: 8,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontSize: 13,
                  lineHeight: 1.55,
                }}
              >
                {boardSynthesis}
              </pre>
            </div>
          )}
        </section>
      )}

      {state === "done" && spec && (
        <section
          style={{
            marginTop: 24,
            padding: 16,
            background: C.panel,
            border: `1px solid ${approved ? "#1f5c40" : C.border}`,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          {approved ? (
            <span style={{ color: C.green, fontWeight: 600 }}>✓ Approved — this spec is final</span>
          ) : (
            <>
              <button
                onClick={approve}
                disabled={!specId}
                style={{
                  padding: "10px 24px",
                  fontSize: 15,
                  fontWeight: 600,
                  background: specId ? C.green : C.border,
                  color: C.bg,
                  border: "none",
                  borderRadius: 8,
                  cursor: specId ? "pointer" : "not-allowed",
                }}
              >
                Approve spec
              </button>
              <span style={{ color: C.dim, fontSize: 13 }}>
                {specId
                  ? "Nothing is final until you approve. The critic is advisory only."
                  : "Approval needs the spec saved to the database first."}
              </span>
            </>
          )}
        </section>
      )}
    </main>
  );
}

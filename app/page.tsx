"use client";

import { useEffect, useState } from "react";

type RunState = "idle" | "running" | "done" | "error";

interface Health {
  engine: { provider: string; models: string[]; ready: boolean; problem: string | null };
  database:
    | { state: "ok"; savedSpecs: number }
    | { state: "not_configured" }
    | { state: "error"; problem: string };
}

function StatusStrip() {
  const [health, setHealth] = useState<Health | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then(setHealth)
      .catch(() => setFailed(true));
  }, []);

  const chip = (ok: boolean, label: string) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12.5,
        background: "#1a1d21",
        border: `1px solid ${ok ? "#2e5c3f" : "#6e3030"}`,
        color: ok ? "#7ed8a0" : "#f28b82",
      }}
    >
      {ok ? "✓" : "✗"} {label}
    </span>
  );

  if (failed) return <div style={{ margin: "10px 0 20px" }}>{chip(false, "Status check failed — is the deployment healthy?")}</div>;
  if (!health) return <div style={{ margin: "10px 0 20px", color: "#9aa0a6", fontSize: 12.5 }}>Checking system status…</div>;

  const db = health.database;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "10px 0 20px" }}>
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
    </div>
  );
}

export default function Home() {
  const [vision, setVision] = useState("");
  const [spec, setSpec] = useState("");
  const [state, setState] = useState<RunState>("idle");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  async function run() {
    setState("running");
    setMessage("");
    setSpec("");
    setCopied(false);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vision }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState("error");
        setMessage(data.error ?? `Request failed (${res.status})`);
        return;
      }
      setSpec(data.spec);
      setState("done");
      const via = data.provider ? ` · via ${data.provider} (${data.model})` : "";
      if (data.saved) {
        setMessage(`Saved to Supabase (spec ${data.saved.specId})${via}`);
      } else if (data.saveError) {
        setMessage(`Spec generated, but saving failed: ${data.saveError}${via}`);
      } else {
        setMessage(`Spec generated (Supabase not configured — not saved)${via}`);
      }
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(spec);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const running = state === "running";

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px" }}>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>The Fable System</h1>
      <p style={{ color: "#9aa0a6", marginTop: 0 }}>
        Type a vision in plain English. Get a sourced, build-ready spec.
      </p>

      <StatusStrip />

      <textarea
        value={vision}
        onChange={(e) => setVision(e.target.value)}
        placeholder="I want to build…"
        rows={6}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: 12,
          fontSize: 15,
          fontFamily: "inherit",
          background: "#1a1d21",
          color: "#e6e6e6",
          border: "1px solid #33373d",
          borderRadius: 8,
          resize: "vertical",
        }}
      />

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
        <button
          onClick={run}
          disabled={running || vision.trim().length === 0}
          style={{
            padding: "10px 24px",
            fontSize: 15,
            fontWeight: 600,
            background: running ? "#33373d" : "#d97742",
            color: running ? "#9aa0a6" : "#101214",
            border: "none",
            borderRadius: 8,
            cursor: running ? "wait" : "pointer",
          }}
        >
          {running ? "Running the engine…" : "Run"}
        </button>
        {message && (
          <span style={{ color: state === "error" ? "#f28b82" : "#9aa0a6", fontSize: 13 }}>
            {message}
          </span>
        )}
      </div>

      {running && (
        <p style={{ color: "#9aa0a6", fontSize: 13 }}>
          This can take a few minutes — the engine locks the finish line, works
          its channels, and writes the full spec before responding.
        </p>
      )}

      {spec && (
        <section style={{ marginTop: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>Spec</h2>
            <button
              onClick={copy}
              style={{
                padding: "6px 14px",
                fontSize: 13,
                background: "#1a1d21",
                color: "#e6e6e6",
                border: "1px solid #33373d",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <pre
            style={{
              marginTop: 12,
              padding: 16,
              background: "#1a1d21",
              border: "1px solid #33373d",
              borderRadius: 8,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: 13.5,
              lineHeight: 1.55,
            }}
          >
            {spec}
          </pre>
        </section>
      )}
    </main>
  );
}

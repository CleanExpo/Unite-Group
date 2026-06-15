"use client";

import { useState } from "react";

const C = {
  bg: "#0b0d0f",
  panel: "#14171b",
  border: "#2a3038",
  text: "#e8eaed",
  dim: "#8b939e",
  green: "#34d399",
  red: "#f87171",
  accent: "#e8743b",
  mono: "ui-monospace, 'SF Mono', Menlo, monospace",
};

export default function PlaybookPage() {
  const [corpusText, setCorpusText] = useState("");
  const [targetModel, setTargetModel] = useState("");
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [playbook, setPlaybook] = useState("");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);

  async function generate(useCorpus: boolean) {
    setState("running");
    setNote("");
    setPlaybook("");
    let body: Record<string, unknown> = {};
    if (useCorpus) {
      if (!corpusText.trim()) {
        setState("error");
        setNote("Paste a corpus.json first, or use “Generate generic”.");
        return;
      }
      try {
        body.corpus = JSON.parse(corpusText);
      } catch {
        setState("error");
        setNote("That isn’t valid JSON — run scripts/fable-distill.mjs and paste corpus.json.");
        return;
      }
    }
    if (targetModel.trim()) body.targetModel = targetModel.trim();

    try {
      const res = await fetch("/api/playbook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setState("error");
        setNote(data.error ?? `Request failed (${res.status})`);
        return;
      }
      setPlaybook(data.playbook);
      setState("done");
      setNote(
        data.grounded
          ? `Grounded on measured corpus (${data.baselineModel ?? "baseline"} vs ${data.fableModel ?? "Fable"}) · ${data.provider}:${data.model}`
          : `Generic playbook from the verified catalogue · ${data.provider}:${data.model}`,
      );
    } catch (error) {
      setState("error");
      setNote(error instanceof Error ? error.message : String(error));
    }
  }

  function copy() {
    navigator.clipboard.writeText(playbook).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function download() {
    const blob = new Blob([playbook], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "FABLE_PLAYBOOK.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  const btn = (primary: boolean): React.CSSProperties => ({
    padding: "9px 16px",
    borderRadius: 8,
    border: `1px solid ${primary ? C.accent : C.border}`,
    background: primary ? C.accent : "transparent",
    color: primary ? "#0b0d0f" : C.text,
    fontWeight: 600,
    fontSize: 13.5,
    cursor: state === "running" ? "wait" : "pointer",
    opacity: state === "running" ? 0.6 : 1,
  });

  return (
    <main style={{ background: C.bg, color: C.text, minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px 80px" }}>
        <a href="/" style={{ color: C.dim, fontSize: 13, textDecoration: "none" }}>← The Fable System</a>
        <h1 style={{ fontSize: 26, margin: "14px 0 6px" }}>Fable Playbook Generator</h1>
        <p style={{ color: C.dim, fontSize: 14, lineHeight: 1.6, maxWidth: 680 }}>
          Mine your Claude Code JSONL sessions for the working rhythm of Claude Fable 5,
          measure the gap against your fallback model, and synthesise a{" "}
          <code style={{ color: C.accent }}>FABLE_PLAYBOOK.md</code> you can inject via a hook,
          a skill, or your CLAUDE.md. You can’t clone Fable’s weights — but you can clone its habits.
        </p>

        <div
          style={{
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: 16,
            margin: "20px 0",
            fontSize: 13,
            color: C.dim,
            lineHeight: 1.7,
            fontFamily: C.mono,
          }}
        >
          <div style={{ color: C.text, marginBottom: 6 }}>1 · Distill your sessions (local):</div>
          node scripts/fable-distill.mjs<br />
          <span style={{ color: C.dim }}># no Fable history? download a public corpus first:</span><br />
          huggingface-cli download armand0e/claude-fable-5-claude-code --repo-type dataset --local-dir ./hf-traces<br />
          node scripts/fable-distill.mjs --dir ./hf-traces
          <div style={{ color: C.text, margin: "10px 0 0" }}>2 · Paste corpus.json below · 3 · Generate.</div>
        </div>

        <textarea
          value={corpusText}
          onChange={(e) => setCorpusText(e.target.value)}
          placeholder="Paste corpus.json here (output of scripts/fable-distill.mjs)…"
          spellCheck={false}
          style={{
            width: "100%",
            minHeight: 130,
            background: "#0e1114",
            color: C.text,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: 12,
            fontFamily: C.mono,
            fontSize: 12.5,
            resize: "vertical",
          }}
        />
        <input
          value={targetModel}
          onChange={(e) => setTargetModel(e.target.value)}
          placeholder="Target model to inject into (optional, e.g. qwen2.5-coder, gpt-5-codex)"
          style={{
            width: "100%",
            background: "#0e1114",
            color: C.text,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "10px 12px",
            margin: "10px 0",
            fontSize: 13.5,
          }}
        />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={btn(true)} disabled={state === "running"} onClick={() => generate(true)}>
            {state === "running" ? "Synthesising…" : "Generate from corpus"}
          </button>
          <button style={btn(false)} disabled={state === "running"} onClick={() => generate(false)}>
            Generate generic (catalogue only)
          </button>
        </div>

        {note && (
          <p style={{ color: state === "error" ? C.red : C.green, fontSize: 13, marginTop: 14 }}>{note}</p>
        )}

        {playbook && (
          <div style={{ marginTop: 22 }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <button style={btn(false)} onClick={copy}>{copied ? "Copied ✓" : "Copy"}</button>
              <button style={btn(false)} onClick={download}>Download FABLE_PLAYBOOK.md</button>
            </div>
            <pre
              style={{
                background: "#0e1114",
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: 16,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontFamily: C.mono,
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              {playbook}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}

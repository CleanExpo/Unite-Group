"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";

const BUSINESSES = [
  { slug: "synthex",           name: "Synthex",       status: "operational", arr: 0 },
  { slug: "restoreassist",     name: "RestoreAssist", status: "building",    arr: 0 },
  { slug: "dr-nrpg",           name: "NRPG",          status: "building",    arr: 0 },
  { slug: "carsi",             name: "CARSI",          status: "operational", arr: 0 },
  { slug: "ccw-crm",           name: "CCW-CRM",       status: "operational", arr: 33000 },
  { slug: "disaster-recovery", name: "DR Platform",   status: "operational", arr: 0 },
];

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    operational: "var(--green-400)",
    building:    "var(--red-400)",
    degraded:    "#e07020",
    archived:    "var(--ink-tertiary)",
  };
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: colors[status] ?? "var(--ink-tertiary)",
        flexShrink: 0,
      }}
    />
  );
}

export default function EmpireCommandCenter() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabaseClient.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/en/login");
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  if (checking) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "var(--canvas)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{ color: "var(--ink-tertiary)", fontSize: 13, fontFamily: "monospace" }}>
          Authenticating...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--canvas)",
      color: "var(--ink-primary)",
      fontFamily: "system-ui, sans-serif",
    }}>
      {/* Header */}
      <header style={{
        borderBottom: "1px solid var(--border-hairline)",
        padding: "16px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "var(--surface-1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Nexus Logo mark */}
          <div style={{
            width: 32,
            height: 32,
            background: "var(--red-500)",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "-0.5px",
          }}>
            N
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.3px" }}>
              Empire Command Center
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-tertiary)", marginTop: 1 }}>
              Nexus — Wave 1 Building
            </div>
          </div>
        </div>
        <div style={{
          fontSize: 11,
          color: "var(--red-400)",
          fontFamily: "monospace",
          letterSpacing: "0.08em",
          border: "1px solid var(--red-900)",
          padding: "4px 10px",
          borderRadius: 4,
          background: "var(--red-a08)",
        }}>
          WAVE 1 · BUILDING
        </div>
      </header>

      {/* Main */}
      <main style={{ padding: "32px", maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{
          fontSize: 22,
          fontWeight: 600,
          marginBottom: 8,
          letterSpacing: "-0.5px",
        }}>
          Portfolio Businesses
        </h1>
        <p style={{ color: "var(--ink-secondary)", fontSize: 13, marginBottom: 28 }}>
          6 businesses tracked. Agent pipeline active.
        </p>

        {/* Business grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
        }}>
          {BUSINESSES.map((biz) => (
            <div
              key={biz.slug}
              style={{
                background: "var(--surface-1)",
                border: "1px solid var(--border-hairline)",
                borderRadius: 8,
                padding: "20px",
                cursor: "default",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-default)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-hairline)";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <StatusDot status={biz.status} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>{biz.name}</span>
              </div>
              <div style={{
                fontSize: 11,
                color: "var(--ink-tertiary)",
                fontFamily: "monospace",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                marginBottom: 12,
              }}>
                {biz.status}
              </div>
              <div style={{
                fontSize: 18,
                fontWeight: 700,
                color: biz.arr > 0 ? "var(--green-300)" : "var(--ink-disabled)",
              }}>
                {biz.arr > 0
                  ? `$${biz.arr.toLocaleString("en-AU")} ARR`
                  : "—"}
              </div>
            </div>
          ))}
        </div>

        {/* Wave 1 status banner */}
        <div style={{
          marginTop: 40,
          padding: "20px 24px",
          background: "var(--red-a08)",
          border: "1px solid var(--red-900)",
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--red-300)", marginBottom: 6 }}>
            Nexus Wave 1 — Foundation Active
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-secondary)", lineHeight: 1.6 }}>
            Schema migrations applied · /empire/ route live · Middleware protecting all empire routes ·
            Agent pipeline canvas arriving in Wave 2.
          </div>
        </div>
      </main>
    </div>
  );
}

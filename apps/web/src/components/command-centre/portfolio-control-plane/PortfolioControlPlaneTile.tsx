"use client";

import { useEffect, useState } from "react";
import {
  DeckDetails,
  DECK_LIST_CAP,
  DeckMoreLine,
} from "@/components/command-centre/DeckDetails";
import { SourceBadge } from "@/components/command-centre/SourceBadge";
import type { PortfolioControlPlaneProjection } from "@/lib/command-centre/portfolio-control-plane";

function label(value: string): string {
  return value.replaceAll("_", " ");
}

export function PortfolioControlPlaneTile() {
  const [data, setData] = useState<PortfolioControlPlaneProjection | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch(
          "/api/command-centre/portfolio-control-plane-status",
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error(`status_http_${response.status}`);
        const body = (await response.json()) as PortfolioControlPlaneProjection;
        if (!cancelled) setData(body);
      } catch (cause) {
        if (!cancelled)
          setError(
            cause instanceof Error ? cause.message : "status_unavailable",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const exceptions =
    data?.repositories.filter((item) => item.state !== "observed") ?? [];
  const shown = exceptions.slice(0, DECK_LIST_CAP);
  const deviceCounts = data?.devices.reduce(
    (counts, device) => {
      counts[device.operatingStatus] += 1;
      return counts;
    },
    {
      baseline_in_progress: 0,
      enrolled: 0,
      active: 0,
      stale: 0,
      offline: 0,
      unknown: 0,
    },
  );
  const stats = data
    ? `${label(data.baseline.state)} · ${deviceCounts?.enrolled ?? 0} enrolled · ${deviceCounts?.active ?? 0} active · ${deviceCounts?.stale ?? 0} stale · ${deviceCounts?.offline ?? 0} offline · ${deviceCounts?.unknown ?? 0} unknown`
    : undefined;
  const badgeMode = loading ? "loading" : "degraded";

  return (
    <section
      data-testid="portfolio-control-plane-tile"
      aria-label="Portfolio control plane"
    >
      {error && (
        <p
          role="alert"
          style={{
            color: "var(--deck-abort-text)",
            margin: "0 0 8px",
            fontSize: 12,
          }}
        >
          Control-plane status unavailable. No fallback state is being shown.
        </p>
      )}
      <DeckDetails
        title="Portfolio control plane"
        stats={stats}
        badge={
          <SourceBadge
            mode={badgeMode}
            label={
              loading
                ? "checking"
                : data?.mode === "read_only_local_candidate"
                  ? "local · read only"
                  : "unavailable"
            }
          />
        }
        testId="portfolio-control-plane-details"
      >
        {data && (
          <>
            <p
              style={{
                color: "var(--deck-muted)",
                margin: "0 0 8px",
                fontSize: 12,
              }}
            >
              Registry {data.registry.version ?? "unverified"} · dispatch off ·
              reconciliation off · external mutation off.
            </p>
            <p
              data-testid="portfolio-baseline-status"
              style={{
                color: "var(--deck-muted)",
                margin: "0 0 8px",
                fontSize: 12,
              }}
            >
              Baseline {label(data.baseline.state)} ·{" "}
              {data.baseline.recordedAt ?? "no verified timestamp"} ·{" "}
              {data.baseline.reason}
            </p>
            {shown.length === 0 ? (
              <p
                style={{ color: "var(--deck-muted)", margin: 0, fontSize: 12 }}
              >
                No repository exception is currently proven. Observed does not
                mean release-ready.
              </p>
            ) : (
              shown.map((repository) => (
                <div
                  key={repository.projectId}
                  data-testid={`portfolio-repository-${repository.projectId}`}
                  style={{
                    borderBottom: "1px solid var(--deck-line)",
                    padding: "7px 0",
                    fontSize: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <strong style={{ color: "var(--deck-text)" }}>
                      {repository.repositoryId}
                    </strong>
                    <span
                      style={{
                        color: "var(--deck-muted)",
                        textTransform: "uppercase",
                      }}
                    >
                      {label(repository.state)}
                    </span>
                  </div>
                  <p style={{ color: "var(--deck-muted)", margin: "3px 0 0" }}>
                    {repository.blocker ?? repository.drift}
                  </p>
                  <p style={{ color: "var(--deck-muted)", margin: "3px 0 0" }}>
                    Next: {repository.nextSafeAction}
                  </p>
                </div>
              ))
            )}
            <DeckMoreLine total={exceptions.length} shown={shown.length} />
            <div style={{ marginTop: 10 }}>
              {data.devices.map((device) => (
                <p
                  key={device.deviceId}
                  data-testid={`portfolio-device-${device.deviceId}`}
                  style={{
                    color: "var(--deck-muted)",
                    margin: "4px 0",
                    fontSize: 12,
                  }}
                >
                  <strong style={{ color: "var(--deck-text)" }}>
                    {device.label}
                  </strong>{" "}
                  · {label(device.operatingStatus)} ·{" "}
                  {device.durableJob
                    ? `${device.durableJob.objective} · next ${device.durableJob.nextAction}`
                    : device.reason}
                </p>
              ))}
            </div>
            {data.unknownWork.length > 0 && (
              <p
                style={{
                  color: "var(--deck-muted)",
                  margin: "8px 0 0",
                  fontSize: 12,
                }}
              >
                Unknown work preserved for reconciliation:{" "}
                {data.unknownWork.length}
              </p>
            )}
            <p
              style={{
                color: "var(--deck-muted)",
                margin: "10px 0 0",
                fontSize: 12,
              }}
            >
              Next control-plane action: {data.nextSafeAction}
            </p>
          </>
        )}
      </DeckDetails>
    </section>
  );
}

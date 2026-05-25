/**
 * Pi-CEO Operator — Portfolio Health view.
 *
 * Renders the snapshot returned by the `get-portfolio-health` tool as a
 * compact grid card. Both the human and the LLM consume this view (per
 * the Skybridge "dual-surface interaction model"):
 *   - Human reads the visual grid (color-coded statuses)
 *   - LLM reads `structuredContent` to reason about the state
 *
 * This is a deliberate POC: no drill-in, no historical trending, no
 * action buttons. SPEC.md §Out-of-Scope captures what's deferred.
 */
import "../index.css";
import { useToolInfo } from "../helpers.js";

type Conclusion =
  | "success"
  | "failure"
  | "cancelled"
  | "skipped"
  | "unknown";

function statusClass(c: Conclusion): string {
  if (c === "success") return "repo-card__status repo-card__status--success";
  if (c === "failure") return "repo-card__status repo-card__status--failure";
  return "repo-card__status repo-card__status--neutral";
}

function statusGlyph(c: Conclusion): string {
  if (c === "success") return "✓";
  if (c === "failure") return "✗";
  if (c === "cancelled") return "○";
  if (c === "skipped") return "—";
  return "?";
}

export default function PortfolioHealth() {
  const { output, isPending } = useToolInfo<"get-portfolio-health">();

  if (isPending) {
    return <div>Loading portfolio snapshot…</div>;
  }

  if (!output) {
    return <div>No data yet.</div>;
  }

  const { repos, total_fails, timestamp, repos_with_errors } = output;
  const errored = repos.filter((r) => r.error);

  return (
    <div>
      <div
        style={{
          fontSize: "0.75rem",
          opacity: 0.7,
          marginBottom: "0.5rem",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>
          <strong>{total_fails}</strong> fails / {repos.length} repos · rolling-10
        </span>
        <span>{new Date(timestamp).toLocaleString()}</span>
      </div>

      {repos_with_errors > 0 ? (
        <div className="error-banner">
          {repos_with_errors} repo(s) returned an error — most likely the local
          `gh` CLI isn't authenticated for that repo or your token is missing
          the `repo` scope.
        </div>
      ) : null}

      <div className="health-grid">
        {repos.map((r) => (
          <div className="repo-card" key={r.repo}>
            <h3 className="repo-card__name">
              <span>{r.repo}</span>
              <span className={statusClass(r.latest_conclusion as Conclusion)}>
                {statusGlyph(r.latest_conclusion as Conclusion)}{" "}
                {r.latest_conclusion}
              </span>
            </h3>
            {r.error ? (
              <p className="repo-card__stats" title={r.error}>
                error
              </p>
            ) : (
              <p className="repo-card__stats">
                {r.fail_count_last_10} fails / 10 recent
              </p>
            )}
          </div>
        ))}
      </div>

      {errored.length > 0 ? (
        <details className="pilot-footer">
          <summary>Repos with errors ({errored.length})</summary>
          <ul style={{ margin: "0.5rem 0 0", padding: "0 0 0 1.25rem" }}>
            {errored.map((r) => (
              <li key={r.repo} style={{ fontSize: "0.75rem" }}>
                <strong>{r.repo}</strong>: {r.error}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

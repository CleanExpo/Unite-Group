import type { getControlPanelView } from '@/lib/operator-gateway/control-panel'
import { DeckDetails, DeckMoreLine, DECK_LIST_CAP } from '@/components/command-centre/DeckDetails'
import { MissionControlShell } from '../MissionControlShell'

// Deck token values (command-deck.module.css) for the inline-styled bits.
const mono = 'ui-monospace, SFMono-Regular, monospace'
const muted = 'var(--mission-muted)' // --deck-muted
const okText = 'var(--mission-blue)' // --deck-cyan-text

const wrap: React.CSSProperties = {
  maxWidth: 1040,
  margin: '0 auto',
}
// Banner fill is an alpha wash of the deck go LED (--deck-go).
const banner: React.CSSProperties = {
  background: 'rgba(45, 187, 87, 0.08)',
  border: '1px solid rgba(45, 187, 87, 0.35)',
  borderRadius: 2,
  padding: '0.75rem 1rem',
  marginBottom: '1.5rem',
  fontSize: 14,
}
const th: React.CSSProperties = {
  textAlign: 'left',
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  fontFamily: mono,
  color: muted,
  padding: '0.4rem 0.6rem',
  borderBottom: '1px solid var(--mission-border)', // --deck-line
}
const td: React.CSSProperties = {
  padding: '0.5rem 0.6rem',
  borderBottom: '1px solid var(--mission-border)', // --deck-line-soft
  fontSize: 14,
  verticalAlign: 'top',
}

function riskStyle(risk: string): React.CSSProperties {
  // Alpha washes of the deck LED fills; text = the AA --deck-*-text variants.
  const map: Record<string, [string, string, string]> = {
    none: ['rgba(45, 187, 87, 0.12)', 'var(--mission-blue)', 'rgba(45, 187, 87, 0.35)'],
    low: ['rgba(244, 130, 15, 0.12)', 'var(--mission-attention)', 'rgba(244, 130, 15, 0.4)'],
    high: ['rgba(229, 72, 77, 0.12)', 'var(--mission-attention)', 'rgba(229, 72, 77, 0.4)'],
  }
  const [bg, fg, bd] = map[risk] ?? map.none
  return {
    display: 'inline-block',
    padding: '0.1rem 0.5rem',
    borderRadius: 2, // deck standard: rounded-sm
    fontSize: 12,
    fontWeight: 600,
    fontFamily: mono,
    background: bg,
    color: fg,
    border: `1px solid ${bd}`,
  }
}

export interface HermesControlPanelViewProps { view: ReturnType<typeof getControlPanelView>; className?: string }

export function HermesControlPanelView({ view, className }: HermesControlPanelViewProps) {
  const v = view.version
  const posture = v.securityPosture

  // Presentation-only summary counts for the disclosure headlines (honest,
  // derived from the same read-only view — no data logic change).
  const hardeningsOn = [
    posture.secretRedaction,
    posture.subprocessCredentialStripping,
    posture.ssrfHardening,
    posture.cveSecurityPinning,
  ].filter((s) => s === 'on').length
  const connectedSurfaces = [
    view.liveConnections,
    view.externalChannelsEnabled,
    view.mcpConnected,
    view.remoteGatewayConnected,
  ].filter(Boolean).length
  const shownModules = view.modules.slice(0, DECK_LIST_CAP)

  return (
    <MissionControlShell section="hermes-control-panel" title="Hermes control panel" className={className}>
      <div style={wrap}>
        <p style={{ color: muted, marginTop: 0, fontFamily: mono, fontSize: 13 }}>
          Hermes Agent v{v.version} · {v.releaseName} ({v.release}) · config format {v.configFormat}
        </p>

        <div style={banner}>
          <strong>Read-only foundation.</strong> {view.note}
        </div>

        <div style={{ display: 'grid', gap: '1rem' }}>
          {/* ── Security / version posture ─────────────────────────────── */}
          <DeckDetails
            title="Security & version posture"
            stats={`design target (not live) · ${hardeningsOn}/4 hardenings on · leaner skill set ${posture.leanerSkillSet} · NVIDIA tap ${posture.nvidiaTap}`}
            testId="hermes-security-posture"
          >
            {/* UNI-2394 — these posture values come from the static registry
                (control-panel.ts, source 'static_registry'), not a live Hermes
                probe. Label them honestly instead of presenting them as live. */}
            <p style={{ color: muted, fontFamily: mono, fontSize: 12, marginTop: 0 }}>
              Design target (not live) — values are the v{v.version} release posture from the static registry, not a live probe of a running Hermes instance.
            </p>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: 14 }}>
              <span>Secret redaction: <b style={{ color: okText }}>{posture.secretRedaction}</b></span>
              <span>Subprocess cred stripping: <b style={{ color: okText }}>{posture.subprocessCredentialStripping}</b></span>
              <span>SSRF hardening: <b style={{ color: okText }}>{posture.ssrfHardening}</b></span>
              <span>CVE pinning: <b style={{ color: okText }}>{posture.cveSecurityPinning}</b></span>
              <span>Leaner skill set: <b>{posture.leanerSkillSet}</b></span>
              <span>NVIDIA tap: <b>{posture.nvidiaTap}</b></span>
            </div>
          </DeckDetails>

          {/* ── Connection invariants ──────────────────────────────────── */}
          <DeckDetails
            title="Connection state"
            stats={
              connectedSurfaces === 0
                ? 'not connected — all external surfaces inert (by design)'
                : `${connectedSurfaces}/4 external surfaces connected`
            }
            testId="hermes-connection-state"
          >
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', fontSize: 14 }}>
              <span>Live connections: <b style={{ color: okText }}>{view.liveConnections ? 'yes' : 'no'}</b></span>
              <span>External channels enabled: <b style={{ color: okText }}>{view.externalChannelsEnabled ? 'yes' : 'no'}</b></span>
              <span>MCP connected: <b style={{ color: okText }}>{view.mcpConnected ? 'yes' : 'no'}</b></span>
              <span>Remote gateway connected: <b style={{ color: okText }}>{view.remoteGatewayConnected ? 'yes' : 'no'}</b></span>
              <span>Credentials exposed: <b style={{ color: okText }}>{view.credentialsExposed ? 'yes' : 'no'}</b></span>
            </div>
          </DeckDetails>

          {/* ── Modules ────────────────────────────────────────────────── */}
          <DeckDetails
            title={`Surface-Release modules (${view.moduleCount})`}
            stats={`${view.modulesImplementableNow} now · ${view.modulesRequiringLaterApproval} need later approval · ${view.highRiskGatedCount} high-risk gated`}
            testId="hermes-modules"
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Module</th>
                  <th style={th}>Hermes feature</th>
                  <th style={th}>State</th>
                  <th style={th}>Ext. risk</th>
                  <th style={th}>Later approval</th>
                </tr>
              </thead>
              <tbody>
                {shownModules.map((m) => (
                  <tr key={m.moduleId}>
                    <td style={td}>
                      <div style={{ fontWeight: 600 }}>{m.title}</div>
                      <div style={{ color: muted, fontSize: 12 }}>{m.note}</div>
                    </td>
                    <td style={td}>{m.hermesFeature}</td>
                    <td style={td}>{m.state}</td>
                    <td style={td}>
                      <span style={riskStyle(m.externalActionRisk)}>{m.externalActionRisk}</span>
                    </td>
                    <td style={td}>{m.requiresLaterApproval ? 'yes' : 'no'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <DeckMoreLine total={view.modules.length} shown={shownModules.length} />
          </DeckDetails>

          {/* ── Credential boundary (status only) ──────────────────────── */}
          <DeckDetails
            title="Credential boundary"
            stats={`${view.credentialBoundaries.length} boundaries · status only — no secret values`}
            testId="hermes-credential-boundary"
          >
            <p style={{ color: muted, fontSize: 13, marginTop: 0 }}>
              Boundary names and status only — no secret values are ever displayed.
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Boundary</th>
                  <th style={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {view.credentialBoundaries.map((c) => (
                  <tr key={c.boundary}>
                    <td style={td}>{c.boundary}</td>
                    <td style={td}>{c.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DeckDetails>
        </div>
      </div>
    </MissionControlShell>
  )
}

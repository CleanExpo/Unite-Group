export default function TermsOfUse() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--canvas)", color: "var(--ink-primary)", fontFamily: "var(--font-display, system-ui, sans-serif)" }}>

      {/* Header */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "64px 32px 32px" }}>
        <h1 style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--ink-primary)", marginBottom: 12 }}>
          Terms of Use
        </h1>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 32px 96px" }}>
        <div style={{ background: "#111113", border: "1px solid #27272a", borderRadius: 12, padding: 40 }}>
          <div style={{ color: "#d4d4d8", fontSize: 15, lineHeight: 1.7 }}>
            <p style={{ marginBottom: 16 }}>
              This system is private and restricted to authorised Unite Group personnel only.
              Unauthorised access is prohibited.
            </p>
            <p style={{ marginBottom: 16 }}>
              Data stored in this system is confidential and may not be shared externally
              without written approval from the Founder.
            </p>
            <p style={{ marginBottom: 0 }}>
              For questions contact:{" "}
              <a href="mailto:contact@unite-group.in" style={{ color: "#3b82f6", textDecoration: "none" }}>
                contact@unite-group.in
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

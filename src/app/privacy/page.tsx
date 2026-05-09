export default function DataPrivacy() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--canvas)", color: "var(--ink-primary)", fontFamily: "var(--font-display, system-ui, sans-serif)" }}>

      {/* Header */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "64px 32px 32px" }}>
        <h1 style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--ink-primary)", marginBottom: 12 }}>
          Data &amp; Privacy
        </h1>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 32px 96px" }}>
        <div style={{ background: "var(--surface-1)", border: "1px solid #27272a", borderRadius: 12, padding: 40 }}>
          <div style={{ color: "#d4d4d8", fontSize: 15, lineHeight: 1.7 }}>
            <p style={{ marginBottom: 16 }}>
              This is an internal system. Data is stored in Supabase (ANZ region) and is
              accessible only to authorised Unite Group team members.
            </p>
            <p style={{ marginBottom: 16 }}>
              No data is sold or shared with third parties. All data is encrypted in transit.
            </p>
            <p style={{ marginBottom: 0 }}>
              Contact:{" "}
              <a href="mailto:contact@unite-group.in" style={{ color: "var(--red-400)", textDecoration: "none" }}>
                contact@unite-group.in
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

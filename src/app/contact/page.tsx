import { Mail, AlertCircle, MessageSquare } from "lucide-react";

export default function Contact() {
  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#fafafa", fontFamily: "var(--font-display)" }}>

      {/* Page title */}
      <div style={{ padding: "24px 32px 0" }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#fafafa", letterSpacing: "-0.02em", margin: 0, fontFamily: "var(--font-display)" }}>
          Get Support
        </h1>
        <p style={{ fontSize: 13, color: "#52525b", margin: "4px 0 0" }}>
          Internal support channels for Unite Group personnel.
        </p>
      </div>

      <section style={{ padding: "40px 32px 80px" }}>
        <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Report an Issue */}
          <div style={{
            background: "#111113",
            backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 50%)",
            border: "1px solid #27272a",
            borderRadius: 12,
            padding: 24,
            display: "flex",
            gap: 16,
            alignItems: "flex-start",
          }}>
            <div style={{ flexShrink: 0, marginTop: 2 }}>
              <AlertCircle size={18} style={{ color: "#1d4ed8" }} />
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#52525b", marginBottom: 4 }}>Report an Issue</p>
              <p style={{ fontSize: 15, fontWeight: 500, color: "#fafafa", marginBottom: 4 }}>Create a Linear Ticket</p>
              <p style={{ fontSize: 13, color: "#a1a1aa", marginBottom: 10 }}>Track bugs, blockers, and feature requests in the project board.</p>
              <a
                href="https://linear.app"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 13, color: "#3b82f6", textDecoration: "none", fontWeight: 500 }}
              >
                Open Linear →
              </a>
            </div>
          </div>

          {/* Contact the Founder */}
          <div style={{
            background: "#111113",
            backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 50%)",
            border: "1px solid #27272a",
            borderRadius: 12,
            padding: 24,
            display: "flex",
            gap: 16,
            alignItems: "flex-start",
          }}>
            <div style={{ flexShrink: 0, marginTop: 2 }}>
              <Mail size={18} style={{ color: "#1d4ed8" }} />
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#52525b", marginBottom: 4 }}>Contact the Founder</p>
              <p style={{ fontSize: 15, fontWeight: 500, color: "#fafafa", marginBottom: 4 }}>Phill McGurk</p>
              <a
                href="mailto:contact@unite-group.in"
                style={{ fontSize: 13, color: "#3b82f6", textDecoration: "none", fontWeight: 500 }}
              >
                contact@unite-group.in
              </a>
            </div>
          </div>

          {/* Telegram */}
          <div style={{
            background: "#111113",
            backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 50%)",
            border: "1px solid #27272a",
            borderRadius: 12,
            padding: 24,
            display: "flex",
            gap: 16,
            alignItems: "flex-start",
          }}>
            <div style={{ flexShrink: 0, marginTop: 2 }}>
              <MessageSquare size={18} style={{ color: "#1d4ed8" }} />
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#52525b", marginBottom: 4 }}>Telegram</p>
              <p style={{ fontSize: 15, fontWeight: 500, color: "#fafafa", marginBottom: 4 }}>Message Margot directly</p>
              <p style={{ fontSize: 13, color: "#a1a1aa" }}>Message Margot directly via Telegram for urgent matters.</p>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}

import { Shield, Globe, Sparkles, Zap } from 'lucide-react';

export function TrustStrip() {
  return (
    <section style={{ borderTop: "1px solid #27272a", borderBottom: "1px solid #27272a", background: "#111113" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 32px" }}>
        <div className="flex flex-wrap justify-center items-center gap-8" style={{ fontSize: 13, color: "#a1a1aa" }}>
          <div className="flex items-center gap-2">
            <Shield style={{ width: 14, height: 14, color: "#16a34a" }} />
            <span>SOC2 Compliant</span>
          </div>
          <div className="flex items-center gap-2">
            <Globe style={{ width: 14, height: 14, color: "#1d4ed8" }} />
            <span>Global Infrastructure</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles style={{ width: 14, height: 14, color: "#f59e0b" }} />
            <span>AI-Powered</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap style={{ width: 14, height: 14, color: "#f59e0b" }} />
            <span>Enterprise Performance</span>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";

export default function TermsOfService() {
  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#fafafa", fontFamily: "var(--font-inter, system-ui, sans-serif)" }}>
      {/* Navigation */}
      <nav style={{ borderBottom: "1px solid #27272a", background: "rgba(9,9,11,0.9)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px", display: "flex", justifyContent: "space-between", alignItems: "center", height: 64 }}>
          <Link href="/" style={{ fontSize: 18, fontWeight: 700, color: "#fafafa", textDecoration: "none" }}>
            UNITE Group
          </Link>
          <div style={{ display: "flex", gap: 16 }}>
            <Link href="/login" style={{ color: "#a1a1aa", textDecoration: "none", padding: "8px 16px", fontSize: 14 }}>
              Login
            </Link>
            <Link href="/book-consultation" style={{ background: "#1d4ed8", color: "#fff", textDecoration: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500 }}>
              Book Now
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "64px 32px 32px" }}>
        <h1 style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.03em", color: "#fafafa", marginBottom: 12 }}>
          Terms of Service
        </h1>
        <p style={{ color: "#52525b", fontSize: 14 }}>Last Updated: May 25, 2025</p>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 32px 96px" }}>
        <div style={{ background: "#111113", border: "1px solid #27272a", borderRadius: 12, padding: 40 }}>
          <div style={{ color: "#d4d4d8", fontSize: 15, lineHeight: 1.7 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fafafa", marginBottom: 12, marginTop: 32 }}>1. Introduction</h2>
            <p style={{ marginBottom: 16 }}>Welcome to UNITE Group (&quot;Company&quot;, &quot;we&quot;, &quot;our&quot;, &quot;us&quot;). These Terms of Service (&quot;Terms&quot;, &quot;Terms of Service&quot;) govern your use of our website located at <a href="https://unite-group.in" style={{ color: "#3b82f6" }}>https://unite-group.in</a> (the &quot;Service&quot;) operated by UNITE Group.</p>
            <p style={{ marginBottom: 16 }}>By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the Service.</p>

            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fafafa", marginBottom: 12, marginTop: 32 }}>2. Consultations and Services</h2>
            <p style={{ marginBottom: 12 }}>UNITE Group provides business and technology consulting services. Our standard consultation fee is $550, which includes:</p>
            <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
              <li style={{ marginBottom: 8 }}>A one-hour consultation session with our experts</li>
              <li style={{ marginBottom: 8 }}>Business needs assessment</li>
              <li style={{ marginBottom: 8 }}>Strategic recommendations</li>
              <li style={{ marginBottom: 8 }}>Follow-up documentation of key insights</li>
            </ul>
            <p style={{ marginBottom: 16 }}>Consultation bookings are subject to availability and confirmation from our team. We reserve the right to reschedule consultations with reasonable notice.</p>

            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fafafa", marginBottom: 12, marginTop: 32 }}>3. Communications</h2>
            <p style={{ marginBottom: 16 }}>By creating an account on our service, you agree to subscribe to newsletters, marketing or promotional materials, and other information we may send. However, you may opt out of receiving any, or all, of these communications from us by following the unsubscribe link or instructions provided in any email we send.</p>

            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fafafa", marginBottom: 12, marginTop: 32 }}>4. Accounts</h2>
            <p style={{ marginBottom: 16 }}>When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.</p>
            <p style={{ marginBottom: 16 }}>You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password.</p>
            <p style={{ marginBottom: 16 }}>You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.</p>

            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fafafa", marginBottom: 12, marginTop: 32 }}>5. Payment and Refunds</h2>
            <p style={{ marginBottom: 12 }}>Payment for consultations is due at the time of booking unless otherwise agreed upon in writing. We accept major credit cards and electronic transfers.</p>
            <p style={{ marginBottom: 12 }}>Refund Policy:</p>
            <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
              <li style={{ marginBottom: 8 }}>Full refund if cancellation is made at least 48 hours before the scheduled consultation</li>
              <li style={{ marginBottom: 8 }}>50% refund if cancellation is made between 24-48 hours before the scheduled consultation</li>
              <li style={{ marginBottom: 8 }}>No refund for cancellations less than 24 hours before the scheduled consultation</li>
            </ul>

            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fafafa", marginBottom: 12, marginTop: 32 }}>6. Intellectual Property</h2>
            <p style={{ marginBottom: 16 }}>The Service and its original content, features, and functionality are and will remain the exclusive property of UNITE Group and its licensors. The Service is protected by copyright, trademark, and other laws of both Australia and foreign countries.</p>
            <p style={{ marginBottom: 16 }}>Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of UNITE Group.</p>

            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fafafa", marginBottom: 12, marginTop: 32 }}>7. Confidentiality</h2>
            <p style={{ marginBottom: 16 }}>We understand the sensitive nature of business consultations. Any information shared during consultations will be kept confidential unless permission is granted for its use in case studies or testimonials.</p>

            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fafafa", marginBottom: 12, marginTop: 32 }}>8. Limitation Of Liability</h2>
            <p style={{ marginBottom: 12 }}>In no event shall UNITE Group, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from:</p>
            <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
              <li style={{ marginBottom: 8 }}>Your access to or use of or inability to access or use the Service;</li>
              <li style={{ marginBottom: 8 }}>Any conduct or content of any third party on the Service;</li>
              <li style={{ marginBottom: 8 }}>Any content obtained from the Service; and</li>
              <li style={{ marginBottom: 8 }}>Unauthorized access, use, or alteration of your transmissions or content.</li>
            </ul>

            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fafafa", marginBottom: 12, marginTop: 32 }}>9. Disclaimer</h2>
            <p style={{ marginBottom: 16 }}>Your use of the Service is at your sole risk. The Service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. The Service is provided without warranties of any kind, whether express or implied.</p>
            <p style={{ marginBottom: 16 }}>UNITE Group does not warrant that the results of using our services will meet your requirements.</p>

            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fafafa", marginBottom: 12, marginTop: 32 }}>10. Governing Law</h2>
            <p style={{ marginBottom: 16 }}>These Terms shall be governed and construed in accordance with the laws of Australia, without regard to its conflict of law provisions.</p>
            <p style={{ marginBottom: 16 }}>Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights. If any provision of these Terms is held to be invalid or unenforceable by a court, the remaining provisions of these Terms will remain in effect.</p>

            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fafafa", marginBottom: 12, marginTop: 32 }}>11. Changes</h2>
            <p style={{ marginBottom: 16 }}>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide at least 30 days&apos; notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.</p>
            <p style={{ marginBottom: 16 }}>By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, please stop using the Service.</p>

            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fafafa", marginBottom: 12, marginTop: 32 }}>12. Contact Us</h2>
            <p style={{ marginBottom: 8 }}>If you have any questions about these Terms, please contact us at:</p>
            <p>
              <strong style={{ color: "#fafafa" }}>Email:</strong> contact@unite-group.in<br />
              <strong style={{ color: "#fafafa" }}>Phone:</strong> 0457 123 005
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

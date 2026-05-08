"use client";

import Link from "next/link";

export default function PrivacyPolicy() {
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
          Privacy Policy
        </h1>
        <p style={{ color: "#52525b", fontSize: 14 }}>Last Updated: May 25, 2025</p>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 32px 96px" }}>
        <div style={{ background: "#111113", border: "1px solid #27272a", borderRadius: 12, padding: 40 }}>
          <div style={{ color: "#d4d4d8", fontSize: 15, lineHeight: 1.7 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fafafa", marginBottom: 12, marginTop: 32 }}>1. Introduction</h2>
            <p style={{ marginBottom: 16 }}>UNITE Group (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) respects your privacy and is committed to protecting your personal data. This privacy policy will inform you about how we look after your personal data when you visit our website and inform you of your privacy rights and how the law protects you.</p>
            <p style={{ marginBottom: 16 }}>This privacy policy applies to personal data we collect when you use our website, sign up for our services, or interact with us in any way.</p>

            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fafafa", marginBottom: 12, marginTop: 32 }}>2. The Data We Collect About You</h2>
            <p style={{ marginBottom: 12 }}>We may collect, use, store, and transfer different kinds of personal data about you, including:</p>
            <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
              <li style={{ marginBottom: 8 }}><strong style={{ color: "#fafafa" }}>Identity Data</strong>: includes first name, last name, username or similar identifier</li>
              <li style={{ marginBottom: 8 }}><strong style={{ color: "#fafafa" }}>Contact Data</strong>: includes email address, telephone numbers, and physical address</li>
              <li style={{ marginBottom: 8 }}><strong style={{ color: "#fafafa" }}>Technical Data</strong>: includes internet protocol (IP) address, browser type and version, time zone setting and location, operating system and platform</li>
              <li style={{ marginBottom: 8 }}><strong style={{ color: "#fafafa" }}>Usage Data</strong>: includes information about how you use our website and services</li>
              <li style={{ marginBottom: 8 }}><strong style={{ color: "#fafafa" }}>Marketing Data</strong>: includes your preferences in receiving marketing from us</li>
              <li style={{ marginBottom: 8 }}><strong style={{ color: "#fafafa" }}>Business Data</strong>: includes information about your business needs and objectives shared during consultations</li>
            </ul>

            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fafafa", marginBottom: 12, marginTop: 32 }}>3. How We Collect Your Personal Data</h2>
            <p style={{ marginBottom: 12 }}>We use different methods to collect data from and about you including through:</p>
            <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
              <li style={{ marginBottom: 8 }}><strong style={{ color: "#fafafa" }}>Direct interactions</strong>: You may give us your Identity and Contact Data by filling in forms or by corresponding with us by email, phone, or otherwise.</li>
              <li style={{ marginBottom: 8 }}><strong style={{ color: "#fafafa" }}>Automated technologies</strong>: As you interact with our website, we may automatically collect Technical Data about your browsing actions and patterns.</li>
              <li style={{ marginBottom: 8 }}><strong style={{ color: "#fafafa" }}>Third parties</strong>: We may receive personal data about you from various third parties such as analytics providers and advertising networks.</li>
            </ul>

            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fafafa", marginBottom: 12, marginTop: 32 }}>4. How We Use Your Personal Data</h2>
            <p style={{ marginBottom: 12 }}>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
            <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
              <li style={{ marginBottom: 8 }}>To register you as a new customer</li>
              <li style={{ marginBottom: 8 }}>To process and deliver our services to you</li>
              <li style={{ marginBottom: 8 }}>To manage our relationship with you</li>
              <li style={{ marginBottom: 8 }}>To administer and protect our business and website</li>
              <li style={{ marginBottom: 8 }}>To deliver relevant website content and advertisements to you</li>
              <li style={{ marginBottom: 8 }}>To use data analytics to improve our website, products/services, marketing, customer relationships, and experiences</li>
            </ul>

            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fafafa", marginBottom: 12, marginTop: 32 }}>5. Data Security</h2>
            <p style={{ marginBottom: 16 }}>We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way, altered, or disclosed. We limit access to your personal data to those employees, agents, contractors, and other third parties who have a business need to know.</p>
            <p style={{ marginBottom: 16 }}>We have procedures in place to deal with any suspected personal data breach and will notify you and any applicable regulator of a breach where we are legally required to do so.</p>

            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fafafa", marginBottom: 12, marginTop: 32 }}>6. Data Retention</h2>
            <p style={{ marginBottom: 16 }}>We will only retain your personal data for as long as necessary to fulfill the purposes we collected it for, including for the purposes of satisfying any legal, accounting, or reporting requirements.</p>
            <p style={{ marginBottom: 16 }}>To determine the appropriate retention period for personal data, we consider the amount, nature, and sensitivity of the personal data, the potential risk of harm from unauthorized use or disclosure of your personal data, the purposes for which we process your personal data, and whether we can achieve those purposes through other means, and the applicable legal requirements.</p>

            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fafafa", marginBottom: 12, marginTop: 32 }}>7. Your Legal Rights</h2>
            <p style={{ marginBottom: 12 }}>Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to:</p>
            <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
              <li style={{ marginBottom: 8 }}>Request access to your personal data</li>
              <li style={{ marginBottom: 8 }}>Request correction of your personal data</li>
              <li style={{ marginBottom: 8 }}>Request erasure of your personal data</li>
              <li style={{ marginBottom: 8 }}>Object to processing of your personal data</li>
              <li style={{ marginBottom: 8 }}>Request restriction of processing your personal data</li>
              <li style={{ marginBottom: 8 }}>Request transfer of your personal data</li>
              <li style={{ marginBottom: 8 }}>Right to withdraw consent</li>
            </ul>
            <p style={{ marginBottom: 16 }}>You will not have to pay a fee to access your personal data (or to exercise any of the other rights). However, we may charge a reasonable fee if your request is clearly unfounded, repetitive, or excessive. Alternatively, we may refuse to comply with your request in these circumstances.</p>

            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fafafa", marginBottom: 12, marginTop: 32 }}>8. Third-Party Links</h2>
            <p style={{ marginBottom: 16 }}>This website may include links to third-party websites, plug-ins, and applications. Clicking on those links or enabling those connections may allow third parties to collect or share data about you. We do not control these third-party websites and are not responsible for their privacy statements. When you leave our website, we encourage you to read the privacy policy of every website you visit.</p>

            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fafafa", marginBottom: 12, marginTop: 32 }}>9. Cookies</h2>
            <p style={{ marginBottom: 12 }}>We use cookies and similar tracking technologies to track the activity on our Service and hold certain information. Cookies are files with a small amount of data which may include an anonymous unique identifier.</p>
            <p style={{ marginBottom: 12 }}>You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our Service.</p>
            <p style={{ marginBottom: 12 }}>Examples of Cookies we use:</p>
            <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
              <li style={{ marginBottom: 8 }}><strong style={{ color: "#fafafa" }}>Session Cookies</strong>: We use Session Cookies to operate our Service.</li>
              <li style={{ marginBottom: 8 }}><strong style={{ color: "#fafafa" }}>Preference Cookies</strong>: We use Preference Cookies to remember your preferences and various settings.</li>
              <li style={{ marginBottom: 8 }}><strong style={{ color: "#fafafa" }}>Security Cookies</strong>: We use Security Cookies for security purposes.</li>
              <li style={{ marginBottom: 8 }}><strong style={{ color: "#fafafa" }}>Advertising Cookies</strong>: Advertising Cookies are used to serve you with advertisements that may be relevant to you and your interests.</li>
            </ul>

            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fafafa", marginBottom: 12, marginTop: 32 }}>10. Children&apos;s Privacy</h2>
            <p style={{ marginBottom: 16 }}>Our Service does not address anyone under the age of 18. We do not knowingly collect personally identifiable information from anyone under the age of 18. If you are a parent or guardian and you are aware that your child has provided us with Personal Data, please contact us. If we become aware that we have collected Personal Data from children without verification of parental consent, we take steps to remove that information from our servers.</p>

            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fafafa", marginBottom: 12, marginTop: 32 }}>11. Changes to This Privacy Policy</h2>
            <p style={{ marginBottom: 16 }}>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last Updated&quot; date at the top of this Privacy Policy.</p>
            <p style={{ marginBottom: 16 }}>You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.</p>

            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fafafa", marginBottom: 12, marginTop: 32 }}>12. Contact Us</h2>
            <p style={{ marginBottom: 8 }}>If you have any questions about this Privacy Policy, please contact us:</p>
            <p>
              <strong style={{ color: "#fafafa" }}>Email:</strong> contact@unite-group.in<br />
              <strong style={{ color: "#fafafa" }}>Phone:</strong> 0457 123 005<br />
              <strong style={{ color: "#fafafa" }}>Address:</strong> 123 Business Street, Sydney NSW 2000, Australia
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

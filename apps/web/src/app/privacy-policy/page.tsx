import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Unite-Group Application',
  description: 'Privacy Policy for the Unite-Group Application operated by Unite-Group Nexus Pty Ltd.',
  robots: { index: true, follow: true },
}

const LAST_UPDATED = '20 June 2026'
const CONTACT_EMAIL = 'contact@unite-group.in'
const COMPANY = 'Unite-Group Nexus Pty Ltd'
const APP_URL = 'https://unite-group.in'

export default function PrivacyPolicyPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: '#050505', color: 'rgba(255,255,255,0.88)' }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: '#0a0a0a',
        }}
      >
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <a
            href={APP_URL}
            style={{ color: '#00F5FF', fontFamily: 'var(--font-mono)', fontSize: '13px', letterSpacing: '0.15em', textDecoration: 'none' }}
          >
            UNITE-GROUP
          </a>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
            PRIVACY POLICY
          </span>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-3xl mx-auto px-6 py-14">
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            marginBottom: '6px',
            color: '#fff',
          }}
        >
          Privacy Policy
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.40)', fontSize: '13px', fontFamily: 'var(--font-mono)', marginBottom: '48px' }}>
          Last updated: {LAST_UPDATED}
        </p>

        <Section title="1. Overview">
          <p>
            {COMPANY} ABN (&#8220;we&#8221;, &#8220;our&#8221;, &#8220;us&#8221;) operates the Unite-Group Application
            (the &#8220;Application&#8221;) available at{' '}
            <a href={APP_URL} style={{ color: '#00F5FF' }}>{APP_URL}</a>. This Privacy Policy explains
            how we collect, use, disclose, and safeguard information in connection with the Application.
          </p>
          <p>
            The Application is a private, single-operator business management platform. It is not a public-facing
            SaaS product and is not intended for use by the general public. By accessing or using the Application,
            you acknowledge this policy.
          </p>
          <p>
            We are bound by the <em>Privacy Act 1988</em> (Cth) and the Australian Privacy Principles (APPs)
            contained in that Act. Where we interact with users or data subjects in the European Economic Area,
            we also comply with the General Data Protection Regulation (GDPR) to the extent applicable.
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <SubHeading>2.1 Account and Authentication Data</SubHeading>
          <p>
            We use Google OAuth (via Supabase Auth) for sign-in. When you authenticate, we receive your
            Google account email address, name, and profile picture. We do not receive or store your Google password.
          </p>

          <SubHeading>2.2 Third-Party Integration Data</SubHeading>
          <p>
            The Application connects to third-party services on your behalf. The following data may be accessed
            and stored in an encrypted credentials vault:
          </p>
          <ul>
            <li><strong>Xero:</strong> OAuth access tokens, refresh tokens, and tenant identifiers for linked Xero organisations. Financial data (invoices, transactions, revenue figures) is fetched in real time and may be temporarily cached.</li>
            <li><strong>Gmail / Google Calendar / Google Drive:</strong> OAuth tokens permitting read and send access to email, calendar events, and Drive documents. Message content, calendar entries, and file metadata are processed locally within the Application and not transferred to third parties.</li>
            <li><strong>Linear:</strong> API token for project and issue management. Issue titles, descriptions, and status updates are accessed.</li>
            <li><strong>Social Platforms (Facebook, LinkedIn, TikTok):</strong> OAuth tokens for publishing and analytics. Post content and engagement metrics are accessed.</li>
          </ul>
          <p>
            All OAuth tokens are encrypted at rest using AES-256-GCM via the Supabase Vault (pgsodium). Tokens
            are stored in a private Supabase PostgreSQL database hosted on Supabase&#8217;s AWS infrastructure
            in ap-southeast-2 (Sydney).
          </p>

          <SubHeading>2.3 Usage and Technical Data</SubHeading>
          <p>
            We collect standard server logs including IP addresses, browser type, pages visited, and timestamps.
            Vercel (our hosting provider) retains deployment and request logs. We use Sentry for error monitoring
            and Vercel Analytics for aggregated usage data.
          </p>
        </Section>

        <Section title="3. How We Use Information">
          <p>We use collected information for the following purposes:</p>
          <ul>
            <li>Operating and improving the Application&#8217;s functionality</li>
            <li>Authenticating and authorising access to the Application</li>
            <li>Fetching, displaying, and acting on business data from connected integrations</li>
            <li>Generating reports, dashboards, and AI-assisted insights</li>
            <li>Diagnosing technical errors and maintaining system health</li>
            <li>Complying with legal obligations under Australian law</li>
          </ul>
          <p>
            We do not sell, rent, or share your personal information with third parties for marketing purposes.
            We do not use your data to train AI models or share it with AI providers beyond the minimum required
            to process a given request (e.g., sending an excerpt to the Anthropic API to generate a summary).
          </p>
        </Section>

        <Section title="4. Google API Scopes">
          <p>
            The Application requests the following Google OAuth scopes to provide its features. Use of
            information received from Google APIs adheres to the{' '}
            <a href="https://developers.google.com/terms/api-services-user-data-policy" style={{ color: '#00F5FF' }}>
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
          <ul>
            <li><code>openid</code>, <code>profile</code>, <code>email</code> — identity and sign-in</li>
            <li><code>gmail.readonly</code>, <code>gmail.modify</code>, <code>gmail.send</code> — email inbox access and outgoing email</li>
            <li><code>calendar.readonly</code> — calendar events for scheduling features</li>
            <li><code>drive.readonly</code> — reading documents from a designated Drive folder for the notes vault</li>
            <li><code>offline_access</code> — refresh tokens so connections persist without repeated sign-in</li>
          </ul>
          <p>
            Data obtained through Google APIs is used solely to provide the Application&#8217;s features to
            the authorised operator. It is not transferred to third parties, used for advertising, or
            combined with data from other sources except as necessary to operate the Application.
          </p>
        </Section>

        <Section title="5. Data Storage and Security">
          <p>
            All data is stored in a Supabase PostgreSQL database hosted in the <strong>ap-southeast-2 (Sydney)</strong> AWS
            region. Row-Level Security (RLS) policies ensure data is accessible only to the authorised account
            holder.
          </p>
          <p>
            OAuth tokens and credentials are encrypted at rest using AES-256-GCM. Database connections use TLS
            in transit. The Application is hosted on Vercel&#8217;s global edge network with HTTPS enforced.
          </p>
          <p>
            We retain audit logs of sensitive operations (credential access, financial data changes) for a
            minimum of seven years in accordance with Australian financial record-keeping requirements under
            the <em>Corporations Act 2001</em> (Cth).
          </p>
        </Section>

        <Section title="6. Third-Party Service Providers">
          <p>
            We engage the following sub-processors in providing the Application:
          </p>
          <table>
            <thead>
              <tr><th>Provider</th><th>Purpose</th><th>Data Region</th></tr>
            </thead>
            <tbody>
              <tr><td>Supabase (Auth + DB)</td><td>Authentication, database</td><td>AWS ap-southeast-2</td></tr>
              <tr><td>Vercel</td><td>Hosting, edge functions</td><td>Global / US</td></tr>
              <tr><td>Anthropic</td><td>AI completions (Claude API)</td><td>US</td></tr>
              <tr><td>Sentry</td><td>Error monitoring</td><td>US</td></tr>
              <tr><td>Google (OAuth + APIs)</td><td>Authentication, Gmail, Calendar, Drive</td><td>Global</td></tr>
              <tr><td>Xero</td><td>Accounting data</td><td>AU / NZ</td></tr>
            </tbody>
          </table>
          <p>
            Each provider is bound by its own privacy policy and data processing agreements. We only share
            the minimum data necessary for the provider to deliver its service.
          </p>
        </Section>

        <Section title="7. Your Rights">
          <p>
            As the authorised operator of the Application, you have the right to:
          </p>
          <ul>
            <li>Access and download a copy of data associated with your account</li>
            <li>Correct inaccurate information</li>
            <li>Request deletion of your account and associated data (subject to legal retention requirements)</li>
            <li>Withdraw consent for third-party integrations at any time (by disconnecting them within the Application or revoking OAuth access at the provider)</li>
            <li>Lodge a complaint with the Office of the Australian Information Commissioner (OAIC) at <a href="https://www.oaic.gov.au" style={{ color: '#00F5FF' }}>oaic.gov.au</a></li>
          </ul>
          <p>
            If you are located in the EEA or UK, you may also have rights under GDPR / UK GDPR including
            portability and the right to object to processing.
          </p>
        </Section>

        <Section title="8. Cookies and Tracking">
          <p>
            The Application uses a single session cookie managed by Supabase Auth (PKCE flow) to maintain
            your authenticated session. No third-party advertising cookies are used. Vercel Analytics uses
            privacy-preserving, aggregated data without fingerprinting or cross-site tracking.
          </p>
        </Section>

        <Section title="9. Children's Privacy">
          <p>
            The Application is not intended for, and does not knowingly collect information from, persons
            under 18 years of age.
          </p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. The &#8220;Last updated&#8221; date at the
            top of this page indicates when the most recent revision was made. Continued use of the Application
            after changes are posted constitutes acceptance of the revised policy.
          </p>
        </Section>

        <Section title="11. Contact Us">
          <p>
            For privacy enquiries, to exercise your rights, or to report a concern, contact:
          </p>
          <address style={{ fontStyle: 'normal', lineHeight: 1.8 }}>
            <strong>{COMPANY}</strong><br />
            Australia<br />
            Email:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#00F5FF' }}>
              {CONTACT_EMAIL}
            </a>
          </address>
          <p>
            We will respond to privacy requests within 30 days in accordance with the Australian Privacy
            Principles.
          </p>
        </Section>
      </main>

      <footer
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '24px',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.25)',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.08em',
        }}
      >
        © 2026 {COMPANY} — ABN · Australia ·{' '}
        <a href="/terms-of-service" style={{ color: 'rgba(255,255,255,0.40)' }}>Terms of Service</a>
      </footer>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '40px' }}>
      <h2
        style={{
          fontSize: '15px',
          fontWeight: 600,
          color: '#00F5FF',
          letterSpacing: '0.02em',
          marginBottom: '14px',
          paddingBottom: '8px',
          borderBottom: '1px solid rgba(0,245,255,0.10)',
        }}
      >
        {title}
      </h2>
      <div style={{ fontSize: '14px', lineHeight: '1.8', color: 'rgba(255,255,255,0.78)' }} className="prose-content">
        {children}
      </div>
    </section>
  )
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontSize: '13px',
        fontWeight: 600,
        color: 'rgba(255,255,255,0.70)',
        letterSpacing: '0.04em',
        marginTop: '20px',
        marginBottom: '8px',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </h3>
  )
}

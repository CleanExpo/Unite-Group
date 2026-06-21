import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — Unite-Group Application',
  description: 'Terms of Service for the Unite-Group Application operated by Unite-Group Nexus Pty Ltd.',
  robots: { index: true, follow: true },
}

const LAST_UPDATED = '20 June 2026'
const CONTACT_EMAIL = 'contact@unite-group.in'
const COMPANY = 'Unite-Group Nexus Pty Ltd'
const APP_URL = 'https://unite-group.in'

export default function TermsOfServicePage() {
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
            style={{ color: '#2f9e44', fontFamily: 'var(--font-mono)', fontSize: '13px', letterSpacing: '0.15em', textDecoration: 'none' }}
          >
            UNITE-GROUP
          </a>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
            TERMS OF SERVICE
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
          Terms of Service
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.40)', fontSize: '13px', fontFamily: 'var(--font-mono)', marginBottom: '48px' }}>
          Last updated: {LAST_UPDATED}
        </p>

        <Section title="1. About These Terms">
          <p>
            These Terms of Service (&#8220;Terms&#8221;) govern your use of the Unite-Group Application
            (the &#8220;Application&#8221;) operated by {COMPANY} (&#8220;we&#8221;, &#8220;our&#8221;,
            &#8220;us&#8221;) and available at{' '}
            <a href={APP_URL} style={{ color: '#2f9e44' }}>{APP_URL}</a>.
          </p>
          <p>
            By accessing or using the Application, you agree to be bound by these Terms and our{' '}
            <a href="/privacy-policy" style={{ color: '#2f9e44' }}>Privacy Policy</a>. If you do not agree,
            do not use the Application.
          </p>
          <p>
            The Application is a <strong>private, single-operator business management platform</strong>. Access
            is strictly limited to authorised personnel of {COMPANY}. It is not a public service and is not
            offered to the general public.
          </p>
        </Section>

        <Section title="2. Eligibility and Access">
          <p>
            Access to the Application is restricted to:
          </p>
          <ul>
            <li>The founder and authorised personnel of {COMPANY}</li>
            <li>Persons who have been expressly granted access by {COMPANY}</li>
          </ul>
          <p>
            Unauthorised access to the Application is prohibited and may constitute an offence under the
            <em> Criminal Code Act 1995</em> (Cth) and other applicable Australian laws. We reserve the right to
            terminate access at any time, for any reason, without notice.
          </p>
        </Section>

        <Section title="3. Authorised Use">
          <p>You agree to use the Application only for lawful business purposes and in accordance with:</p>
          <ul>
            <li>These Terms</li>
            <li>All applicable Australian Commonwealth and State laws and regulations</li>
            <li>The terms and policies of any third-party services integrated with the Application (including Google, Xero, LinkedIn, and others)</li>
          </ul>
          <p>You must not:</p>
          <ul>
            <li>Attempt to gain unauthorised access to any part of the Application or its underlying infrastructure</li>
            <li>Introduce malware, viruses, or other harmful code</li>
            <li>Use the Application to process data in a manner that violates the <em>Privacy Act 1988</em> (Cth) or any other applicable privacy law</li>
            <li>Reverse engineer, decompile, or disassemble the Application</li>
            <li>Use the Application in any way that could damage, disable, or impair its operation</li>
          </ul>
        </Section>

        <Section title="4. Third-Party Integrations">
          <p>
            The Application integrates with third-party services including but not limited to:
          </p>
          <ul>
            <li><strong>Xero</strong> (accounting and financial data)</li>
            <li><strong>Google Workspace</strong> (Gmail, Calendar, Drive — via Google OAuth)</li>
            <li><strong>Linear</strong> (project management)</li>
            <li><strong>Social platforms</strong> (Facebook, LinkedIn, TikTok)</li>
          </ul>
          <p>
            Your use of these integrations is subject to the respective terms and policies of each provider.
            We are not responsible for the availability, accuracy, or legality of third-party services.
            Connecting a third-party service constitutes your authorisation for the Application to access that
            service on your behalf using the scopes you have approved.
          </p>
        </Section>

        <Section title="5. Intellectual Property">
          <p>
            All content, code, design, trademarks, and intellectual property rights in the Application are
            owned by or licensed to {COMPANY}. Nothing in these Terms transfers any IP rights to you.
          </p>
          <p>
            You retain ownership of any data, content, or materials that you input into or connect to the
            Application. By using the Application, you grant us a limited licence to process that data solely
            to provide the Application&#8217;s features.
          </p>
        </Section>

        <Section title="6. Data and Privacy">
          <p>
            Our collection and handling of personal information is governed by our{' '}
            <a href="/privacy-policy" style={{ color: '#2f9e44' }}>Privacy Policy</a>, which forms part of
            these Terms. By using the Application, you consent to the data practices described in that policy.
          </p>
          <p>
            You are responsible for ensuring that any personal information of third parties that you input
            into the Application is collected and shared in compliance with applicable privacy laws, including
            the <em>Privacy Act 1988</em> (Cth) and the Australian Privacy Principles.
          </p>
        </Section>

        <Section title="7. Disclaimers">
          <p>
            The Application is provided on an &#8220;as is&#8221; and &#8220;as available&#8221; basis without
            warranties of any kind, either express or implied, including but not limited to warranties of
            merchantability, fitness for a particular purpose, or non-infringement.
          </p>
          <p>
            Financial data, reports, and AI-generated insights provided through the Application are for
            informational purposes only. They do not constitute financial, accounting, legal, or investment
            advice. You should not rely on them as a substitute for professional advice.
          </p>
          <p>
            We do not warrant that the Application will be uninterrupted, error-free, or free of viruses or
            other harmful components. We do not warrant the accuracy or completeness of data retrieved from
            third-party integrations.
          </p>
        </Section>

        <Section title="8. Limitation of Liability">
          <p>
            To the maximum extent permitted by law, {COMPANY} and its officers, employees, agents, and
            contractors will not be liable for any:
          </p>
          <ul>
            <li>Indirect, incidental, special, consequential, or punitive damages</li>
            <li>Loss of profits, revenue, data, goodwill, or business opportunity</li>
            <li>Losses arising from interruption or unavailability of the Application or any third-party service</li>
            <li>Errors in data retrieved from integrated services including Xero or Google</li>
          </ul>
          <p>
            Where liability cannot be excluded by law (such as under the Australian Consumer Law), our
            liability is limited to the greatest extent permitted by law. Nothing in these Terms excludes,
            restricts, or modifies any guarantee, condition, warranty, right, or remedy that cannot be excluded
            under the <em>Competition and Consumer Act 2010</em> (Cth) (including the Australian Consumer Law).
          </p>
        </Section>

        <Section title="9. Indemnity">
          <p>
            You agree to indemnify, defend, and hold harmless {COMPANY} and its officers, employees, and
            agents from and against any claims, liabilities, damages, losses, costs, and expenses (including
            reasonable legal fees) arising out of or in connection with:
          </p>
          <ul>
            <li>Your use of or inability to use the Application</li>
            <li>Your breach of these Terms</li>
            <li>Your breach of any third-party rights, including privacy rights</li>
            <li>Any data you input into the Application</li>
          </ul>
        </Section>

        <Section title="10. Security">
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and for all
            activity that occurs under your account. You must notify us immediately at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#2f9e44' }}>{CONTACT_EMAIL}</a> if you
            suspect unauthorised access to your account.
          </p>
        </Section>

        <Section title="11. Suspension and Termination">
          <p>
            We may suspend or terminate your access to the Application at any time, with or without notice,
            for any reason including breach of these Terms. Upon termination, your right to use the Application
            ceases immediately.
          </p>
          <p>
            Sections 5, 7, 8, 9, 12, and 13 survive termination of these Terms.
          </p>
        </Section>

        <Section title="12. Changes to These Terms">
          <p>
            We may update these Terms from time to time. The &#8220;Last updated&#8221; date at the top of
            this page indicates when the most recent revision was made. Continued use of the Application
            after changes are posted constitutes acceptance of the revised Terms. We will endeavour to notify
            authorised users of material changes.
          </p>
        </Section>

        <Section title="13. Governing Law and Disputes">
          <p>
            These Terms are governed by and construed in accordance with the laws of Queensland, Australia,
            without regard to conflict of law principles.
          </p>
          <p>
            Any dispute arising out of or in connection with these Terms shall be subject to the exclusive
            jurisdiction of the courts of Queensland, Australia. Before commencing formal proceedings, the
            parties agree to attempt good-faith negotiation for at least 30 days.
          </p>
        </Section>

        <Section title="14. Contact">
          <p>For questions about these Terms, contact:</p>
          <address style={{ fontStyle: 'normal', lineHeight: 1.8 }}>
            <strong>{COMPANY}</strong><br />
            Australia<br />
            Email:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#2f9e44' }}>
              {CONTACT_EMAIL}
            </a>
          </address>
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
        <a href="/privacy-policy" style={{ color: 'rgba(255,255,255,0.40)' }}>Privacy Policy</a>
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
          color: '#2f9e44',
          letterSpacing: '0.02em',
          marginBottom: '14px',
          paddingBottom: '8px',
          borderBottom: '1px solid rgba(47, 158, 68,0.10)',
        }}
      >
        {title}
      </h2>
      <div style={{ fontSize: '14px', lineHeight: '1.8', color: 'rgba(255,255,255,0.78)' }}>
        {children}
      </div>
    </section>
  )
}

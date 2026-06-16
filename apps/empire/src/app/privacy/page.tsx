import type { Metadata } from "next";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Privacy Policy | Unite Group",
  description:
    "Privacy Policy for Unite Group's SaaS platform. Learn how we collect, use, and protect your personal data in compliance with the Australian Privacy Act and GDPR.",
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:px-8 sm:py-20">
        <header className="mb-12 border-b border-slate-200 pb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Last updated: May 31, 2026
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-700">
            Unite Group Pty Ltd (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or
            &ldquo;our&rdquo;) is committed to protecting your privacy. This
            Privacy Policy explains how we collect, use, disclose, and safeguard
            your personal information when you use our SaaS platform and related
            services (the &ldquo;Service&rdquo;).
          </p>
          <p className="mt-3 text-base leading-relaxed text-slate-700">
            This policy is designed to comply with the Australian Privacy
            Principles under the Privacy Act 1988 (Cth) and, where applicable,
            the EU General Data Protection Regulation (GDPR).
          </p>
        </header>

        <div className="space-y-10 text-base leading-relaxed text-slate-800">
          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">
              1. Introduction
            </h2>
            <p>
              Unite Group is the data controller for personal information
              collected through the Service. We are responsible for ensuring that
              your data is handled lawfully, fairly, and transparently.
            </p>
            <p className="mt-3">
              This Privacy Policy applies to all users of the Service, including
              account holders, trial users, and visitors to our websites. By
              using the Service, you consent to the practices described in this
              policy.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">
              2. Information We Collect
            </h2>

            <h3 className="mt-4 font-semibold text-slate-900">
              2.1 Account Information
            </h3>
            <p className="mt-2">
              When you register, we collect your name, email address,
              organisation name, password (stored in hashed form), and billing
              details.
            </p>

            <h3 className="mt-4 font-semibold text-slate-900">
              2.2 Usage Data
            </h3>
            <p className="mt-2">
              We automatically collect information about how you interact with
              the Service, including IP address, browser type, device
              identifiers, pages visited, features used, timestamps, and API
              request logs.
            </p>

            <h3 className="mt-4 font-semibold text-slate-900">
              2.3 Cookies and Similar Technologies
            </h3>
            <p className="mt-2">
              We use cookies, web beacons, and local storage to maintain
              sessions, remember preferences, and analyse usage patterns. See
              Section 7 for details.
            </p>

            <h3 className="mt-4 font-semibold text-slate-900">
              2.4 Third-Party Sources
            </h3>
            <p className="mt-2">
              We may receive information about you from third-party services
              you authorise (e.g., Single Sign-On providers such as Google or
              Microsoft), publicly available sources, or our business partners.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">
              3. How We Use Information
            </h2>
            <p>We use your personal information for the following purposes:</p>

            <h3 className="mt-4 font-semibold text-slate-900">
              3.1 Service Provision
            </h3>
            <p className="mt-2">
              To operate, maintain, and deliver the Service; authenticate your
              identity; process transactions; and provide customer support.
            </p>

            <h3 className="mt-4 font-semibold text-slate-900">
              3.2 Service Improvement
            </h3>
            <p className="mt-2">
              To analyse usage trends, debug issues, develop new features, and
              optimise performance and user experience.
            </p>

            <h3 className="mt-4 font-semibold text-slate-900">
              3.3 Communication
            </h3>
            <p className="mt-2">
              To send transactional emails (account confirmations, security
              alerts, billing notices), service announcements, and—with your
              consent—marketing communications.
            </p>

            <h3 className="mt-4 font-semibold text-slate-900">
              3.4 Legal and Compliance
            </h3>
            <p className="mt-2">
              To comply with legal obligations, enforce our Terms of Service,
              prevent fraud, and protect the rights and safety of Unite Group
              and its users.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">
              4. Data Sharing and Disclosure
            </h2>

            <h3 className="mt-4 font-semibold text-slate-900">
              4.1 Service Providers
            </h3>
            <p className="mt-2">
              We engage third-party processors (e.g., cloud hosting, payment
              processing, email delivery, analytics) who access personal data
              only as necessary to perform their contracted services under
              appropriate data protection agreements.
            </p>

            <h3 className="mt-4 font-semibold text-slate-900">
              4.2 Legal Requirements
            </h3>
            <p className="mt-2">
              We may disclose your information if required by law, court order,
              or governmental authority, or to protect the safety, rights, or
              property of Unite Group, its users, or the public.
            </p>

            <h3 className="mt-4 font-semibold text-slate-900">
              4.3 Business Transfers
            </h3>
            <p className="mt-2">
              In connection with a merger, acquisition, or sale of assets, your
              information may be transferred. We will notify you of any such
              change and any choices you may have regarding your data.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">
              5. Data Security
            </h2>

            <h3 className="mt-4 font-semibold text-slate-900">
              5.1 Encryption
            </h3>
            <p className="mt-2">
              All data in transit is encrypted using TLS 1.2 or higher. Data at
              rest is encrypted using AES-256 encryption managed by our cloud
              infrastructure provider.
            </p>

            <h3 className="mt-4 font-semibold text-slate-900">
              5.2 Access Controls
            </h3>
            <p className="mt-2">
              Access to personal data is restricted to authorised personnel on a
              need-to-know basis. We enforce multi-factor authentication,
              role-based access, and regular access reviews.
            </p>

            <h3 className="mt-4 font-semibold text-slate-900">
              5.3 Breach Notification
            </h3>
            <p className="mt-2">
              In the event of a data breach that is likely to result in serious
              harm, we will notify affected individuals and the relevant
              supervisory authority without undue delay and, where feasible,
              within 72 hours of becoming aware of the breach, in accordance
              with the Australian Notifiable Data Breaches scheme and GDPR
              Article 33.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">
              6. Your Rights
            </h2>
            <p>
              Depending on your jurisdiction, you may have the following rights
              regarding your personal information:
            </p>
            <ul className="mt-3 list-inside list-disc space-y-2 pl-2">
              <li>
                <strong>Access</strong> — request a copy of the personal data we
                hold about you.
              </li>
              <li>
                <strong>Correction</strong> — request correction of inaccurate or
                incomplete data.
              </li>
              <li>
                <strong>Deletion</strong> — request erasure of your personal
                data, subject to legal retention obligations.
              </li>
              <li>
                <strong>Portability</strong> — receive your data in a
                structured, machine-readable format.
              </li>
              <li>
                <strong>Objection</strong> — object to processing based on
                legitimate interests, including profiling and direct marketing.
              </li>
              <li>
                <strong>Restriction</strong> — request that we limit processing
                of your data in certain circumstances.
              </li>
              <li>
                <strong>Withdraw Consent</strong> — where processing is based on
                consent, you may withdraw it at any time without affecting prior
                processing.
              </li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at{" "}
              <a
                href="mailto:privacy@unite-group.com"
                className="text-blue-600 underline"
              >
                privacy@unite-group.com
              </a>
              . We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">
              7. Cookies and Tracking
            </h2>
            <p>We use the following categories of cookies:</p>
            <ul className="mt-3 list-inside list-disc space-y-2 pl-2">
              <li>
                <strong>Strictly Necessary</strong> — essential for
                authentication, security, and core functionality.
              </li>
              <li>
                <strong>Performance / Analytics</strong> — help us understand
                how visitors interact with the Service (e.g., PostHog, Plausible).
              </li>
              <li>
                <strong>Functional</strong> — remember your preferences such as
                language or timezone.
              </li>
            </ul>
            <p className="mt-3">
              You can manage or disable cookies through your browser settings.
              Disabling certain cookies may affect Service functionality.
            </p>
            <p className="mt-3">
              We do not respond to browser-based &ldquo;Do Not Track&rdquo;
              signals, as there is no universally accepted standard. However,
              we do not sell personal information to third parties for
              advertising purposes.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">
              8. International Transfers
            </h2>
            <p>
              Unite Group is based in Queensland, Australia. Your personal
              information is processed and stored on servers located in
              Australia (AWS Sydney region, ap-southeast-2).
            </p>
            <p className="mt-3">
              If you access the Service from outside Australia, your data will
              be transferred to and processed in Australia. We ensure that such
              transfers comply with applicable data protection laws, including
              the use of Standard Contractual Clauses for transfers from the
              European Economic Area (EEA) and the United Kingdom.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">
              9. Data Retention
            </h2>
            <p>
              We retain personal information for as long as necessary to fulfil
              the purposes described in this policy, unless a longer retention
              period is required by law.
            </p>
            <p className="mt-3">
              Account data is retained while your account is active. Upon
              account deletion, we will remove or anonymise your personal data
              within 90 days, except where retention is required for legal,
              tax, or regulatory purposes (e.g., financial records retained for
              7 years under Australian tax law).
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">
              10. Children&rsquo;s Privacy
            </h2>
            <p>
              The Service is not directed at children under the age of 16. We do
              not knowingly collect personal information from children. If we
              become aware that a child under 16 has provided us with personal
              data, we will take steps to delete that information promptly.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">
              11. Changes to Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy periodically. Material changes
              will be communicated via email or a prominent notice in the
              Service at least 14 days before they take effect. The &ldquo;Last
              updated&rdquo; date at the top reflects the effective date of the
              most recent version.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">
              12. Contact
            </h2>
            <p>
              For privacy-related enquiries, data requests, or complaints,
              contact our privacy officer:
            </p>
            <p className="mt-3">
              <strong>Unite Group Pty Ltd</strong>
              <br />
              Email:{" "}
              <a
                href="mailto:privacy@unite-group.com"
                className="text-blue-600 underline"
              >
                privacy@unite-group.com
              </a>
              <br />
              Queensland, Australia
            </p>
            <p className="mt-3">
              If you are in the EU/EEA, you also have the right to lodge a
              complaint with your local supervisory authority. In Australia, you
              may contact the Office of the Australian Information Commissioner
              (OAIC) at{" "}
              <a
                href="https://www.oaic.gov.au"
                className="text-blue-600 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                oaic.gov.au
              </a>
              .
            </p>
          </section>
        </div>

        <footer className="mt-16 border-t border-slate-200 pt-6 text-sm text-slate-500">
          <p>
            &copy; {new Date().getFullYear()} Unite Group Pty Ltd. All rights
            reserved.
          </p>
        </footer>
      </div>
    </main>
  );
}

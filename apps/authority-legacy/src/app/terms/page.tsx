import type { Metadata } from "next";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Terms of Service | Unite Group",
  description:
    "Terms of Service for Unite Group's SaaS platform. Read our terms governing account use, subscriptions, billing, and acceptable use.",
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:px-8 sm:py-20">
        <header className="mb-12 border-b border-slate-200 pb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Last updated: May 31, 2026
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-700">
            These Terms of Service (&ldquo;Terms&rdquo;) govern your access to
            and use of the Unite Group SaaS platform, including any associated
            websites, APIs, and services (collectively, the
            &ldquo;Service&rdquo;), provided by Unite Group Pty Ltd
            (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;).
          </p>
        </header>

        <div className="space-y-10 text-base leading-relaxed text-slate-800">
          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">
              1. Acceptance of Terms
            </h2>
            <p>
              By creating an account, subscribing to a plan, or otherwise
              accessing the Service, you agree to be bound by these Terms and
              our Privacy Policy. If you are entering into these Terms on behalf
              of an organisation, you represent that you have authority to bind
              that organisation, and all references to &ldquo;you&rdquo; refer
              to both you and that organisation.
            </p>
            <p className="mt-3">
              If you do not agree to these Terms, you must not access or use the
              Service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">
              2. Description of Service
            </h2>
            <p>
              Unite Group provides a cloud-based software-as-a-service platform
              designed to help teams manage projects, documents, and
              collaboration workflows (&ldquo;Platform&rdquo;). The Service
              includes web and mobile applications, application programming
              interfaces (&ldquo;APIs&rdquo;), integrations, and related
              support.
            </p>
            <p className="mt-3">
              We reserve the right to modify, suspend, or discontinue any part
              of the Service at any time. Where reasonably practicable, we will
              provide advance notice of material changes that materially reduce
              functionality.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">
              3. Account Registration and Security
            </h2>
            <p>To use the Service you must:</p>
            <ul className="mt-3 list-inside list-disc space-y-2 pl-2">
              <li>Be at least 18 years of age.</li>
              <li>
                Provide accurate, current, and complete registration
                information.
              </li>
              <li>
                Maintain the security of your credentials and accept
                responsibility for all activities under your account.
              </li>
              <li>
                Notify us immediately of any unauthorised access or security
                breach.
              </li>
            </ul>
            <p className="mt-3">
              You may not share accounts or credentials. We may suspend or
              terminate accounts that violate these Terms.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">
              4. Subscription and Billing
            </h2>
            <p>
              Access to paid features requires an active subscription plan
              (&ldquo;Plan&rdquo;). Fees are billed in advance on a monthly or
              annual basis depending on your selected Plan. All fees are quoted
              in Australian Dollars (AUD) unless otherwise stated and are
              exclusive of GST and other applicable taxes.
            </p>
            <p className="mt-3">
              You authorise us (or our third-party payment processor) to charge
              the payment method on file for all fees due. Failed payments may
              result in suspension of the Service until the balance is settled.
            </p>
            <p className="mt-3">
              Price increases (if any) will be communicated at least 30 days
              before the next billing cycle. Continued use after the effective
              date constitutes acceptance of the new pricing.
            </p>
            <h3 className="mt-5 font-semibold text-slate-900">
              4.1 API Usage Limits
            </h3>
            <p className="mt-2">
              Each Plan includes defined API rate limits and quotas as described
              on our pricing page. Exceeding these limits may result in
              throttling or additional charges. We reserve the right to
              temporarily restrict access that places unreasonable load on the
              Service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">
              5. Cancellation and Termination
            </h2>
            <p>
              You may cancel your subscription at any time from your account
              settings. Cancellation takes effect at the end of the current
              billing period; no prorated refunds are provided except where
              required by law.
            </p>
            <p className="mt-3">
              We may suspend or terminate your account immediately if you
              materially breach these Terms, fail to pay fees, or engage in
              conduct that harms the Service or other users.
            </p>
            <p className="mt-3">
              Upon termination, your right to use the Service ceases. We will
              make your data available for export for 30 days following
              termination, after which it may be deleted.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">
              6. Acceptable Use Policy
            </h2>
            <p>You agree not to use the Service to:</p>
            <ul className="mt-3 list-inside list-disc space-y-2 pl-2">
              <li>
                Violate any applicable law, regulation, or third-party right.
              </li>
              <li>
                Transmit malware, spam, phishing content, or other harmful code.
              </li>
              <li>
                Attempt to gain unauthorised access to the Service, other
                accounts, or related systems.
              </li>
              <li>
                Interfere with or disrupt the integrity or performance of the
                Service.
              </li>
              <li>
                Reverse-engineer, decompile, or disassemble any part of the
                Service.
              </li>
              <li>
                Resell, sublicense, or redistribute access to the Service
                without our written consent.
              </li>
            </ul>
            <p className="mt-3">
              Violations may result in immediate suspension or termination
              without refund.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">
              7. Intellectual Property
            </h2>
            <p>
              The Service, including its software, design, trademarks, and
              documentation, is owned by Unite Group or its licensors and
              protected by intellectual property laws. Except as expressly
              permitted, you receive no licence or right in the Service.
            </p>
            <p className="mt-3">
              You retain all ownership rights in the content you upload or
              create using the Service (&ldquo;User Content&rdquo;). By using
              the Service, you grant us a limited, worldwide, non-exclusive
              licence to host, store, process, and display your User Content
              solely to provide and operate the Service.
            </p>
            <p className="mt-3">
              Feedback or suggestions you provide may be used by us without
              restriction or compensation.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">
              8. Data Ownership and Privacy
            </h2>
            <p>
              You own your User Content. We process personal information in
              accordance with our{" "}
              <a href="/privacy" className="text-blue-600 underline">
                Privacy Policy
              </a>
              , the Australian Privacy Act 1988 (Cth), and, where applicable,
              the EU General Data Protection Regulation (GDPR).
            </p>
            <p className="mt-3">
              We will not access, share, or sell your User Content except as
              described in the Privacy Policy or as required by law.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">
              9. Limitation of Liability
            </h2>
            <p className="uppercase text-sm text-slate-700">
              To the maximum extent permitted by law:
            </p>
            <p className="mt-3">
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as
              available&rdquo; without warranties of any kind, whether express
              or implied. We do not warrant uninterrupted, error-free, or
              secure operation.
            </p>
            <p className="mt-3">
              In no event will Unite Group be liable for any indirect,
              incidental, special, consequential, or exemplary damages,
              including loss of profits, data, or goodwill, even if we have been
              advised of the possibility of such damages.
            </p>
            <p className="mt-3">
              Our total aggregate liability arising out of or related to these
              Terms will not exceed the amount you paid us in the twelve (12)
              months preceding the claim.
            </p>
            <p className="mt-3">
              Nothing in these Terms excludes or limits liability that cannot be
              excluded under applicable law, including the Australian Consumer
              Law.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">
              10. Changes to Terms
            </h2>
            <p>
              We may update these Terms from time to time. Material changes will
              be communicated via email or a prominent notice in the Service at
              least 14 days before they take effect. Your continued use of the
              Service after the effective date constitutes acceptance of the
              revised Terms.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">
              11. Governing Law
            </h2>
            <p>
              These Terms are governed by the laws of Queensland, Australia.
              Any disputes arising out of or in connection with these Terms are
              subject to the exclusive jurisdiction of the courts of Queensland.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">
              12. Contact Information
            </h2>
            <p>
              If you have questions about these Terms, please contact us at:
            </p>
            <p className="mt-3">
              <strong>Unite Group Pty Ltd</strong>
              <br />
              Email:{" "}
              <a
                href="mailto:legal@unite-group.com"
                className="text-blue-600 underline"
              >
                legal@unite-group.com
              </a>
              <br />
              Queensland, Australia
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

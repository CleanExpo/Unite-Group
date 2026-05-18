'use client';

// UNI-1995: 3-step admin wizard for creating a nexus_clients row.
//
// Step 1 — company_name + slug + website_url
// Step 2 — brand colours (primary, accent, tagline). Logo auto-fetch lives
//          in UNI-1996 (next ticket); this PR keeps the slot but doesn't
//          dispatch the /api/logo-fetch call.
// Step 3 — preview of the resulting /portal/[slug] header + publish.
//
// On publish: POST /api/empire/clients → redirect to /portal/<slug>.

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Step = 1 | 2 | 3;

interface WizardState {
  company_name: string;
  slug: string;
  website_url: string;
  primary_color: string;
  accent_color: string;
  tagline: string;
  logo_url: string;
}

interface LogoCandidate {
  url: string;
  source: string;
  score: number;
}

const DEFAULTS: WizardState = {
  company_name: '',
  slug: '',
  website_url: '',
  primary_color: '#D62828',
  accent_color: '#D62828',
  tagline: '',
  logo_url: '',
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

export function OnboardWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [state, setState] = useState<WizardState>(DEFAULTS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugAutoFilled, setSlugAutoFilled] = useState(true);

  const update = useCallback(<K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setState((current) => ({ ...current, [key]: value }));
  }, []);

  const onCompanyName = useCallback((value: string) => {
    setState((current) => ({
      ...current,
      company_name: value,
      slug: slugAutoFilled ? slugify(value) : current.slug,
    }));
  }, [slugAutoFilled]);

  const step1Valid = state.company_name.trim().length > 0 && SLUG_RE.test(state.slug);
  const step2Valid = HEX_RE.test(state.primary_color) && HEX_RE.test(state.accent_color);

  const publish = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/empire/clients', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          company_name: state.company_name.trim(),
          slug: state.slug.trim(),
          website_url: state.website_url.trim() || undefined,
          brand_config: {
            primary_color: state.primary_color,
            accent_color: state.accent_color,
            tagline: state.tagline.trim() || null,
            logo_url: state.logo_url.trim() || null,
          },
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ? mapErrorMessage(body.error) : `HTTP ${res.status}`);
        return;
      }
      router.push(body.portal_url ?? `/en/portal/${state.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  }, [state, router]);

  const styles = useMemo(
    () => ({
      ['--brand-primary' as string]: HEX_RE.test(state.primary_color) ? state.primary_color : '#D62828',
      ['--brand-accent' as string]: HEX_RE.test(state.accent_color) ? state.accent_color : '#D62828',
    }),
    [state.primary_color, state.accent_color],
  );

  return (
    <main
      style={{
        ...styles,
        padding: 32,
        maxWidth: 720,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px' }}>
        Onboard a new client
      </h1>

      <StepStrip current={step} />

      {step === 1 && (
        <Step1
          state={state}
          onCompanyName={onCompanyName}
          onSlug={(s) => {
            setSlugAutoFilled(false);
            update('slug', s);
          }}
          onWebsite={(v) => update('website_url', v)}
        />
      )}
      {step === 2 && (
        <Step2
          state={state}
          onChange={(k, v) => update(k, v)}
          onLogoSelect={(url) => update('logo_url', url)}
        />
      )}
      {step === 3 && (
        <Step3 state={state} />
      )}

      {error && (
        <div
          role="alert"
          data-wizard-error
          style={{
            borderLeft: '2px solid #f87171',
            padding: '10px 14px',
            color: '#f87171',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      <nav style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        {step > 1 && (
          <NavButton onClick={() => setStep((step - 1) as Step)}>← Back</NavButton>
        )}
        {step < 3 && (
          <NavButton
            primary
            disabled={step === 1 ? !step1Valid : !step2Valid}
            onClick={() => setStep((step + 1) as Step)}
          >
            Next →
          </NavButton>
        )}
        {step === 3 && (
          <NavButton primary disabled={submitting} onClick={publish}>
            {submitting ? 'Publishing…' : `Publish to /portal/${state.slug}`}
          </NavButton>
        )}
      </nav>
    </main>
  );
}

function mapErrorMessage(code: string): string {
  switch (code) {
    case 'slug_in_use':
      return 'That slug is already taken. Pick another.';
    case 'invalid_slug':
      return 'Slug must be lowercase letters, numbers, and hyphens (2-64 chars).';
    case 'invalid_company_name':
      return 'Company name is required (1-200 chars).';
    case 'invalid_brand_config':
      return 'Brand colours must be 6-digit hex (#RRGGBB).';
    case 'invalid_json':
      return 'Form submission was malformed. Reload and try again.';
    case 'slug_check_failed':
    case 'client_insert_failed':
      return 'Saving the client failed. Check the server logs and retry.';
    default:
      return `Save failed: ${code}.`;
  }
}

function StepStrip({ current }: { current: Step }) {
  const labels = ['Identity', 'Branding', 'Preview'];
  return (
    <ol
      aria-label="Wizard progress"
      style={{
        display: 'flex',
        gap: 8,
        padding: 0,
        margin: 0,
        listStyle: 'none',
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '0.14em',
      }}
    >
      {labels.map((label, i) => {
        const num = (i + 1) as Step;
        const active = num === current;
        const done = num < current;
        const tone = active ? 'var(--brand-primary)' : done ? 'var(--ink-primary, #f5f5f5)' : 'var(--ink-secondary, #94a3b8)';
        return (
          <li
            key={label}
            data-step-active={active}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              borderLeft: `2px solid ${tone}`,
              color: tone,
            }}
          >
            <span>{num}.</span>
            <span>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Step1({
  state,
  onCompanyName,
  onSlug,
  onWebsite,
}: {
  state: WizardState;
  onCompanyName: (v: string) => void;
  onSlug: (v: string) => void;
  onWebsite: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label="Company name">
        <input
          type="text"
          value={state.company_name}
          onChange={(e) => onCompanyName(e.target.value)}
          maxLength={200}
          placeholder="Acme Restoration"
          style={inputStyle}
        />
      </Field>
      <Field
        label="Slug"
        hint="Lowercase letters, numbers, hyphens. Used in /portal/<slug>."
      >
        <input
          type="text"
          value={state.slug}
          onChange={(e) => onSlug(e.target.value.toLowerCase())}
          maxLength={64}
          placeholder="acme-restoration"
          style={inputStyle}
        />
      </Field>
      <Field label="Website (optional)">
        <input
          type="url"
          value={state.website_url}
          onChange={(e) => onWebsite(e.target.value)}
          maxLength={500}
          placeholder="https://acmerestoration.com.au"
          style={inputStyle}
        />
      </Field>
    </div>
  );
}

function Step2({
  state,
  onChange,
  onLogoSelect,
}: {
  state: WizardState;
  onChange: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void;
  onLogoSelect: (url: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <LogoFetchPanel
        websiteUrl={state.website_url}
        selectedLogoUrl={state.logo_url}
        onSelect={onLogoSelect}
      />
      <Field
        label="Primary colour"
        hint="6-digit hex (#RRGGBB). Drives --brand-primary on the portal."
      >
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="color"
            value={HEX_RE.test(state.primary_color) ? state.primary_color : '#D62828'}
            onChange={(e) => onChange('primary_color', e.target.value)}
            style={{ width: 48, height: 36, padding: 0, border: '1px solid var(--border-default, #27272a)', borderRadius: 4 }}
          />
          <input
            type="text"
            value={state.primary_color}
            onChange={(e) => onChange('primary_color', e.target.value)}
            maxLength={7}
            style={{ ...inputStyle, flex: 1, fontFamily: 'var(--font-mono, monospace)' }}
          />
        </div>
      </Field>
      <Field label="Accent colour">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="color"
            value={HEX_RE.test(state.accent_color) ? state.accent_color : '#D62828'}
            onChange={(e) => onChange('accent_color', e.target.value)}
            style={{ width: 48, height: 36, padding: 0, border: '1px solid var(--border-default, #27272a)', borderRadius: 4 }}
          />
          <input
            type="text"
            value={state.accent_color}
            onChange={(e) => onChange('accent_color', e.target.value)}
            maxLength={7}
            style={{ ...inputStyle, flex: 1, fontFamily: 'var(--font-mono, monospace)' }}
          />
        </div>
      </Field>
      <Field label="Tagline (optional)" hint="≤200 chars. Shown under the company name on the portal.">
        <input
          type="text"
          value={state.tagline}
          onChange={(e) => onChange('tagline', e.target.value)}
          maxLength={200}
          placeholder="Restoration partner of choice"
          style={inputStyle}
        />
      </Field>
    </div>
  );
}

function LogoFetchPanel({
  websiteUrl,
  selectedLogoUrl,
  onSelect,
}: {
  websiteUrl: string;
  selectedLogoUrl: string;
  onSelect: (url: string) => void;
}) {
  const [candidates, setCandidates] = useState<LogoCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCandidates = useCallback(async () => {
    if (!websiteUrl.trim()) {
      setError('Set a website URL in step 1 first.');
      return;
    }
    setLoading(true);
    setError(null);
    setCandidates([]);
    try {
      let domain: string;
      try {
        domain = new URL(websiteUrl.includes('://') ? websiteUrl : `https://${websiteUrl}`).hostname;
      } catch {
        setError('Website URL is malformed.');
        setLoading(false);
        return;
      }
      const res = await fetch(`/api/logo-fetch?domain=${encodeURIComponent(domain)}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(mapLogoError(body.error, res.status));
        return;
      }
      const list: LogoCandidate[] = Array.isArray(body.allCandidates) ? body.allCandidates : [];
      setCandidates(list);
      if (list.length > 0 && !selectedLogoUrl) {
        onSelect(list[0].url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [websiteUrl, selectedLogoUrl, onSelect]);

  return (
    <Field label="Logo" hint="Auto-fetched from the website URL. Founder picks one — top 5 candidates by heuristic score.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          type="button"
          onClick={fetchCandidates}
          disabled={loading || !websiteUrl.trim()}
          style={{
            alignSelf: 'flex-start',
            padding: '6px 12px',
            border: '1px solid var(--border-default, #27272a)',
            borderRadius: 4,
            background: 'var(--surface-1, #18181b)',
            color: 'var(--ink-primary, #f5f5f5)',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            cursor: loading ? 'wait' : !websiteUrl.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !websiteUrl.trim() ? 0.5 : 1,
          }}
        >
          {loading ? 'Fetching…' : candidates.length > 0 ? 'Re-fetch' : 'Auto-fetch logo'}
        </button>
        {error && (
          <p
            role="alert"
            data-logo-fetch-error
            style={{ margin: 0, fontSize: 12, color: '#f87171', fontFamily: 'var(--font-mono, monospace)' }}
          >
            {error}
          </p>
        )}
        {candidates.length > 0 && (
          <div
            role="radiogroup"
            aria-label="Logo candidate"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}
          >
            {candidates.map((c) => {
              const selected = c.url === selectedLogoUrl;
              return (
                <button
                  type="button"
                  key={c.url}
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onSelect(c.url)}
                  data-logo-candidate
                  data-selected={selected}
                  style={{
                    padding: 8,
                    borderRadius: 6,
                    border: `2px solid ${selected ? 'var(--brand-primary)' : 'var(--border-default, #27272a)'}`,
                    background: 'var(--surface-2, #0f0f10)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    alignItems: 'center',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary user-supplied URLs; same justification as portal/[slug] */}
                  <img
                    src={c.url}
                    alt={c.source}
                    style={{ maxWidth: '100%', maxHeight: 48, objectFit: 'contain', background: '#fff', padding: 4, borderRadius: 3 }}
                  />
                  <span style={{ fontSize: 9, fontFamily: 'var(--font-mono, monospace)', color: 'var(--ink-secondary, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.10em' }}>
                    {c.source} · {c.score}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Field>
  );
}

function mapLogoError(code: string | undefined, status: number): string {
  if (status === 429) return 'Logo fetch rate-limited. Wait a minute and retry.';
  if (status === 400) return 'Website URL is invalid (SSRF-blocked or malformed). Edit step 1.';
  if (status === 422) return 'Could not load that site — wrong URL or the site is down.';
  if (status === 404) return 'No logo candidates found on the page. Drop the URL manually below.';
  return code ? `Logo fetch failed: ${code}.` : `Logo fetch failed (HTTP ${status}).`;
}

function Step3({ state }: { state: WizardState }) {
  const monogram = state.company_name.slice(0, 2).toUpperCase();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: 13, color: 'var(--ink-secondary, #94a3b8)' }}>
        Preview of the portal header. Publishing inserts a row into{' '}
        <code>nexus_clients</code> and redirects you to{' '}
        <code>/portal/{state.slug}</code>.
      </p>
      <div
        style={{
          padding: '24px 20px',
          borderRadius: 8,
          background: 'var(--surface-1, #18181b)',
          border: '1px solid var(--border-default, #27272a)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: 'var(--brand-primary)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 14,
          }}
        >
          {monogram || '??'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 18, fontWeight: 700 }}>
            {state.company_name || 'Untitled client'}
          </span>
          {state.tagline && (
            <span style={{ fontSize: 12, color: 'var(--ink-secondary, #94a3b8)' }}>
              {state.tagline}
            </span>
          )}
        </div>
        <span
          style={{
            marginLeft: 'auto',
            height: 3,
            width: 40,
            background: 'var(--brand-primary)',
            borderRadius: 2,
          }}
          aria-hidden
        />
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-secondary, #94a3b8)' }}>
        {label}
      </span>
      {children}
      {hint && (
        <span style={{ fontSize: 11, color: 'var(--ink-hush, #888)' }}>
          {hint}
        </span>
      )}
    </label>
  );
}

function NavButton({
  primary,
  disabled,
  children,
  onClick,
}: {
  primary?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 14px',
        borderRadius: 6,
        border: '1px solid var(--border-default, #27272a)',
        background: primary ? 'var(--brand-primary)' : 'var(--surface-1, #18181b)',
        color: primary ? '#fff' : 'var(--ink-primary, #f5f5f5)',
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: '0.14em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  background: 'var(--surface-2, #0f0f10)',
  border: '1px solid var(--border-default, #27272a)',
  borderRadius: 4,
  color: 'var(--ink-primary, #f5f5f5)',
  fontSize: 14,
  fontFamily: 'system-ui, sans-serif',
  width: '100%',
};

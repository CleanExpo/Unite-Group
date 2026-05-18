'use client';

// /empire/clients/[slug]/edit — client edit form. Mirrors the wizard's
// branding step but operates on an existing row via PATCH.

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { BrandConfig } from '@/types/brand-config';

interface EditClientFormProps {
  slug: string;
  initial: {
    company_name: string;
    website_url: string | null;
    contact_email: string | null;
    status: string;
    brand_config: BrandConfig;
  };
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const STATUSES = ['active', 'paused', 'churned', 'onboarding'] as const;

export function EditClientForm({ slug, initial }: EditClientFormProps) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState(initial.company_name);
  const [websiteUrl, setWebsiteUrl] = useState(initial.website_url ?? '');
  const [contactEmail, setContactEmail] = useState(initial.contact_email ?? '');
  const [primary, setPrimary] = useState(initial.brand_config.primary_color ?? '#D62828');
  const [accent, setAccent] = useState(initial.brand_config.accent_color ?? '#D62828');
  const [tagline, setTagline] = useState(initial.brand_config.tagline ?? '');
  const [logoUrl, setLogoUrl] = useState(initial.brand_config.logo_url ?? '');
  const [status, setStatus] = useState(initial.status);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(async () => {
    if (!HEX_RE.test(primary) || !HEX_RE.test(accent)) {
      setError('Brand colours must be 6-digit hex (#RRGGBB).');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/empire/clients/${slug}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName.trim(),
          website_url: websiteUrl.trim() || null,
          contact_email: contactEmail.trim() || null,
          status,
          brand_config: {
            primary_color: primary,
            accent_color: accent,
            tagline: tagline.trim() || null,
            logo_url: logoUrl.trim() || null,
          },
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(mapError(body.error, res.status));
        return;
      }
      setNotice('Saved. Reloading…');
      setTimeout(() => router.refresh(), 400);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSaving(false);
    }
  }, [
    slug,
    companyName,
    websiteUrl,
    contactEmail,
    status,
    primary,
    accent,
    tagline,
    logoUrl,
    router,
  ]);

  return (
    <form
      style={{
        ['--brand-primary' as string]: HEX_RE.test(primary) ? primary : '#D62828',
        padding: 32,
        maxWidth: 720,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Field label="Company name">
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          maxLength={200}
          style={inputStyle}
        />
      </Field>

      <Field label="Website">
        <input
          type="url"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          maxLength={500}
          placeholder="https://…"
          style={inputStyle}
        />
      </Field>

      <Field label="Contact email">
        <input
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          maxLength={250}
          style={inputStyle}
        />
      </Field>

      <Field label="Status">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={inputStyle}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Primary colour">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="color"
            value={HEX_RE.test(primary) ? primary : '#D62828'}
            onChange={(e) => setPrimary(e.target.value)}
            style={swatchStyle}
          />
          <input
            type="text"
            value={primary}
            onChange={(e) => setPrimary(e.target.value)}
            maxLength={7}
            style={{ ...inputStyle, flex: 1, fontFamily: 'var(--font-mono, monospace)' }}
          />
        </div>
      </Field>

      <Field label="Accent colour">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="color"
            value={HEX_RE.test(accent) ? accent : '#D62828'}
            onChange={(e) => setAccent(e.target.value)}
            style={swatchStyle}
          />
          <input
            type="text"
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
            maxLength={7}
            style={{ ...inputStyle, flex: 1, fontFamily: 'var(--font-mono, monospace)' }}
          />
        </div>
      </Field>

      <Field label="Tagline" hint="≤200 chars">
        <input
          type="text"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          maxLength={200}
          style={inputStyle}
        />
      </Field>

      <Field label="Logo URL" hint="Public URL — Supabase storage or external CDN">
        <input
          type="url"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          maxLength={500}
          style={inputStyle}
        />
      </Field>

      {error && (
        <div
          role="alert"
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
      {notice && (
        <div
          role="status"
          style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: 12,
            color: 'var(--ink-secondary, #94a3b8)',
          }}
        >
          {notice}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        style={{
          alignSelf: 'flex-start',
          padding: '8px 14px',
          borderRadius: 6,
          border: '1px solid var(--border-default, #27272a)',
          background: 'var(--brand-primary)',
          color: '#fff',
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: 12,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          cursor: saving ? 'wait' : 'pointer',
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}

function mapError(code: string | undefined, status: number): string {
  switch (code) {
    case 'invalid_company_name':
      return 'Company name is required (1-200 chars).';
    case 'invalid_brand_config':
      return 'Brand colours must be 6-digit hex (#RRGGBB).';
    case 'invalid_status':
      return 'Status must be active, paused, churned, or onboarding.';
    case 'invalid_website_url':
      return 'Website URL is malformed.';
    case 'invalid_contact_email':
      return 'Contact email is malformed.';
    case 'empty_patch':
      return 'Nothing to save — change a field first.';
    case 'client_not_found':
      return 'This client no longer exists. The page may need refreshing.';
    case 'client_update_failed':
      return 'Save failed in Supabase. Check server logs and retry.';
    default:
      return code ? `Save failed: ${code}.` : `Save failed (HTTP ${status}).`;
  }
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
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          color: 'var(--ink-secondary, #94a3b8)',
        }}
      >
        {label}
      </span>
      {children}
      {hint && (
        <span style={{ fontSize: 11, color: 'var(--ink-hush, #888)' }}>{hint}</span>
      )}
    </label>
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

const swatchStyle: React.CSSProperties = {
  width: 48,
  height: 36,
  padding: 0,
  border: '1px solid var(--border-default, #27272a)',
  borderRadius: 4,
};

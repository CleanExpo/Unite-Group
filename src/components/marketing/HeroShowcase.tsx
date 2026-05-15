"use client";

import * as React from "react";
import type { BrandConfig } from "@/types/brand-config";
import { ShowcaseCard } from "@/components/ui/showcase-card";

interface HeroShowcaseProps {
  /**
   * Stable brand / client slug. Used to resolve the default hero image at
   * `/brands/{slug}/hero.jpg` when `imageUrl` is not provided. ALWAYS required
   * — marketing surfaces are always per-brand.
   */
  brandSlug: string;
  /**
   * Already-resolved BrandConfig (loaded server-side via `getBrandConfig`).
   * Currently used for the optional `tagline` (renders above the heading).
   * Brand colour overrides are reserved for a later iteration — the
   * underlying ShowcaseCard ships a fixed dark aesthetic.
   */
  brand?: Partial<BrandConfig>;
  /**
   * Brand name shown in the card footer. Pass the resolved company / display
   * name from the server — the wrapper deliberately does NOT pull it from
   * BrandConfig because the canonical name lives one level up on the
   * BrandedClient row.
   */
  brandName?: string;
  /** Hero heading — the main value-prop sentence. */
  heading: string;
  /** Optional supporting copy below the heading. */
  description?: string;
  /** Optional small tagline above the heading. Falls back to `brand.tagline`. */
  tagline?: string;
  /**
   * Hero image URL. When omitted, falls back to `/brands/{brandSlug}/hero.jpg`
   * — host that asset alongside the brand. Unsplash defaults are NOT used by
   * this wrapper (per-brand pages must own their imagery).
   */
  imageUrl?: string;
  /** Alt text for the hero image. */
  imageAlt?: string;
  /** CTA button label. Omit to hide the CTA. */
  ctaText?: string;
  /** CTA click handler. */
  onCtaClick?: () => void;
  /**
   * Services / capability tags shown in the footer. Pass explicitly — the
   * BrandConfig contract does not include a services array.
   */
  services?: string[];
  className?: string;
}

// ─── Wrapper ─────────────────────────────────────────────────────────────────

/**
 * HeroShowcase — per-brand wrapper around `<ShowcaseCard>` for marketing /
 * portfolio / client-portal hero sections. Resolves the hero image from a
 * stable `/brands/{slug}/hero.jpg` convention when not provided, and pulls
 * the tagline from BrandConfig when not passed explicitly.
 *
 * Scope: always per-brand. Marketing surfaces never use the Nexus UI
 * default palette — they live under their own brand identity.
 *
 * @example
 * // From a server component that has already loaded BrandedClient:
 * <HeroShowcase
 *   brandSlug={client.slug}
 *   brand={client.brand_config}
 *   brandName={client.company_name}
 *   heading="Restoration done right"
 *   description="..."
 *   ctaText="Book a job"
 *   services={["Water damage", "Mould", "Fire"]}
 * />
 */
export function HeroShowcase({
  brandSlug,
  brand,
  brandName,
  heading,
  description,
  tagline,
  imageUrl,
  imageAlt,
  ctaText,
  onCtaClick,
  services,
  className,
}: HeroShowcaseProps) {
  const resolvedImage = imageUrl ?? `/brands/${brandSlug}/hero.jpg`;
  const resolvedTagline = tagline ?? brand?.tagline ?? undefined;
  const resolvedAlt = imageAlt ?? `${brandName ?? brandSlug} hero`;

  return (
    <ShowcaseCard
      tagline={resolvedTagline ?? undefined}
      heading={heading}
      description={description}
      imageUrl={resolvedImage}
      imageAlt={resolvedAlt}
      ctaText={ctaText}
      onCtaClick={onCtaClick}
      brandName={brandName}
      services={services}
      className={className}
    />
  );
}

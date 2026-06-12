// src/components/marketing/HomepageHero.tsx
// Thin client wrapper around <HeroShowcase>. Exists because ShowcaseCard's
// CTA is an onClick handler (not a Link), and the page-level server
// component cannot pass functions into client components. This wrapper
// receives pre-resolved brand props from the server and owns the CTA
// navigation via next/navigation's useRouter.

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { BrandConfig } from "@/types/brand-config";
import { HeroShowcase } from "@/components/marketing/HeroShowcase";

interface HomepageHeroProps {
  brandSlug: string;
  brand?: Partial<BrandConfig>;
  brandName: string;
  heading: string;
  description: string;
  tagline?: string;
  imageUrl?: string;
  imageAlt?: string;
  ctaText: string;
  ctaHref: string;
  services: string[];
}

export function HomepageHero({
  brandSlug,
  brand,
  brandName,
  heading,
  description,
  tagline,
  imageUrl,
  imageAlt,
  ctaText,
  ctaHref,
  services,
}: HomepageHeroProps) {
  const router = useRouter();
  return (
    <HeroShowcase
      brandSlug={brandSlug}
      brand={brand}
      brandName={brandName}
      heading={heading}
      description={description}
      tagline={tagline}
      imageUrl={imageUrl}
      imageAlt={imageAlt}
      ctaText={ctaText}
      onCtaClick={() => router.push(ctaHref)}
      services={services}
    />
  );
}

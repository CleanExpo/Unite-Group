// src/lib/validation/portal-content-schema.ts
// UNI-1947 Pillar 2: Zod schema for PortalContent — used by admin mutation
// endpoints that need a typed parser with friendly error messages.
//
// The hand-rolled type-guard in src/types/portal-content.ts is the fast
// path used by the server-side fetcher (no zod cost on every render).
// This zod schema is the safety net for write paths.

import { z } from 'zod';
import {
  DELIVERABLE_STATUSES,
  TOUCHPOINT_STATUSES,
  type PortalContent,
} from '@/types/portal-content';

export const deliverableSchema = z.object({
  category: z.string().min(1).max(200),
  status: z.enum(DELIVERABLE_STATUSES),
  detail: z.string().max(1000),
});

export const touchpointSchema = z.object({
  name: z.string().min(1).max(200),
  domain: z.string().max(253).optional(),
  status: z.enum(TOUCHPOINT_STATUSES),
});

export const quickLinkSchema = z.object({
  label: z.string().min(1).max(200),
  href: z.string().min(1).max(500),
  note: z.string().max(500),
});

export const portalContentSchema = z.object({
  welcome_text: z.string().max(2000).optional(),
  deliverables: z.array(deliverableSchema).optional(),
  touchpoints: z.array(touchpointSchema).optional(),
  quick_links: z.array(quickLinkSchema).optional(),
}).strict();

// Type assertion: keep this in sync with PortalContent in src/types.
// If the shape ever drifts, this line fails to compile.
export type ZPortalContent = z.infer<typeof portalContentSchema>;
const _typeCheck: ZPortalContent = {} as PortalContent;
void _typeCheck;

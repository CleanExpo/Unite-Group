// src/types/portal-content.ts
// UNI-1947 Pillar 2: Typed portal_content schema for nexus_clients.
//
// Mirrors the CHECK constraint in
// supabase/migrations/20260513170100_add_portal_content_schema.sql.
// The DB constraint only validates top-level shape; per-element validation
// (status enums, length caps) lives here and in the zod schema next door.

export const DELIVERABLE_STATUSES = ['done', 'in-progress', 'planned'] as const;
export const TOUCHPOINT_STATUSES = ['active', 'planned'] as const;

export type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number];
export type TouchpointStatus = (typeof TOUCHPOINT_STATUSES)[number];

export interface Deliverable {
  category: string;
  status: DeliverableStatus;
  detail: string;
}

export interface Touchpoint {
  name: string;
  domain?: string;
  status: TouchpointStatus;
}

export interface QuickLink {
  label: string;
  href: string;
  note: string;
}

export interface PortalContent {
  welcome_text?: string;
  deliverables?: Deliverable[];
  touchpoints?: Touchpoint[];
  quick_links?: QuickLink[];
}

const WELCOME_MAX = 2000;
const CATEGORY_MAX = 200;
const DETAIL_MAX = 1000;
const NAME_MAX = 200;
const DOMAIN_MAX = 253;
const LABEL_MAX = 200;
const HREF_MAX = 500;
const NOTE_MAX = 500;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isValidDeliverable(v: unknown): v is Deliverable {
  if (!isPlainObject(v)) return false;
  if (typeof v.category !== 'string' || v.category.length === 0 || v.category.length > CATEGORY_MAX) return false;
  if (typeof v.detail !== 'string' || v.detail.length > DETAIL_MAX) return false;
  if (!DELIVERABLE_STATUSES.includes(v.status as DeliverableStatus)) return false;
  return true;
}

function isValidTouchpoint(v: unknown): v is Touchpoint {
  if (!isPlainObject(v)) return false;
  if (typeof v.name !== 'string' || v.name.length === 0 || v.name.length > NAME_MAX) return false;
  if (v.domain !== undefined) {
    if (typeof v.domain !== 'string' || v.domain.length > DOMAIN_MAX) return false;
  }
  if (!TOUCHPOINT_STATUSES.includes(v.status as TouchpointStatus)) return false;
  return true;
}

function isValidQuickLink(v: unknown): v is QuickLink {
  if (!isPlainObject(v)) return false;
  if (typeof v.label !== 'string' || v.label.length === 0 || v.label.length > LABEL_MAX) return false;
  if (typeof v.href !== 'string' || v.href.length === 0 || v.href.length > HREF_MAX) return false;
  if (typeof v.note !== 'string' || v.note.length > NOTE_MAX) return false;
  return true;
}

/**
 * Type-guard. Returns true iff every PRESENT typed key validates.
 * Unknown top-level keys cause a false return (stricter than normalize).
 */
export function isValidPortalContent(input: unknown): input is PortalContent {
  if (!isPlainObject(input)) return false;

  if ('welcome_text' in input) {
    const w = input.welcome_text;
    if (typeof w !== 'string' || w.length > WELCOME_MAX) return false;
  }
  if ('deliverables' in input) {
    if (!Array.isArray(input.deliverables)) return false;
    if (!input.deliverables.every(isValidDeliverable)) return false;
  }
  if ('touchpoints' in input) {
    if (!Array.isArray(input.touchpoints)) return false;
    if (!input.touchpoints.every(isValidTouchpoint)) return false;
  }
  if ('quick_links' in input) {
    if (!Array.isArray(input.quick_links)) return false;
    if (!input.quick_links.every(isValidQuickLink)) return false;
  }
  return true;
}

/**
 * Strips unknown top-level keys, drops invalid array elements, returns a
 * clean PortalContent. Never throws — best-effort clean-up. Used by the
 * server-side fetcher so a partially-bad DB row still renders a usable
 * portal.
 */
export function normalizePortalContent(input: unknown): PortalContent {
  if (!isPlainObject(input)) return {};
  const out: PortalContent = {};

  if (typeof input.welcome_text === 'string' && input.welcome_text.length <= WELCOME_MAX) {
    out.welcome_text = input.welcome_text;
  }
  if (Array.isArray(input.deliverables)) {
    out.deliverables = input.deliverables.filter(isValidDeliverable);
  }
  if (Array.isArray(input.touchpoints)) {
    out.touchpoints = input.touchpoints.filter(isValidTouchpoint);
  }
  if (Array.isArray(input.quick_links)) {
    out.quick_links = input.quick_links.filter(isValidQuickLink);
  }
  return out;
}

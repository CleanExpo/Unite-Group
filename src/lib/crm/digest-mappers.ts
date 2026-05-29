/**
 * Shared CRM Digest Mappers and Types
 *
 * Consolidates types, constants, and mapper functions used by both
 * the API route and the server helper to eliminate code duplication.
 *
 * @module src/lib/crm/digest-mappers
 */

import { type CrmDigestLead, type CrmDigestOpportunity, type CrmDigestTask } from './daily-digest';

/* ──────────────────────── Row types (Supabase shape) ─────────────────────── */

export type CrmLeadDigestRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email?: string | null;
  company: string | null;
  status: string | null;
  qualification_score: number | null;
  captured_at: string;
};

export type CrmTaskDigestRow = {
  id: string;
  title: string | null;
  status: string | null;
  priority: string | null;
  assignee_name: string | null;
  created_at: string;
};

export type CrmOpportunityDigestRow = {
  id: string;
  name: string | null;
  stage: string | null;
  status: string | null;
  value_amount: number | string | null;
  probability: number | null;
  approval_required: boolean | null;
  next_action: string | null;
  updated_at: string;
};

/* ──────────────────────── Column select lists ────────────────────────────── */

/** Columns to select for the leads digest read. */
export const LEAD_SELECT_COLUMNS = [
  'id',
  'first_name',
  'last_name',
  'company',
  'status',
  'qualification_score',
  'captured_at',
].join(',');

/** Columns to select when email is also required (API route). */
export const LEAD_SELECT_COLUMNS_WITH_EMAIL = [
  'id',
  'first_name',
  'last_name',
  'email',
  'company',
  'status',
  'qualification_score',
  'captured_at',
].join(',');

export const TASK_SELECT_COLUMNS = [
  'id',
  'title',
  'status',
  'priority',
  'assignee_name',
  'created_at',
].join(',');

export const OPPORTUNITY_SELECT_COLUMNS = [
  'id',
  'name',
  'stage',
  'status',
  'value_amount',
  'probability',
  'approval_required',
  'next_action',
  'updated_at',
].join(',');

/* ──────────────────────── Business-logic constants ───────────────────────── */

export const QUALIFICATION_BANDS = new Set(['qualified', 'nurture', 'needs_review', 'spam_risk']);

/* ──────────────────────── Shared helpers ─────────────────────────────────── */

/** Trim and validate a nullable string value. */
export function clean(value: string | null | undefined): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

/** Read the configured digest owner (defaults to 'Margot'). */
export function readDigestOwner(): string {
  return process.env.UNITE_CRM_DIGEST_OWNER?.trim() || 'Margot';
}

/** Parse a number or numeric string into a finite number or null. */
export function valueEstimate(value: number | string | null): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/* ──────────────────────── Row mappers ────────────────────────────────────── */

export function mapLead(row: CrmLeadDigestRow): CrmDigestLead {
  const firstName = clean(row.first_name);
  const lastName = clean(row.last_name);
  const name = [firstName, lastName].filter(Boolean).join(' ') || null;
  const status = clean(row.status) || null;

  return {
    id: row.id,
    name,
    company: clean(row.company) || null,
    email: clean(row.email) || null,
    status,
    qualificationBand: status && QUALIFICATION_BANDS.has(status) ? status : null,
    score: typeof row.qualification_score === 'number' ? row.qualification_score : null,
    nextAction: 'Review and decide next CRM action',
  };
}

export function mapTask(row: CrmTaskDigestRow): CrmDigestTask {
  return {
    id: row.id,
    title: clean(row.title) || 'Untitled task',
    owner: clean(row.assignee_name) || null,
    status: clean(row.status) || null,
    priority: clean(row.priority) || null,
  };
}

export function mapOpportunity(row: CrmOpportunityDigestRow): CrmDigestOpportunity {
  return {
    id: row.id,
    name: clean(row.name) || 'Untitled opportunity',
    stage: clean(row.stage) || clean(row.status) || null,
    valueEstimate: valueEstimate(row.value_amount),
    probability: typeof row.probability === 'number' ? row.probability / 100 : null,
    requiresApproval: row.approval_required === true,
    nextAction: clean(row.next_action) || null,
  };
}

// Spine domain types — hand-authored (canonical until `supabase gen types` runs on the
// dedicated, un-polluted spine project; CI then verifies these match).
export type UUID = string;
export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

export interface Party {
  party_id: UUID; kind: 'person' | 'organization'; display_name: string;
  golden_party_id: UUID | null; merged_at: string | null; is_active: boolean;
  created_at: string; updated_at: string;
}
export interface Person { party_id: UUID; given_name: string | null; family_name: string | null; email: string | null; phone: string | null; }
export interface Organization { party_id: UUID; legal_name: string; abn: string | null; acn: string | null; state: string | null; logo_url: string | null; }
export interface OrgMembership { id: UUID; person_party_id: UUID; org_party_id: UUID; role: 'member' | 'owner' | 'staff'; status: 'active' | 'suspended' | 'left'; created_at: string; }
export interface PartyIdentifier { id: UUID; party_id: UUID; scheme: string; value: string; created_at: string; }
export interface SourceRecord { id: UUID; party_id: UUID; source_system: string; source_pk: string; source_payload: Json; ingested_at: string; }
export interface IdentityAudit { id: UUID; party_id: UUID | null; other_party_id: UUID | null; action: string; reason: string | null; confidence: number | null; decided_by: UUID | null; created_at: string; }

export interface Lead { id: UUID; contact_person_id: UUID | null; suburb: string | null; state: string | null; hazard_type: string | null; description: string | null; campaign_id: UUID | null; source: string | null; status: string; created_at: string; }
export interface LeadRouting { id: UUID; lead_id: UUID; org_id: UUID; status: string; lead_fee_cents: number | null; assigned_at: string; }
export interface Campaign { id: UUID; name: string; owner: string; channel: string | null; source_code: string | null; created_at: string; }
export interface Membership { id: UUID; org_id: UUID; tier: string; status: string; joined_at: string; }
export interface DuesInvoice { id: UUID; org_id: UUID; amount_cents: number | null; period: string | null; status: string; created_at: string; }
export interface Customer { id: UUID; org_id: UUID; contact_person_id: UUID | null; name: string; source_lead_id: UUID | null; created_at: string; }
export interface Job { id: UUID; org_id: UUID; customer_id: UUID; status: string; hazard_type: string | null; source_lead_id: UUID | null; created_at: string; }
export interface Evidence { id: UUID; org_id: UUID; job_id: UUID; captured_by: UUID | null; captured_at: string; gps_lat: number | null; gps_lng: number | null; sha256: string | null; evidence_class: string | null; embedding: string | null; metadata: Record<string, unknown>; created_at: string; }
export interface Course { id: UUID; title: string; iicrc_category: string | null; ce_credits: number | null; embedding: string | null; metadata: Json; created_at: string; }
export interface Enrollment { id: UUID; course_id: UUID; person_party_id: UUID; org_id: UUID | null; status: string; enrolled_at: string; completed_at: string | null; }
export interface TrainingCredential { id: UUID; person_party_id: UUID; course_id: UUID; iicrc_credits: number | null; issued_at: string; expires_at: string | null; }
export interface EvidenceMatch { id: UUID; org_id: UUID; evidence_class: string | null; similarity: number; }
export interface Application { id: UUID; applicant_person_id: UUID | null; org_id: UUID | null; campaign_id: UUID | null; source_lead_id: UUID | null; status: string; submitted_at: string; }
export interface Opportunity { id: UUID; target_org_id: UUID | null; owner: string; stage: string; amount_cents: number | null; created_at: string; }

// RLS request context, derived from the caller's VERIFIED session (never from client input).
export interface RlsContext { orgId: UUID | null; personId: UUID | null; }

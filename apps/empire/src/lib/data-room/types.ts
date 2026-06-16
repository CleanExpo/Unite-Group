// Type contract for public.data_room_documents (UNI-1983).
// Mirrors the migration at supabase/migrations/20260518100000_data_room_documents.sql.
// Consumer code (UNI-1984..1989 generators + admin UI) imports from here.

/**
 * The recognised document classes that compile into an M&A data room.
 * Each kind has its own generator under src/lib/data-room/generators/.
 */
export type DataRoomKind =
  | 'cohort_metrics'      // UNI-1984: health_snapshots roll-up per business
  | 'pl_summary'          // UNI-1985: financial_records → MRR/ARR/burn/runway
  | 'vendor_contracts'    // UNI-1986: Stripe + Xero + contracts aggregate
  | 'ip_audit'            // UNI-1987: GitHub repos + registered marks
  | 'incident_timeline'   // UNI-1988: 24-mo incident history
  | 'pdf_export';         // UNI-1989: bundled output reference

export type DataRoomAuditStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'superseded';

export interface DataRoomDocument<TPayload = Record<string, unknown>> {
  id: string;
  kind: DataRoomKind;
  business_id: string | null;
  period_start: string | null;
  period_end: string;
  generated_at: string;
  payload: TPayload;
  audit_status: DataRoomAuditStatus;
  created_at: string;
  updated_at: string;
}

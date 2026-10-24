-- FOUNDER-GATED: PENDING SANDBOX VERIFICATION.
-- Erasure for one enquiry (UNI-2999): removes what the app keeps about a lead outside
-- crm_leads itself: its alert_delivery_log rows (by lead id, and by the keyed dedup_key
-- shared with later enquiries from the same person) and its crm_timeline_* agent_actions
-- rows, which carry the email, phone and IP of the lead.
-- It does not delete crm_leads; that stays the founder's existing manual step.
-- Rollback: revert code only; keep this additive function. Any removal requires a
-- reviewed forward migration so the migration ledger remains truthful.
-- agent_actions has no founder column, so timeline rows are matched by lead id (a uuid);
-- the caller (the founder-only route) proves the lead belongs to the founder first.

grant delete on table public.alert_delivery_log to service_role;

create or replace function public.erase_lead_alert_data(
  p_founder uuid, p_lead_id text, p_dedup_key text
) returns table (log_rows_deleted int, timeline_rows_deleted int)
language plpgsql
set search_path = public, pg_temp
as $$
declare
  deleted_log int;
  deleted_timeline int;
begin
  delete from public.alert_delivery_log as delivery
    where delivery.founder_id = p_founder and delivery.source_kind = 'new_lead'
      and (delivery.source_id = p_lead_id
        or (p_dedup_key is not null and delivery.dedup_key = p_dedup_key));
  get diagnostics deleted_log = row_count;

  delete from public.agent_actions as action
    where action.action_type like 'crm\_timeline\_%'
      and action.payload ->> 'subjectId' = p_lead_id;
  get diagnostics deleted_timeline = row_count;

  return query select deleted_log, deleted_timeline;
end $$;

revoke all on function public.erase_lead_alert_data(uuid, text, text) from public, anon, authenticated;
grant execute on function public.erase_lead_alert_data(uuid, text, text) to service_role;

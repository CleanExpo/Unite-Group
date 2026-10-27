-- FOUNDER-GATED: PENDING SANDBOX VERIFICATION.
-- UNI-2999 review round 3. Forward-only; the earlier alert migrations are not edited.
--
-- 1. Erasure for every enquiry from one address, in one founder-scoped call.
--    The route used to find related enquiries through PostgREST ilike, where '*' is also a
--    wildcard (a literal-star address matched other people) and a select stops at the API
--    row cap (enquiries past it kept their data while the route reported success). This
--    function matches with exact lower(email) equality inside the database, has no row cap,
--    and erases, tombstones and counts in one transaction.
-- 2. A deduped alert row now records which source covered it (covered_by_source_id).
--    now() is the transaction start, so a claim that started first but took the advisory
--    lock second gets an EARLIER created_at than the row that covered it; the health check
--    compared timestamps and reported that valid suppression as unalerted.
--
-- Rollback: revert code only; keep this additive column and these functions. Any removal
-- requires a reviewed forward migration so the migration ledger remains truthful.
-- erase_lead_alert_data (20261025000000) is left in place, unused by the app.

alter table public.alert_delivery_log add column if not exists covered_by_source_id text;

create or replace function public.claim_alert(
  p_founder uuid, p_kind text, p_source_id text, p_dedup_key text, p_window_minutes int
) returns table (channel text)
language plpgsql
set search_path = public, pg_temp
as $$
declare
  covering text;
begin
  if p_dedup_key is not null then
    perform pg_advisory_xact_lock(hashtextextended(p_dedup_key, 0));
    select delivery.source_id into covering
      from public.alert_delivery_log as delivery
      where delivery.founder_id = p_founder and delivery.source_kind = p_kind
        and delivery.source_id <> p_source_id and delivery.dedup_key = p_dedup_key
        and delivery.created_at >= now() - make_interval(mins => p_window_minutes)
        and (delivery.outcome = 'sent' or
          (delivery.outcome = 'pending' and delivery.created_at > now() - interval '15 seconds'))
      order by (delivery.outcome = 'sent') desc, delivery.created_at desc, delivery.source_id
      limit 1;
    if covering is not null then
      insert into public.alert_delivery_log
          (founder_id, source_kind, source_id, channel, outcome, dedup_key, covered_by_source_id)
        values (p_founder, p_kind, p_source_id, 'email', 'deduped', p_dedup_key, covering)
        on conflict on constraint alert_delivery_log_source_kind_source_id_channel_key do nothing;
      return;
    end if;
  end if;
  return query
    insert into public.alert_delivery_log as delivery (founder_id, source_kind, source_id, channel, outcome, dedup_key)
      values (p_founder, p_kind, p_source_id, 'email', 'pending', p_dedup_key)
      on conflict on constraint alert_delivery_log_source_kind_source_id_channel_key do nothing
      returning delivery.channel;
end $$;

revoke all on function public.claim_alert(uuid, text, text, text, int) from public, anon, authenticated;
grant execute on function public.claim_alert(uuid, text, text, text, int) to service_role;

grant delete on table public.alert_delivery_log to service_role;

-- p_dedup_keys: the keyed hashes (HMAC, computed by the app, which holds the secret) for this
-- address and every package label. Keys already stored on the matched leads' own log rows are
-- added here too, so rows keyed under an earlier secret or label are not left behind.
-- agent_actions has no founder column; timeline rows are matched by the ids of leads this
-- founder owns, which the function itself selects.
create or replace function public.erase_lead_alert_data_for_email(
  p_founder uuid, p_lead_id uuid, p_dedup_keys text[]
) returns table (leads_erased int, log_rows_deleted int, timeline_rows_deleted int)
language plpgsql
set search_path = public, pg_temp
as $$
declare
  target_email text;
  lead_ids text[];
  keys text[];
  erased_leads int;
  deleted_log int;
  deleted_timeline int;
begin
  if p_founder is null or p_lead_id is null then
    raise exception 'erase_lead_alert_data_for_email: founder and lead are required';
  end if;
  select lead.email into target_email
    from public.crm_leads as lead
    where lead.founder_id = p_founder and lead.id = p_lead_id;
  if target_email is null then
    return;
  end if;

  select coalesce(array_agg(lead.id::text), '{}') into lead_ids
    from public.crm_leads as lead
    where lead.founder_id = p_founder and lower(lead.email) = lower(target_email);

  select coalesce(array_agg(distinct key_value), '{}') into keys
    from (
      select unnest(coalesce(p_dedup_keys, '{}')) as key_value
      union
      select delivery.dedup_key from public.alert_delivery_log as delivery
        where delivery.founder_id = p_founder and delivery.source_kind = 'new_lead'
          and delivery.source_id = any(lead_ids) and delivery.dedup_key is not null
    ) as candidate
    where key_value is not null;

  delete from public.alert_delivery_log as delivery
    where delivery.founder_id = p_founder and delivery.source_kind = 'new_lead'
      and (delivery.source_id = any(lead_ids) or delivery.dedup_key = any(keys));
  get diagnostics deleted_log = row_count;

  delete from public.agent_actions as action
    where action.action_type like 'crm\_timeline\_%'
      and action.payload ->> 'subjectId' = any(lead_ids);
  get diagnostics deleted_timeline = row_count;

  -- Tombstone (no personal data): tells the alert health check these enquiries were erased
  -- on purpose rather than never alerted.
  update public.crm_leads as lead
    set additional_data = coalesce(lead.additional_data, '{}'::jsonb) || jsonb_build_object(
      'alert_erased_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
    where lead.founder_id = p_founder and lead.id::text = any(lead_ids);
  get diagnostics erased_leads = row_count;

  return query select erased_leads, deleted_log, deleted_timeline;
end $$;

revoke all on function public.erase_lead_alert_data_for_email(uuid, uuid, text[]) from public, anon, authenticated;
grant execute on function public.erase_lead_alert_data_for_email(uuid, uuid, text[]) to service_role;

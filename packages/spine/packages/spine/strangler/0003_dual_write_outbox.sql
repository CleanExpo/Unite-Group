-- Strangler DUAL-WRITE OUTBOX — the per-business cutover machinery on top of the resolver (0001/0002).
-- Rehearsed on CLONED / non-prod data ONLY. Run as a BYPASSRLS / service role (writes FORCE-RLS core.*).
--
-- Model: the legacy app keeps mutating during the cutover window. Each mutation is appended to
-- migrate.outbox (transactional outbox — enqueue NEVER touches core.*). A relay drains the outbox into
-- the spine via the resolver with EXACTLY-ONCE EFFECT:
--   * outbox_receipt(event_id PK) is the durable commit point (an event applies at most once, even
--     across a crash between apply-commit and status-update),
--   * resolve_or_update is idempotent: an already-resolved key is reconciled in place, never re-minted,
--   * `for update skip locked` + a per-entity ordering guard serialize same-key events across relayers,
--   * poison events dead-letter (outbox_dead) so the stream never wedges; the parity gate (0004) stays
--     RED while any pending/dead event remains.
-- Applied + tested GREEN on the Unite-Group Test sandbox (strangler/0003_dual_write_outbox.test.sql),
-- then hardened against the adversarial review (10 confirmed findings folded in).
-- Reversibility: this migration `create or replace`s migrate.resolve_one in place, so reverting requires
-- RE-APPLYING 0001_resolver.sql (+0002) to restore the original body — dropping objects alone will NOT
-- restore it (Postgres keeps no function-version history). To tear the harness down fully:
--   drop the migrate.outbox* tables + migrate.shadow_diff + the added functions/view, then re-run
--   0001/0002 to revert resolve_one; or `drop schema migrate cascade` and re-apply 0001..0004.

create schema if not exists migrate;

-- ── Outbox: append-only event log (total order = delivery order) ──────────────
create table if not exists migrate.outbox (
  event_id      bigint generated always as identity primary key,
  source_system text not null,
  source_pk     text not null,
  op            text not null check (op in ('upsert','delete')),
  payload       jsonb not null default '{}'::jsonb,                -- legacy row image at mutation time
  dedup_key     text,                                             -- producer dedup; NULL = none
  status        text not null default 'pending' check (status in ('pending','done','dead')),
  attempts      int  not null default 0,
  max_attempts  int  not null default 5,
  locked_by     text,
  locked_at     timestamptz,
  enqueued_at   timestamptz not null default now(),
  processed_at  timestamptz,
  last_error    text,
  unique (source_system, dedup_key)                               -- producer exactly-once guard
);
create index if not exists outbox_claimable_idx on migrate.outbox (event_id) where status = 'pending';
create index if not exists outbox_key_idx       on migrate.outbox (source_system, source_pk, event_id);
create index if not exists outbox_dead_idx      on migrate.outbox (status) where status = 'dead';

-- AUTHORITATIVE exactly-once ledger: PK = each event applied at most once, even across crash re-claims.
create table if not exists migrate.outbox_receipt (
  event_id   bigint primary key references migrate.outbox(event_id) on delete cascade,
  resolution text not null,
  party_id   uuid,
  applied_at timestamptz not null default now()
);

-- Poison quarantine: a bad event is parked here; the stream keeps draining.
create table if not exists migrate.outbox_dead (
  event_id      bigint primary key,
  source_system text not null,
  source_pk     text not null,
  op            text not null,
  payload       jsonb not null,
  attempts      int  not null,
  died_at       timestamptz not null default now(),
  error         text not null
);

-- The 7 pristine seed parties legitimately have NO source_record; exclude them from orphan detection.
create or replace view migrate.seed_party_ids as
select party_id from (values
  ('0a000000-0000-0000-0000-000000000001'::uuid),   -- Alpha Restoration (org)
  ('0b000000-0000-0000-0000-000000000001'::uuid),   -- Bravo Restoration (org)
  ('00000000-0000-0000-0000-0000000000ee'::uuid),   -- Unite-Group (operator org)
  ('0a000000-0000-0000-0000-0000000000a1'::uuid),   -- Alice Alpha
  ('0b000000-0000-0000-0000-0000000000b1'::uuid),   -- Bob Bravo
  ('00000000-0000-0000-0000-0000000000ff'::uuid),   -- Phill Operator
  ('0c000000-0000-0000-0000-000000000001'::uuid)    -- Homeowner Helen
) as s(party_id);

-- ── Producer + staging helpers ───────────────────────────────────────────────
-- enqueue: the only producer entry point. Pure append; at-least-once collapses on dedup_key.
create or replace function migrate.enqueue(
  p_system text, p_pk text, p_op text,
  p_payload jsonb default '{}'::jsonb, p_dedup text default null)
returns bigint language plpgsql as $$
declare v_id bigint;
begin
  if p_op not in ('upsert','delete') then
    raise exception 'migrate.enqueue: invalid op %', p_op;
  end if;
  if p_dedup is null then
    insert into migrate.outbox(source_system, source_pk, op, payload, dedup_key)
      values (p_system, p_pk, p_op, coalesce(p_payload, '{}'::jsonb), null)
      returning event_id into v_id;
  else
    insert into migrate.outbox(source_system, source_pk, op, payload, dedup_key)
      values (p_system, p_pk, p_op, coalesce(p_payload, '{}'::jsonb), p_dedup)
      on conflict (source_system, dedup_key)
        do update set enqueued_at = migrate.outbox.enqueued_at   -- no-op self-assign → return existing id
      returning event_id into v_id;
  end if;
  return v_id;
end $$;

-- Project a legacy row image (payload) into staging; never clobbers resolution/resolved_party_id.
create or replace function migrate._upsert_staging(p_system text, p_pk text, p_payload jsonb)
returns void language plpgsql as $$
begin
  insert into migrate.source_party(source_system, source_pk, kind, abn, email, display_name, raw, is_test)
  values (
    p_system, p_pk,
    coalesce(p_payload->>'kind', 'person'),                    -- 'bogus' etc. trips the kind CHECK → dead-letter
    nullif(p_payload->>'abn', ''),
    nullif(p_payload->>'email', ''),
    coalesce(nullif(p_payload->>'display_name', ''), '(unknown)'),
    coalesce(p_payload, '{}'::jsonb),
    coalesce((p_payload->>'is_test')::boolean, false)
  )
  on conflict (source_system, source_pk) do update set
    kind = excluded.kind, abn = excluded.abn, email = excluded.email,
    display_name = excluded.display_name, raw = excluded.raw, is_test = excluded.is_test;
end $$;

-- Chase the golden-record chain to the live survivor.
create or replace function migrate._golden(p_party uuid)
returns uuid language plpgsql stable as $$
declare v_cur uuid := p_party; v_next uuid; v_guard int := 0;
begin
  if p_party is null then return null; end if;
  loop
    select golden_party_id into v_next from core.party where party_id = v_cur;
    if v_next is null then return v_cur; end if;
    v_cur := v_next; v_guard := v_guard + 1;
    if v_guard > 64 then raise exception 'migrate._golden: cycle at %', p_party; end if;
  end loop;
end $$;

-- ── PATCH migrate.resolve_one (review R1): golden-aware lookups + advisory lock + lineage short-circuit ──
-- Lookups only ever target LIVE golden records (golden_party_id is null) so a post-merge tombstone can
-- never be re-selected. Advisory lock serializes concurrent resolves of the same key. The lineage
-- short-circuit makes even a direct re-run idempotent (defense in depth; the relay goes via
-- resolve_or_update). Otherwise identical to 0001/0002.
create or replace function migrate.resolve_one(p_system text, p_pk text)
returns text language plpgsql as $$
declare r migrate.source_party; v_party uuid; v_email text; v_is_role boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended(coalesce(p_system,'')||'/'||coalesce(p_pk,''), 0));
  select * into r from migrate.source_party where source_system=p_system and source_pk=p_pk;
  if not found then return 'not_found'; end if;
  if r.is_test then
    update migrate.source_party set resolution='skipped_test' where source_system=p_system and source_pk=p_pk;
    return 'skipped_test';
  end if;

  select sr.party_id into v_party from core.source_record sr
    where sr.source_system=p_system and sr.source_pk=p_pk limit 1;
  if v_party is not null then
    v_party := migrate._golden(v_party);
    update migrate.source_party set resolved_party_id=v_party where source_system=p_system and source_pk=p_pk;
    return 'unchanged';
  end if;

  v_email := migrate.normalize_email(r.email);
  v_is_role := v_email is not null and exists (select 1 from migrate.role_email re where re.email = v_email);

  if r.kind='organization' and r.abn is not null then
    select o.party_id into v_party
      from core.organization o
      join core.party pt on pt.party_id=o.party_id and pt.golden_party_id is null
      where o.abn = r.abn limit 1;
    if v_party is not null then perform migrate._record(p_system,p_pk,v_party,'abn_merge'); return 'abn_merge'; end if;
  end if;

  if v_email is not null and not v_is_role then
    select party_id into v_party from (
      select pi.party_id from core.party_identifier pi
        join core.party pt on pt.party_id=pi.party_id and pt.golden_party_id is null
        where pi.scheme='email' and lower(pi.value)=v_email
      union
      select p.party_id from core.person p
        join core.party pt on pt.party_id=p.party_id and pt.golden_party_id is null
        where lower(p.email)=v_email
    ) q limit 1;
    if v_party is not null then perform migrate._record(p_system,p_pk,v_party,'email_merge'); return 'email_merge'; end if;
  end if;

  if v_is_role and exists (
    select 1 from migrate.source_party sp2
    where migrate.normalize_email(sp2.email)=v_email
      and not (sp2.source_system=p_system and sp2.source_pk=p_pk)
      and not sp2.is_test and sp2.resolved_party_id is not null
  ) then
    v_party := migrate._create_party(r);
    insert into core.identity_audit(action, party_id, confidence, reason)
      values ('review_pending', v_party, 0.40, 'shared role email '||v_email||' — under-merged, human adjudication required');
    perform migrate._record(p_system,p_pk,v_party,'review');
    return 'review';
  end if;

  v_party := migrate._create_party(r);
  perform migrate._record(p_system,p_pk,v_party,'new');
  return 'new';
end $$;

-- ── Controlled, reversible merge: tombstone loser → winner; repoint lineage/identifiers; audit. ──
-- Driven ONLY by a deterministic/dirty hard-key match, never fuzzy (preserves the under-merge bias).
-- Nulls the loser's denormalized abn/email so the unique indexes free up for later stamps; history is
-- preserved via golden chain + source_record.source_payload + identity_audit. Reverse = clear
-- golden_party_id/merged_at and set is_active=true. (NOTE: module-table FK repointing — leadgen/field/
-- etc. that reference org_id — is part of per-module cutover, NOT this identity-level merge.)
create or replace function migrate._merge_into(p_loser uuid, p_winner uuid, p_reason text)
returns void language plpgsql as $$
begin
  if p_loser is null or p_winner is null or p_loser = p_winner then return; end if;
  update core.source_record set party_id = p_winner where party_id = p_loser;
  -- review #4/#5: move only NON hard-key identifiers the winner lacks; the loser's abn/email identifiers
  -- are DROPPED (a survivor must not advertise a dedup key that no longer denotes a distinct entity —
  -- promoting it would cause a future over-merge / corrupt ABN ownership). History survives via
  -- source_record.source_payload + the golden chain + identity_audit.
  update core.party_identifier pi set party_id = p_winner
    where pi.party_id = p_loser and pi.scheme not in ('abn','email')
      and not exists (select 1 from core.party_identifier w
                      where w.party_id=p_winner and w.scheme=pi.scheme and lower(w.value)=lower(pi.value));
  delete from core.party_identifier where party_id = p_loser;
  update core.organization set abn = null where party_id = p_loser;   -- free org_abn_uidx
  update core.person       set email = null where party_id = p_loser; -- free person_email_uidx
  update core.party set golden_party_id = p_winner, merged_at = now(), is_active = false, updated_at = now()
    where party_id = p_loser;
  update migrate.source_party set resolved_party_id = p_winner where resolved_party_id = p_loser;
  insert into core.identity_audit(action, party_id, other_party_id, confidence, decided_by, reason)
    values ('merge', p_winner, p_loser, 1.0, 'auto', p_reason);
end $$;

-- ── Reconcile an already-resolved key in place: tighten fields, promote-merge on a late hard key. ──
-- Tracks the latest legacy state (a cutover-window edit must not strand the parity gate): the newest
-- legacy email wins (old kept as a historical identifier), and a sole-source identity tracks the latest
-- legacy display_name (merge survivors keep the golden name). A late hard key matching exactly one OTHER
-- live golden party is proof of one entity → controlled merge; a CONFLICTING hard key is never auto-applied
-- (queues review — under-merge bias). Role emails are never stored.
create or replace function migrate._reconcile(r migrate.source_party, p_party uuid)
returns text language plpgsql as $$
declare
  v_party uuid := migrate._golden(p_party);
  v_email text := migrate.normalize_email(r.email);
  v_is_role boolean := v_email is not null and exists (select 1 from migrate.role_email re where re.email=v_email);
  v_other uuid; v_cur_abn text; v_cur_email text; v_result text := 'unchanged'; v_sources int;
  v_prev_res text := r.resolution;   -- the resolution BEFORE this reconcile (sticky merge provenance)
begin
  update core.source_record set party_id = v_party, source_payload = coalesce(r.raw,'{}'::jsonb)
    where source_system=r.source_system and source_pk=r.source_pk;

  if r.kind='organization' and r.abn is not null then
    select abn into v_cur_abn from core.organization where party_id=v_party;
    if v_cur_abn is not distinct from r.abn then
      null;                                              -- already holds this abn
    elsif v_cur_abn is not null then
      -- review #9: record already has a DIFFERENT confirmed abn → hard-key conflict → under-merge review.
      insert into core.identity_audit(action,party_id,confidence,reason)
        values ('review_pending', v_party, 0.30, 'conflicting abn '||r.abn||' vs existing '||v_cur_abn);
      v_result := 'review';
    else
      select o.party_id into v_other from core.organization o
        join core.party pt on pt.party_id=o.party_id and pt.golden_party_id is null
        where o.abn=r.abn and o.party_id<>v_party limit 1;
      if v_other is not null then
        perform migrate._merge_into(v_party, v_other, 'promoted_abn_merge '||r.abn);
        v_party := v_other; v_result := 'promoted_abn_merge';
      else
        update core.organization set abn=r.abn where party_id=v_party;
        insert into core.party_identifier(party_id,scheme,value) values (v_party,'abn',r.abn) on conflict do nothing;
        v_result := 'updated_abn';
      end if;
    end if;
  end if;

  if v_email is not null and not v_is_role then
    select p.email into v_cur_email from core.person p where p.party_id=v_party;
    if v_cur_email is not distinct from v_email then
      null;
    else
      select q.party_id into v_other from (
        select pi.party_id from core.party_identifier pi
          join core.party pt on pt.party_id=pi.party_id and pt.golden_party_id is null
          where pi.scheme='email' and lower(pi.value)=v_email and pi.party_id<>v_party
        union
        select p.party_id from core.person p
          join core.party pt on pt.party_id=p.party_id and pt.golden_party_id is null
          where lower(p.email)=v_email and p.party_id<>v_party
      ) q limit 1;
      if v_other is not null then
        perform migrate._merge_into(v_party, v_other, 'promoted_email_merge '||v_email);
        v_party := v_other;
        if v_result='unchanged' then v_result := 'promoted_email_merge'; end if;
      else
        insert into core.party_identifier(party_id,scheme,value) values (v_party,'email',v_email) on conflict do nothing;
        if r.kind='person' then update core.person set email=v_email where party_id=v_party; end if;
        if v_result='unchanged' then v_result := 'updated_email'; end if;
      end if;
    end if;
  end if;

  -- review #7/#8: a benign edit must NOT erase merge-survivor provenance the parity scan relies on.
  if v_result in ('unchanged','updated_email','updated_abn')
     and v_prev_res in ('abn_merge','email_merge','promoted_abn_merge','promoted_email_merge') then
    v_result := v_prev_res;
  end if;

  select count(*) into v_sources from core.source_record where party_id=v_party;
  if v_result not in ('promoted_abn_merge','promoted_email_merge','abn_merge','email_merge','review')
     and v_sources <= 1
     and not exists (select 1 from core.party w where w.golden_party_id=v_party) then
    update core.party set display_name=r.display_name, updated_at=now()
      where party_id=v_party and display_name is distinct from r.display_name;
  end if;

  update migrate.source_party set resolved_party_id=v_party, resolution=v_result
    where source_system=r.source_system and source_pk=r.source_pk;
  return v_result;
end $$;

-- ── Idempotent relay entry point: the ONLY path the relay calls. ──
create or replace function migrate.resolve_or_update(p_system text, p_pk text)
returns text language plpgsql as $$
declare r migrate.source_party; v_existing uuid; v_revive uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(coalesce(p_system,'')||'/'||coalesce(p_pk,''),0));
  select * into r from migrate.source_party where source_system=p_system and source_pk=p_pk;
  if not found then return 'not_found'; end if;
  if r.is_test then
    update migrate.source_party set resolution='skipped_test' where source_system=p_system and source_pk=p_pk;
    return 'skipped_test';
  end if;
  select sr.party_id into v_existing from core.source_record sr
    where sr.source_system=p_system and sr.source_pk=p_pk limit 1;
  if v_existing is not null then
    return migrate._reconcile(r, v_existing);   -- existing lineage → reconcile, never re-mint
  end if;
  -- review #1 resurrection: a previously-deleted key remembers its party → REVIVE it, do not re-mint
  -- (a keyless person deleted then recreated during the cutover window must keep a stable spine party_id).
  if r.resolution='deleted' and r.resolved_party_id is not null then
    v_revive := migrate._golden(r.resolved_party_id);
    if exists (select 1 from core.party where party_id=v_revive) then
      perform pg_advisory_xact_lock(hashtextextended('party:'||v_revive::text, 0));
      update core.party set is_active=true, updated_at=now() where party_id=v_revive;
      perform migrate._record(p_system, p_pk, v_revive, 'revived');   -- re-attach lineage
      return migrate._reconcile(r, v_revive);
    end if;
  end if;
  return migrate.resolve_one(p_system, p_pk);   -- first delivery → mint + atomic source_record
end $$;

-- ── Delete: drop THIS system's lineage; soft-deactivate the survivor only if no source remains. ──
create or replace function migrate._apply_delete(p_system text, p_pk text)
returns text language plpgsql as $$
declare v_party uuid; v_others int;
begin
  perform pg_advisory_xact_lock(hashtextextended(coalesce(p_system,'')||'/'||coalesce(p_pk,''),0));
  select party_id into v_party from core.source_record where source_system=p_system and source_pk=p_pk limit 1;
  if v_party is null then
    update migrate.source_party set resolution='deleted'
      where source_system=p_system and source_pk=p_pk;
    return 'delete_noop';                       -- idempotent re-delivery (keep any remembered party)
  end if;
  v_party := migrate._golden(v_party);
  perform pg_advisory_xact_lock(hashtextextended('party:'||v_party::text, 0));   -- review #3: serialize is_active flip
  delete from core.source_record where source_system=p_system and source_pk=p_pk;
  -- review #1: keep resolved_party_id so a later re-upsert revives this exact party (no re-mint / split).
  update migrate.source_party set resolution='deleted', resolved_party_id=v_party
    where source_system=p_system and source_pk=p_pk;
  select count(*) into v_others from core.source_record where party_id=v_party;
  if v_others=0 and not exists (select 1 from migrate.seed_party_ids s where s.party_id=v_party) then
    update core.party set is_active=false, updated_at=now() where party_id=v_party;  -- never row-delete
  end if;
  return 'deleted';
end $$;

-- ── The relay drain loop: claim → apply → receipt → done; poison → dead-letter. ──
-- Concurrency-safe: skip-locked claim + per-entity ordering guard serialize same-key events across
-- relayers; the receipt PK + resolve_or_update idempotency make any re-claim a no-op.
create or replace function migrate.relay_batch(
  p_relayer text, p_limit int default 100, p_system text default null)
returns table(resolution text, n bigint) language plpgsql as $$
declare
  rec        migrate.outbox;
  v_res      text;
  v_party    uuid;
  v_err      text;
  v_state    text;
  v_att      int;
  v_max      int;
  v_processed int := 0;
  v_tried    bigint[] := '{}';
  v_hist     jsonb := '{}'::jsonb;
begin
  loop
    exit when v_processed >= p_limit;
    select o.* into rec
    from migrate.outbox o
    where o.status='pending'
      and (p_system is null or o.source_system = p_system)
      and not (o.event_id = any(v_tried))
      and not exists (
        select 1 from migrate.outbox e
        where e.source_system=o.source_system and e.source_pk=o.source_pk
          and e.status='pending' and e.event_id < o.event_id)   -- per-entity in-order apply
    order by o.event_id
    for update skip locked
    limit 1;
    exit when not found;

    v_tried := v_tried || rec.event_id;

    begin
      if exists (select 1 from migrate.outbox_receipt rr where rr.event_id=rec.event_id) then
        update migrate.outbox set status='done', processed_at=now(), last_error=null where event_id=rec.event_id;
        v_res := 'redelivered';
      else
        update migrate.outbox set attempts=attempts+1, locked_by=p_relayer, locked_at=now()
          where event_id=rec.event_id;
        if rec.op='delete' then
          v_res := migrate._apply_delete(rec.source_system, rec.source_pk);
        else
          perform migrate._upsert_staging(rec.source_system, rec.source_pk, rec.payload);
          v_res := migrate.resolve_or_update(rec.source_system, rec.source_pk);
        end if;
        select resolved_party_id into v_party from migrate.source_party
          where source_system=rec.source_system and source_pk=rec.source_pk;
        insert into migrate.outbox_receipt(event_id, resolution, party_id)
          values (rec.event_id, v_res, v_party);              -- exactly-once commit point
        update migrate.outbox set status='done', processed_at=now(), last_error=null where event_id=rec.event_id;
      end if;
    exception when others then
      get stacked diagnostics v_state = returned_sqlstate;
      v_err := substr(sqlerrm, 1, 1000);
      if v_state in ('40001','40P01','55P03','40003') then
        -- review #2: transient concurrency fault — leave pending, do NOT count toward dead-letter;
        -- a later batch retries it (a valid event must never dead-letter for losing a lock race).
        update migrate.outbox set last_error=v_err, locked_by=null, locked_at=null where event_id=rec.event_id;
        v_res := 'transient';
      else
        -- deterministic error: the subtxn rolled back the in-block attempts bump; persist it durably.
        select attempts, max_attempts into v_att, v_max from migrate.outbox where event_id=rec.event_id;
        v_att := coalesce(v_att,0) + 1;
        if v_att >= coalesce(v_max,5) then
          insert into migrate.outbox_dead(event_id, source_system, source_pk, op, payload, attempts, error)
            values (rec.event_id, rec.source_system, rec.source_pk, rec.op, rec.payload, v_att, v_err)
            on conflict (event_id) do nothing;
          update migrate.outbox set status='dead', attempts=v_att, last_error=v_err, locked_by=null, locked_at=null
            where event_id=rec.event_id;
          v_res := 'dead';
        else
          update migrate.outbox set attempts=v_att, last_error=v_err, locked_by=null, locked_at=null
            where event_id=rec.event_id;
          v_res := 'retry';
        end if;
      end if;
    end;

    v_hist := jsonb_set(v_hist, array[v_res], to_jsonb(coalesce((v_hist->>v_res)::bigint,0)+1));
    v_processed := v_processed + 1;
  end loop;

  return query select k, v::bigint from jsonb_each_text(v_hist) as t(k, v) order by k;
end $$;

-- Liveness: free rows locked by a relayer that died mid-flight; the retry no-ops via the receipt/gate.
create or replace function migrate.reap_stuck(p_age interval default interval '5 minutes')
returns bigint language plpgsql as $$
declare n bigint;
begin
  update migrate.outbox set locked_by=null, locked_at=null
    where status='pending' and locked_at is not null and locked_at < now() - p_age;
  get diagnostics n = row_count;
  return n;
end $$;

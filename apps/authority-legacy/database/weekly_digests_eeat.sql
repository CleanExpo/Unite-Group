-- SYN-510: Add E.E.A.T. tracking columns to weekly_digests
alter table weekly_digests
  add column if not exists eeat_score int,
  add column if not exists eeat_delta int,
  add column if not exists eeat_top_mover text,
  add column if not exists eeat_action text;

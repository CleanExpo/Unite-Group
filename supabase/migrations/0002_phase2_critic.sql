-- Phase 2: critic review + approval gate
alter table specs add column if not exists critique text;
alter table specs add column if not exists critic_model text;
alter table specs add column if not exists approved_at timestamptz;

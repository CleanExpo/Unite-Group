-- Lock every table to the service role (the app is server-side only; no
-- anon access). RLS with no policies denies the anon/authenticated roles;
-- the service role bypasses RLS. Captured so a fresh database matches the
-- live project exactly.

alter table visions enable row level security;
alter table specs enable row level security;
alter table findings enable row level security;
alter table board_members enable row level security;
alter table board_responses enable row level security;
-- knowledge_docs RLS is enabled in 0003_phase3_knowledge.sql

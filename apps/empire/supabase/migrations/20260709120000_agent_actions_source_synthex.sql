-- Flywheel C2 (founder-gated): allow Synthex witness events into agent_actions.
-- Also repairs a latent defect found during this work: the DR-NRPG integration
-- (apps/empire/src/app/api/integrations/dr-nrpg/crm/leads/route.ts) inserts
-- source='dr_contractor_portal', which the live constraint rejects — verified
-- against prod 2026-07-09 (agent_actions_source_check lists only the original
-- six sources), so those inserts have been failing silently.
-- Additive only: widens the CHECK, touches no data.

ALTER TABLE public.agent_actions
  DROP CONSTRAINT IF EXISTS agent_actions_source_check;

ALTER TABLE public.agent_actions
  ADD CONSTRAINT agent_actions_source_check
  CHECK (source IN (
    'margot', 'board', 'pm', 'orchestrator', 'hermes', 'system',
    'synthex', 'dr_contractor_portal'
  ));

-- ContextBot platform — async provisioning queue.
--
-- Adds the columns the "Onboard Client" CRM UI needs to enqueue a new
-- bot for the swarm to provision (drive BotFather via Chrome MCP,
-- capture token, send t.me/<bot> link to the client by email).
--
-- The actual BotFather flow runs in the Pi-CEO swarm worker
-- (swarm/inbox/provisioner.py) because BotFather is conversational and
-- can't be driven from a stateless Next.js route handler.

ALTER TABLE public.context_bots
    ADD COLUMN IF NOT EXISTS provision_status TEXT NOT NULL DEFAULT 'live'
        CHECK (provision_status IN ('pending','provisioning','live','failed')),
    ADD COLUMN IF NOT EXISTS provision_error  TEXT,
    ADD COLUMN IF NOT EXISTS client_email     TEXT,
    ADD COLUMN IF NOT EXISTS client_display_name TEXT,
    ADD COLUMN IF NOT EXISTS provisioned_at   TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS context_bots_pending_idx
    ON public.context_bots(provision_status)
    WHERE provision_status = 'pending';

-- Existing rows are already minted; mark them 'live'.
UPDATE public.context_bots
   SET provision_status = 'live',
       provisioned_at   = COALESCE(provisioned_at, created_at)
 WHERE provision_status IS NULL OR provision_status NOT IN ('pending','provisioning','live','failed');

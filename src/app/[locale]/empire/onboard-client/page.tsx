// ContextBot platform — Onboard Client UI
//
// Admin-only form that enqueues a new ContextBot for the swarm to provision.
// Posts to /api/admin/bots/provision which inserts a pending row into
// public.context_bots. The Pi-CEO swarm worker (swarm/inbox/provisioner.py)
// picks up pending rows, drives BotFather via Chrome MCP, captures the
// token, and emails the t.me/<bot> link to client_email.
//
// Visual language: Gun Metal #1a1a1a + Candy Red accent (per [[design-preferences]]).
"use client";

import { useEffect, useState } from "react";
import {
  SpotlightCard,
  SpotlightCardHeader,
  SpotlightCardTitle,
  SpotlightCardContent,
} from "@/components/ui/spotlight-card";
import { PortfolioTile, type PortfolioStatus } from "@/components/empire/PortfolioTile";

type ProvisionInput = {
  kind: "portfolio" | "client" | "partner";
  brand: "pi-ceo" | "unite-group";
  context_id: string;
  context_label: string;
  client_email: string;
  client_display_name: string;
  linear_team_key: string;
  wiki_section: string;
};

type Bot = {
  id: string;
  bot_username: string;
  context_id: string;
  context_label: string;
  kind: string;
  brand: string;
  client_email: string | null;
  provision_status: "pending" | "provisioning" | "live" | "failed";
  provision_error: string | null;
  provisioned_at: string | null;
  created_at: string;
};

const DEFAULT_INPUT: ProvisionInput = {
  kind: "client",
  brand: "unite-group",
  context_id: "",
  context_label: "",
  client_email: "",
  client_display_name: "",
  linear_team_key: "UNI",
  wiki_section: "",
};

export default function OnboardClientPage() {
  const [input, setInput] = useState<ProvisionInput>(DEFAULT_INPUT);
  const [bots, setBots] = useState<Bot[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // UNI-1947: the Refresh button was a silent-fail surface — errors were
  // swallowed into `setBots([])`, leaving the operator unable to distinguish
  // "no bots in registry yet" from "API returned 500" or "auth expired".
  // botsLoading + botsError now back the registry section with explicit state.
  const [botsLoading, setBotsLoading] = useState(false);
  const [botsError, setBotsError] = useState<string | null>(null);

  async function loadBots() {
    setBotsLoading(true);
    setBotsError(null);
    try {
      const r = await fetch("/api/admin/bots/provision");
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        setBots([]);
        setBotsError(body.error || `HTTP ${r.status}`);
        return;
      }
      const j = await r.json();
      setBots(j.bots ?? []);
    } catch (err) {
      setBots([]);
      setBotsError(err instanceof Error ? err.message : "Network error");
    } finally {
      setBotsLoading(false);
    }
  }

  useEffect(() => { loadBots(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      // Auto-fill wiki_section if blank
      const wiki = input.wiki_section
        || (input.kind === "client" ? `clients/${input.context_id}.md` : `${input.context_id}.md`);
      const r = await fetch("/api/admin/bots/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, wiki_section: wiki }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || `HTTP ${r.status}`);
      } else {
        setSuccess(
          `Enqueued ${j.bot_username_hint} (${j.context_id}). ${j.next}`
        );
        setInput({ ...DEFAULT_INPUT, kind: input.kind, brand: input.brand });
        await loadBots();
      }
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setSubmitting(false);
    }
  }

  function update<K extends keyof ProvisionInput>(key: K, value: ProvisionInput[K]) {
    setInput(prev => ({ ...prev, [key]: value }));
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Onboard Client</h1>
          <p className="text-gray-400 max-w-2xl">
            Spin up a Telegram ContextBot for a portfolio context, an external
            client, or a partner. The Pi-CEO swarm provisions the bot via
            BotFather and emails the <code>t.me/&lt;bot&gt;</code> link to the
            client. Every message they send becomes a tracked item within
            minutes.
          </p>
        </header>

        <SpotlightCard
          spotlightColor="rgba(179, 0, 0, 0.30)"
          borderRadius={12}
          style={{ maxWidth: 640, margin: "0 auto 2rem" }}
        >
          <SpotlightCardHeader>
            <SpotlightCardTitle>New ContextBot</SpotlightCardTitle>
          </SpotlightCardHeader>
          <SpotlightCardContent>
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Kind">
              <select
                value={input.kind}
                onChange={e => update("kind", e.target.value as ProvisionInput["kind"])}
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded px-3 py-2"
              >
                <option value="client">Client (external — emails t.me link)</option>
                <option value="portfolio">Portfolio (internal Pi-CEO project)</option>
                <option value="partner">Partner (vendor / sub-contractor)</option>
              </select>
            </Field>

            <Field label="Brand">
              <select
                value={input.brand}
                onChange={e => update("brand", e.target.value as ProvisionInput["brand"])}
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded px-3 py-2"
              >
                <option value="unite-group">Unite-Group (client-facing)</option>
                <option value="pi-ceo">Pi-CEO (internal-facing)</option>
              </select>
            </Field>

            <Field label="Context ID (slug)">
              <input
                type="text"
                required
                pattern="[a-z0-9][a-z0-9-]{1,30}"
                placeholder="ccw, ivi, restoreassist"
                value={input.context_id}
                onChange={e => update("context_id", e.target.value.toLowerCase())}
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded px-3 py-2"
              />
            </Field>

            <Field label="Display label">
              <input
                type="text"
                required
                placeholder="CCW, Ivi, RestoreAssist"
                value={input.context_label}
                onChange={e => update("context_label", e.target.value)}
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded px-3 py-2"
              />
            </Field>

            {input.kind === "client" && (
              <>
                <Field label="Client email (recipient of t.me link)">
                  <input
                    type="email"
                    required
                    placeholder="toby@ccw.com.au"
                    value={input.client_email}
                    onChange={e => update("client_email", e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-gray-700 rounded px-3 py-2"
                  />
                </Field>
                <Field label="Client display name">
                  <input
                    type="text"
                    placeholder="Toby Carstairs"
                    value={input.client_display_name}
                    onChange={e => update("client_display_name", e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-gray-700 rounded px-3 py-2"
                  />
                </Field>
              </>
            )}

            <Field label="Linear team key (optional)">
              <input
                type="text"
                placeholder="UNI, RA, NRPG"
                value={input.linear_team_key}
                onChange={e => update("linear_team_key", e.target.value.toUpperCase())}
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded px-3 py-2"
              />
            </Field>

            <Field label="Wiki section (optional)">
              <input
                type="text"
                placeholder="auto: clients/<context_id>.md"
                value={input.wiki_section}
                onChange={e => update("wiki_section", e.target.value)}
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded px-3 py-2"
              />
            </Field>

            <div className="md:col-span-2 flex items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="bg-[#dc143c] hover:bg-[#b00f30] disabled:opacity-50 text-white font-semibold px-6 py-2 rounded transition"
              >
                {submitting ? "Enqueuing…" : "Enqueue Bot"}
              </button>
              {error && <span className="text-red-400 text-sm">{error}</span>}
              {success && <span className="text-green-400 text-sm">{success}</span>}
            </div>
          </form>
          </SpotlightCardContent>
        </SpotlightCard>

        <section className="bg-[#222] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Registry — last 50</h2>
            <button
              onClick={loadBots}
              disabled={botsLoading}
              className="text-sm text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-wait"
            >
              {botsLoading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
          {botsError && (
            <p
              role="alert"
              className="mb-3 text-sm text-red-400 font-mono"
              data-bots-error="true"
            >
              Failed to load registry: {botsError}. Try again or check server logs.
            </p>
          )}
          {bots.length === 0 ? (
            <p className="text-gray-500">
              {botsLoading
                ? "Loading registry…"
                : botsError
                  ? "Registry unavailable — see error above."
                  : "No bots in registry yet."}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bots.map(b => (
                <PortfolioTile
                  key={b.id}
                  title={b.bot_username ? `@${b.bot_username}` : b.context_label}
                  description={b.client_email ?? b.context_id}
                  status={mapStatus(b.provision_status)}
                  brandSlug={b.brand}
                >
                  <div className="text-xs text-gray-400 space-y-1">
                    <div>{b.context_label} <span className="text-gray-500">({b.context_id})</span></div>
                    <div>{b.kind} / {b.brand}</div>
                    <div className="text-gray-500">
                      {b.provisioned_at ? new Date(b.provisioned_at).toLocaleString("en-AU") : "—"}
                    </div>
                    {b.provision_error && (
                      <div className="text-red-400">{b.provision_error}</div>
                    )}
                  </div>
                </PortfolioTile>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm text-gray-400 mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function mapStatus(s: Bot["provision_status"]): PortfolioStatus {
  switch (s) {
    case "live": return "operational";
    case "provisioning": return "building";
    case "pending": return "degraded";
    case "failed": return "down";
  }
}

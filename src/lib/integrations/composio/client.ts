// src/lib/integrations/composio/client.ts
//
// Raw fetch wrapper for the Composio REST API. No SDK — Composio's surface
// is small enough that the SDK adds churn we don't need.
//
// API contract reference: https://backend.composio.dev/api/v1/connectedAccounts
// Auth: X-API-KEY header (NOT Bearer — Composio differs from Vercel/Linear here).

const KEY = process.env.COMPOSIO_API_KEY ?? "";
const BASE = "https://backend.composio.dev/api/v1";

if (!KEY) console.warn("[composio] COMPOSIO_API_KEY not set");

export interface ComposioConnection {
  id: string;
  appName: string;
  status: string;
  member?: { email?: string };
  lastUsedAt?: string;
}

interface ConnectedAccountsPage {
  items: ComposioConnection[];
  // Composio uses cursor pagination; field names vary by API version, so we
  // probe both common shapes and surface whichever exists.
  nextCursor?: string;
  next_cursor?: string;
  cursor?: string;
}

async function call<T>(path: string): Promise<T> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, { headers: { "X-API-KEY": KEY } });
  if (!res.ok) {
    throw new Error(`Composio API ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

/**
 * List all Composio connected accounts across all pages.
 *
 * Composio's connectedAccounts endpoint returns 100/page by default and
 * exposes a cursor for the next page. We follow the cursor until exhausted
 * rather than accepting page-1-only — the plan-2 mesh assumes a complete
 * mirror of the connection state on every hourly tick.
 */
export async function listConnections(): Promise<ComposioConnection[]> {
  const all: ComposioConnection[] = [];
  let cursor: string | undefined;

  // Hard cap to defend against a runaway cursor loop (e.g. server returning
  // the same cursor it received). 100 pages × 100 items = 10k connections,
  // well above the size of the Unite-Group corpus.
  for (let page = 0; page < 100; page++) {
    const qs = new URLSearchParams({ pageSize: "100" });
    if (cursor) qs.set("cursor", cursor);
    const data = await call<ConnectedAccountsPage>(`/connectedAccounts?${qs.toString()}`);

    if (Array.isArray(data.items)) all.push(...data.items);

    const next = data.nextCursor ?? data.next_cursor ?? data.cursor;
    if (!next || next === cursor) break;
    cursor = next;
  }

  return all;
}

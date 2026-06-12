// src/lib/integrations/digitalocean/client.ts
const TOKEN = process.env.DIGITALOCEAN_INTEGRATION_TOKEN ?? "";
if (!TOKEN) console.warn("[digitalocean] DIGITALOCEAN_INTEGRATION_TOKEN not set");

const BASE = "https://api.digitalocean.com/v2";

interface DOLinks {
  pages?: {
    next?: string;
    last?: string;
  };
}

async function call<T>(path: string): Promise<T> {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`DO ${path} ${res.status}`);
  return (await res.json()) as T;
}

/**
 * Walks DO's `links.pages.next` cursor and concatenates a single key off each page.
 * DO returns the next URL as a fully-qualified link, so we pass it through `call`
 * unmodified once the first page has been fetched.
 */
async function paginate<T, K extends string>(
  startPath: string,
  key: K,
): Promise<T[]> {
  const out: T[] = [];
  let next: string | undefined = startPath;
  while (next) {
    const page = (await call<Record<K, T[]> & { links?: DOLinks }>(next)) as Record<K, T[]> & {
      links?: DOLinks;
    };
    const items = page[key] ?? [];
    out.push(...items);
    next = page.links?.pages?.next;
  }
  return out;
}

export interface DOApp {
  id: string;
  spec: { name: string; region?: string };
  live_url?: string;
  active_deployment?: { id: string; phase: string; updated_at: string };
  last_deployment_active_at?: string;
  project_name?: string;
}

export interface DODroplet {
  id: number;
  name: string;
  region: { slug: string };
  size_slug: string;
  status: string;
  networks: { v4: Array<{ ip_address: string; type: string }> };
  created_at: string;
}

export interface DODatabase {
  id: string;
  name: string;
  engine: string;
  version: string;
  status: string;
  region: string;
}

export async function listApps(): Promise<DOApp[]> {
  return paginate<DOApp, "apps">("/apps?per_page=200", "apps");
}

export async function listDroplets(): Promise<DODroplet[]> {
  return paginate<DODroplet, "droplets">("/droplets?per_page=200", "droplets");
}

export async function listDatabases(): Promise<DODatabase[]> {
  return paginate<DODatabase, "databases">("/databases?per_page=200", "databases");
}

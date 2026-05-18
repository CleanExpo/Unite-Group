// scripts/rotate-admin-jwt.ts
//
// Slice 3 of 3 in Security Sweep plan Task 15. Mints a fresh admin JWT every
// 24h, pushes it to Vercel + (optionally) Railway env, so callers reading
// PI_CEO_API_KEY always get a non-expired JWT. The dual-auth bridge in
// `@/lib/auth/check-admin-token` accepts both the JWT path and the legacy
// static key, so during the transition any caller still issuing the OLD
// value still works — but the rotation cycle ensures that within 24h every
// caller is on a fresh JWT.
//
// Runs from .github/workflows/rotate-admin-jwt.yml on the daily cron, and
// can be invoked locally with --dry-run to preview without mutating env.
//
// Required env (at run time):
//   ADMIN_JWT_SECRET     signing secret used by mintAdminJwt
//   VERCEL_TOKEN         api token with project:env write scope
//   VERCEL_PROJECT_ID    e.g. prj_IfUuJNLjXTE8VXqEGwLAleIGhiA0
//   VERCEL_TEAM_ID       e.g. team_KMZACI5rIltoCRhAtGCXlxUf
//
// Optional Railway push (skipped if not all three set):
//   RAILWAY_TOKEN
//   RAILWAY_PROJECT_ID
//   RAILWAY_ENV_ID
//   RAILWAY_SERVICE_ID

import { mintAdminJwt } from '../src/lib/auth/admin-jwt';

const VERCEL_API = 'https://api.vercel.com';
const RAILWAY_API = 'https://backboard.railway.com/graphql/v2';
const ENV_VAR_NAME = 'PI_CEO_API_KEY';
const JWT_SCOPE = 'empire:full';
const JWT_TTL_SECONDS = 24 * 60 * 60; // 24h, matches the cron cadence

interface VercelEnvEntry {
  id: string;
  key: string;
  target: string[];
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} not set`);
  return v;
}

/**
 * Upsert PI_CEO_API_KEY on the Vercel project's `production` target. Prefer
 * PATCH on an existing entry over delete-then-create to avoid the gap where
 * the var is missing in prod.
 */
export async function rotateVercel(jwt: string, dryRun: boolean): Promise<void> {
  const token = requireEnv('VERCEL_TOKEN');
  const projectId = requireEnv('VERCEL_PROJECT_ID');
  const teamId = requireEnv('VERCEL_TEAM_ID');
  const qs = `?teamId=${encodeURIComponent(teamId)}`;

  const listRes = await fetch(
    `${VERCEL_API}/v9/projects/${projectId}/env${qs}`,
    { headers: { authorization: `Bearer ${token}` } },
  );
  if (!listRes.ok) {
    throw new Error(`Vercel env list HTTP ${listRes.status}: ${await listRes.text()}`);
  }
  const { envs } = (await listRes.json()) as { envs: VercelEnvEntry[] };
  const existing = envs.find(
    (e) => e.key === ENV_VAR_NAME && e.target.includes('production'),
  );

  if (dryRun) {
    console.log(
      existing
        ? `[dry-run] would PATCH Vercel env ${existing.id} (${ENV_VAR_NAME}, production)`
        : `[dry-run] would POST Vercel env ${ENV_VAR_NAME} (production)`,
    );
    return;
  }

  if (existing) {
    const patchRes = await fetch(
      `${VERCEL_API}/v10/projects/${projectId}/env/${existing.id}${qs}`,
      {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ value: jwt, type: 'encrypted' }),
      },
    );
    if (!patchRes.ok) {
      throw new Error(`Vercel PATCH HTTP ${patchRes.status}: ${await patchRes.text()}`);
    }
    console.log(`✓ Vercel: PATCHed ${ENV_VAR_NAME} on production`);
  } else {
    const postRes = await fetch(
      `${VERCEL_API}/v10/projects/${projectId}/env${qs}`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          key: ENV_VAR_NAME,
          value: jwt,
          type: 'encrypted',
          target: ['production'],
        }),
      },
    );
    if (!postRes.ok) {
      throw new Error(`Vercel POST HTTP ${postRes.status}: ${await postRes.text()}`);
    }
    console.log(`✓ Vercel: CREATED ${ENV_VAR_NAME} on production`);
  }
}

/**
 * Optional Railway push. No-op when any of RAILWAY_{TOKEN,PROJECT_ID,
 * ENV_ID,SERVICE_ID} is unset — Railway is a stretch consumer for now and
 * not every deploy needs it.
 */
export async function rotateRailway(jwt: string, dryRun: boolean): Promise<void> {
  const token = process.env.RAILWAY_TOKEN;
  const projectId = process.env.RAILWAY_PROJECT_ID;
  const envId = process.env.RAILWAY_ENV_ID;
  const serviceId = process.env.RAILWAY_SERVICE_ID;
  if (!token || !projectId || !envId || !serviceId) {
    console.log('→ Railway rotation skipped (RAILWAY_{TOKEN,PROJECT_ID,ENV_ID,SERVICE_ID} not all set)');
    return;
  }

  if (dryRun) {
    console.log(`[dry-run] would variableUpsert ${ENV_VAR_NAME} on Railway service ${serviceId}`);
    return;
  }

  const query = `mutation($input: VariableUpsertInput!) { variableUpsert(input: $input) }`;
  const res = await fetch(RAILWAY_API, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: {
        input: {
          projectId,
          environmentId: envId,
          serviceId,
          name: ENV_VAR_NAME,
          value: jwt,
        },
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Railway HTTP ${res.status}: ${await res.text()}`);
  }
  console.log(`✓ Railway: variableUpsert ${ENV_VAR_NAME} on service ${serviceId}`);
}

export async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const jwt = await mintAdminJwt(JWT_SCOPE, JWT_TTL_SECONDS);
  console.log(
    `Minted JWT — scope=${JWT_SCOPE} ttl=${JWT_TTL_SECONDS}s len=${jwt.length}${dryRun ? ' (dry-run)' : ''}`,
  );
  await rotateVercel(jwt, dryRun);
  await rotateRailway(jwt, dryRun);
  console.log(dryRun ? '✓ dry-run complete' : '✓ rotation complete');
}

// Only invoke main when executed as a script, NOT when imported by tests.
if (require.main === module) {
  main().catch((err) => {
    console.error('✗ rotation failed:', err);
    process.exit(1);
  });
}

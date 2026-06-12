// Single source-of-truth for the empire/developers dashboard data.
// Both the read endpoint (/api/empire/developers) and the server-component
// pages call this directly. Server-component → no fetch round-trip,
// no NEXTAUTH_URL dependency (cycle-4 lesson).
//
// Promise.allSettled means a single failing snapshot (one missing table,
// one RLS denial) degrades gracefully: that developer is dropped and the
// error is surfaced in _errors. The dashboard becomes a partial-state
// observer rather than a 500-or-nothing endpoint.

import {
  buildSnapshot,
  getDeveloperByEmail,
  listDevelopers,
} from './repository';
import type { DeveloperSnapshot } from './types';

export interface DevelopersState {
  developers: DeveloperSnapshot[];
  _errors?: string[];
}

export interface DeveloperState {
  developer: DeveloperSnapshot | null;
  _errors?: string[];
}

export async function getDevelopersState(): Promise<DevelopersState> {
  const errors: string[] = [];

  let profiles;
  try {
    profiles = await listDevelopers();
  } catch (err) {
    errors.push(`listDevelopers: ${String(err)}`);
    return { developers: [], _errors: errors };
  }

  const results = await Promise.allSettled(
    profiles.map((p) => buildSnapshot(p)),
  );

  const developers: DeveloperSnapshot[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      developers.push(r.value);
    } else {
      const who = profiles[i]?.primaryEmail ?? `#${i}`;
      errors.push(`buildSnapshot(${who}): ${String(r.reason)}`);
    }
  });

  return errors.length > 0 ? { developers, _errors: errors } : { developers };
}

export async function getDeveloperState(email: string): Promise<DeveloperState> {
  const errors: string[] = [];

  let profile;
  try {
    profile = await getDeveloperByEmail(email);
  } catch (err) {
    errors.push(`getDeveloperByEmail: ${String(err)}`);
    return { developer: null, _errors: errors };
  }
  if (!profile) return { developer: null };

  try {
    const developer = await buildSnapshot(profile);
    return { developer };
  } catch (err) {
    errors.push(`buildSnapshot(${profile.primaryEmail}): ${String(err)}`);
    return { developer: null, _errors: errors };
  }
}
